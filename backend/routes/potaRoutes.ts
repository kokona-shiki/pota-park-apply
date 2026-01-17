import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { sendOk, sendError, sendBizError } from '../utils/response.js';
import potaAuthService from '../services/potaAuthService.js';
import { getOne, getMany } from '../config/database.js';

const router = express.Router();

/**
 * 检查用户是否具有 POTA 导入权限
 */
const requirePotaImportPermission = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // 由于authenticateToken中间件已经设置了权限信息，直接检查即可
  if (!req.user || !req.user.hasPotaImportPermission) {
    return res
      .status(403)
      .json({ code: 'FORBIDDEN', message: '只有有权限的用户可以访问此功能', data: null });
  }
  next();
};

const potaLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const potaCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

/**
 * POTA 登录（使用账号密码 + Puppeteer）
 */
router.post('/api/pota/login', authenticateToken, requirePotaImportPermission, async (req, res) => {
  try {
    const parsed = potaLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'MISSING_PARAMS', '用户名和密码不能为空', null);
    }
    const { username, password } = parsed.data;

    // 使用 Puppeteer 登录
    const { tokens } = await potaAuthService.loginWithCredentials(username, password);

    // 解析 token 获取过期时间
    const tokenInfo = potaAuthService.decodeJWT(tokens.idToken);

    // 获取用户密码哈希
    const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user?.id]);
    if (!user) {
      return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
    }

    // 存储 token 到数据库（加密）
    await potaAuthService.storeTokens(
      req.user?.id,
      {
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokenInfo.expiresAt,
      },
      user.password_hash
    );

    // 清理 PKCE 参数（如果存在）
    await potaAuthService.clearPKCE(req.user?.id);

    return sendOk(res, {
      success: true,
      expiresAt: tokenInfo.expiresAt.toISOString(),
      hasRefreshToken: !!tokens.refreshToken,
    });
  } catch (error) {
    console.error('POTA 登录失败:', error);
    return sendError(res, error, { bizMessage: (error as Error)?.message || 'POTA 登录失败' });
  }
});

/**
 * 初始化 POTA 认证（生成授权 URL）- 保留用于 OAuth2 流程
 */
router.post(
  '/api/pota/init-auth',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const pkce = potaAuthService.generatePKCE();

      // 保存 PKCE 参数到数据库
      await potaAuthService.storePKCE(req.user?.id, pkce);

      const authUrl = potaAuthService.getAuthorizationUrl(pkce);

      return sendOk(res, {
        authUrl,
        state: pkce.state,
      });
    } catch (error) {
      console.error('初始化 POTA 认证失败:', error);
      return sendError(res, error, { bizMessage: '初始化 POTA 认证失败' });
    }
  }
);

/**
 * 处理授权码回调（交换 token）
 */
router.post(
  '/api/pota/callback',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const parsed = potaCallbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'MISSING_PARAMS', '缺少授权码或状态参数', null);
      }
      const { code, state } = parsed.data;

      // 从数据库获取保存的 PKCE 参数
      const pkceData = await potaAuthService.getPKCE(req.user?.id, state);

      if (!pkceData) {
        return sendBizError(res, 'INVALID_STATE', '无效的状态参数或已过期', null);
      }

      // 交换 token
      const tokens = await potaAuthService.exchangeCodeForToken(code, pkceData.code_verifier);

      // 解析 token 获取过期时间
      const tokenInfo = potaAuthService.decodeJWT(tokens.idToken);

      // 获取用户密码哈希
      const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user?.id]);
      if (!user) {
        return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
      }

      // 存储 token 到数据库（加密）
      await potaAuthService.storeTokens(
        req.user?.id,
        {
          idToken: tokens.idToken,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokenInfo.expiresAt,
        },
        user.password_hash
      );

      // 清理 PKCE 参数
      await potaAuthService.clearPKCE(req.user?.id);

      return sendOk(res, {
        success: true,
        expiresAt: tokenInfo.expiresAt.toISOString(),
        hasRefreshToken: !!tokens.refreshToken,
      });
    } catch (error) {
      console.error('POTA 认证失败:', error);
      return sendError(res, error, { bizMessage: 'POTA 认证失败' });
    }
  }
);

/**
 * 获取有效的 POTA token（自动处理刷新）
 */
