import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { sendOk, sendError, sendBizError } from '../utils/response.js';
import potaAuthService from '../services/potaAuthService.js';
import { getOne } from '../config/database.js';

const router = express.Router();

/**
 * 检查用户是否为 POTA 地图代表
 */
const requirePotaRepresentative = (req, res, next) => {
  if (req.user?.role !== 'pota_representative') {
    return sendBizError(res, 'FORBIDDEN', '只有 POTA 地图代表可以访问此功能', null);
  }
  next();
};

/**
 * POTA 登录（使用账号密码 + Puppeteer）
 */
router.post('/api/pota/login', authenticateToken, requirePotaRepresentative, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return sendBizError(res, 'MISSING_PARAMS', '用户名和密码不能为空', null);
    }

    // 使用 Puppeteer 登录
    const { tokens, pkce } = await potaAuthService.loginWithCredentials(username, password);

    // 解析 token 获取过期时间
    const tokenInfo = potaAuthService.decodeJWT(tokens.idToken);

    // 获取用户密码哈希
    const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!user) {
      return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
    }

    // 存储 token 到数据库（加密）
    await potaAuthService.storeTokens(
      req.user.id,
      {
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokenInfo.expiresAt,
      },
      user.password_hash
    );

    // 清理 PKCE 参数（如果存在）
    await potaAuthService.clearPKCE(req.user.id);

    return sendOk(res, {
      success: true,
      expiresAt: tokenInfo.expiresAt.toISOString(),
      hasRefreshToken: !!tokens.refreshToken,
    });
  } catch (error) {
    console.error('POTA 登录失败:', error);
    return sendError(res, error, { bizMessage: error.message || 'POTA 登录失败' });
  }
});

/**
 * 初始化 POTA 认证（生成授权 URL）- 保留用于 OAuth2 流程
 */
router.post(
  '/api/pota/init-auth',
  authenticateToken,
  requirePotaRepresentative,
  async (req, res) => {
    try {
      const pkce = potaAuthService.generatePKCE();

      // 保存 PKCE 参数到数据库
      await potaAuthService.storePKCE(req.user.id, pkce);

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
  requirePotaRepresentative,
  async (req, res) => {
    try {
      const { code, state } = req.body;

      if (!code || !state) {
        return sendBizError(res, 'MISSING_PARAMS', '缺少授权码或状态参数', null);
      }

      // 从数据库获取保存的 PKCE 参数
      const pkceData = await potaAuthService.getPKCE(req.user.id, state);

      if (!pkceData) {
        return sendBizError(res, 'INVALID_STATE', '无效的状态参数或已过期', null);
      }

      // 交换 token
      const tokens = await potaAuthService.exchangeCodeForToken(code, pkceData.code_verifier);

      // 解析 token 获取过期时间
      const tokenInfo = potaAuthService.decodeJWT(tokens.idToken);

      // 获取用户密码哈希
      const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (!user) {
        return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
      }

      // 存储 token 到数据库（加密）
      await potaAuthService.storeTokens(
        req.user.id,
        {
          idToken: tokens.idToken,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokenInfo.expiresAt,
        },
        user.password_hash
      );

      // 清理 PKCE 参数
      await potaAuthService.clearPKCE(req.user.id);

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
router.get('/api/pota/token', authenticateToken, requirePotaRepresentative, async (req, res) => {
  try {
    // 获取用户密码哈希
    const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!user) {
      return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
    }

    const idToken = await potaAuthService.getValidToken(req.user.id, user.password_hash);
    const tokenInfo = potaAuthService.decodeJWT(idToken);

    return sendOk(res, {
      token: idToken,
      expiresAt: tokenInfo.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('获取 POTA token 失败:', error);

    if (error.message.includes('未找到') || error.message.includes('刷新失败')) {
      return sendBizError(res, 'NO_TOKEN', error.message, {
        requiresAuth: true,
      });
    }

    return sendError(res, error, { bizMessage: '获取 POTA token 失败' });
  }
});

/**
 * 断开 POTA 连接（调用 POTA 登出接口并删除本地 token）
 */
router.delete('/api/pota/token', authenticateToken, requirePotaRepresentative, async (req, res) => {
  try {
    // 先调用 POTA 登出接口
    try {
      await potaAuthService.logoutFromPota();
    } catch (logoutError) {
      // 即使 POTA 登出失败，也继续清除本地 token
      console.warn('POTA 登出接口调用失败，继续清除本地 token:', logoutError.message);
    }

    // 清除本地 token
    await potaAuthService.deleteTokens(req.user.id);

    return sendOk(res, null, '已断开 POTA 连接');
  } catch (error) {
    console.error('断开 POTA 连接失败:', error);
    return sendError(res, error, { bizMessage: '断开 POTA 连接失败' });
  }
});

/**
 * 获取 POTA 连接状态
 */
router.get('/api/pota/status', authenticateToken, requirePotaRepresentative, async (req, res) => {
  try {
    // 获取用户密码哈希
    const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!user) {
      return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
    }

    // 使用 getValidToken 方法，它会自动处理 token 刷新
    // 这样确保返回的过期时间是最新的
    try {
      const validToken = await potaAuthService.getValidToken(req.user.id, user.password_hash);
      const tokenInfo = potaAuthService.decodeJWT(validToken);
      
      return sendOk(res, {
        connected: true,
        expiresAt: tokenInfo.expiresAt.toISOString(),
        willExpireSoon: tokenInfo.willExpireSoon(5),
      });
    } catch (error) {
      // 如果 token 已过期且无法刷新，则返回未连接状态
      if (error.message.includes('未找到') || error.message.includes('刷新失败')) {
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

export default router;