router.get('/api/pota/token', authenticateToken, requirePotaImportPermission, async (req, res) => {
  try {
    // 获取用户密码哈希
    const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user?.id]);
    if (!user) {
      return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
    }

    const idToken = await potaAuthService.getValidToken(req.user?.id, user.password_hash);
    const tokenInfo = potaAuthService.decodeJWT(idToken);

    return sendOk(res, {
      token: idToken,
      expiresAt: tokenInfo.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('获取 POTA token 失败:', error);

    if ((error as Error).message.includes('未找到') || (error as Error).message.includes('刷新失败')) {
      return sendBizError(res, 'NO_TOKEN', (error as Error).message, {
        requiresAuth: true,
      });
    }

    return sendError(res, error, { bizMessage: '获取 POTA token 失败' });
  }
});

/**
 * 断开 POTA 连接（调用 POTA 登出接口并删除本地 token）
 */
router.delete(
  '/api/pota/token',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      // 先调用 POTA 登出接口
      try {
        await potaAuthService.logoutFromPota();
      } catch (logoutError) {
        // 即使 POTA 登出失败，也继续清除本地 token
        console.warn('POTA 登出接口调用失败，继续清除本地 token:', (logoutError as Error).message);
      }

      // 清除本地 token
      await potaAuthService.deleteTokens(req.user?.id);

      return sendOk(res, null, '已断开 POTA 连接');
    } catch (error) {
      console.error('断开 POTA 连接失败:', error);
      return sendError(res, error, { bizMessage: '断开 POTA 连接失败' });
    }
  }
);

/**
 * 获取 POTA 连接状态
 */
router.get('/api/pota/status', authenticateToken, requirePotaImportPermission, async (req, res) => {
  try {
    // 获取用户密码哈希
    const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user?.id]);
    if (!user) {
      return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
    }

    // 使用 getValidToken 方法，它会自动处理 token 刷新
    // 这样确保返回的过期时间是最新的
    try {
      const validToken = await potaAuthService.getValidToken(req.user?.id, user.password_hash);
      const tokenInfo = potaAuthService.decodeJWT(validToken);

      return sendOk(res, {
        connected: true,
        expiresAt: tokenInfo.expiresAt.toISOString(),
        willExpireSoon: tokenInfo.willExpireSoon(5),
      });
    } catch (error) {
      // 如果 token 已过期且无法刷新，则返回未连接状态
      if ((error as Error).message.includes('未找到') || (error as Error).message.includes('刷新失败')) {
        return sendOk(res, {
          connected: false,
          expiresAt: null,
        });
      }
      throw error; // 其他错误继续抛出
    }
  } catch (error) {
    console.error('获取 POTA 状态失败:', error);
    return sendError(res, error, { bizMessage: '获取 POTA 状态失败' });
  }
});

/**
 * 获取系统内已上传 POTA 的所有公园，支持搜索和分页
 */
router.get('/api/pota/parks', async (req, res) => {
  try {
    // 解析请求参数
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 30;
    const search = (req.query.search as string) || '';
    const sortBy = (req.query.sortBy as string) || 'pota_id';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    
    // 构建搜索条件
    let searchConditions = 'WHERE status = $1';
    const searchParams: (string | number)[] = ['pota_synced'];
    let paramIndex = 2;
    
    if (search) {
      // 支持 POTA_ID 和公园名称搜索
      searchConditions += ` AND (pota_id ILIKE $${paramIndex} OR park_name ILIKE $${paramIndex})`;
      searchParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // 构建排序条件
    const validSortFields = ['pota_id', 'park_name', 'created_at', 'pota_synced_at'];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'pota_id';
    const finalSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // 计算偏移量
    const offset = page * pageSize;
    
    // 查询总条数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM park_applications
      ${searchConditions}
    `;
    const countResult = await getOne(countQuery, searchParams);
    const total = parseInt(countResult.total, 10);
    
    // 查询公园列表
    const parksQuery = `
      SELECT 
        id, 
        pota_id, 
        park_name, 
        park_type, 
        provinces,
        latitude,
        longitude,
        website,
        description,
        pota_synced_at
      FROM park_applications
      ${searchConditions}
      ORDER BY ${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const parksParams = [...searchParams, pageSize, offset];
    const parks = await getMany(parksQuery, parksParams);
    
    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);
    
    // 返回结果
    return sendOk(res, {
      parks,
      total,
      page,
      pageSize,
      totalPages
    }, '获取 POTA 公园列表成功');
  } catch (error) {
    console.error('获取 POTA 公园列表失败:', error);
    return sendError(res, error, { bizMessage: '获取 POTA 公园列表失败' });
  }
});

export default router;
