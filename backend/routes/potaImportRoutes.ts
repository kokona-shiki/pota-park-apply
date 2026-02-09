import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authenticateToken';
import { checkUserPermission } from '../utils/auth.js';
import {
  getUnprocessedParks,
  setUnprocessedParks,
  clearUnprocessedParks,
  processUnprocessedPark,
  bulkProcessUnprocessedParks,
  manualTriggerPotaImport,
  getLatestImportTaskForUser,
  markImportTaskRead,
} from '../services/pota-import/potaImportService.js';
import { getOne } from '../config/database.js';
import { sendOk, sendError, sendBizError, sendHttpError } from '../utils/response.js';
import {
  PotaUnprocessedParkProcessRequestSchema,
  PotaUnprocessedParkBulkProcessRequestSchema,
  PotaUnprocessedParkSchema,
  BulkUpdateParkTypeRequestSchema,
} from '../../shared/schemas/pota.js';
import {
  getParkTypeMismatches,
  bulkUpdateParkTypes,
} from '../services/pota-import/parkTypeAlignmentService.js';

const router = express.Router();

/**
 * 检查用户是否有 POTA 导入权限
 */
const requirePotaImportPermission = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const hasImportPermission = await checkUserPermission(req.user?.id, 'pota_import');
    const hasSyncPermission = await checkUserPermission(req.user?.id, 'sync_to_pota');

    if (!hasImportPermission && !hasSyncPermission) {
      return sendHttpError(res, 403, 'FORBIDDEN', '没有权限执行此操作', null);
    }

    next();
  } catch (error) {
    console.error('检查权限失败:', error);
    return sendError(res, error, { bizMessage: '权限检查失败' });
  }
};

/**
 * 获取导入权限状态
 */
router.get('/api/pota/import-status', authenticateToken, requirePotaImportPermission, async (req, res) => {
  try {
    const hasImportPermission = await checkUserPermission(req.user?.id, 'pota_import');
    const hasSyncPermission = await checkUserPermission(req.user?.id, 'sync_to_pota');

    return sendOk(
      res,
      {
        canImport: hasImportPermission || hasSyncPermission,
        hasImportPermission,
        hasSyncPermission,
      },
      '获取导入权限状态成功'
    );
  } catch (error) {
    console.error('获取导入权限状态失败:', error);
    return sendError(res, error, { bizMessage: '获取导入权限状态失败' });
  }
});

/**
 * 获取需要手动处理的公园列表
 */
router.get(
  '/api/pota/unprocessed-parks',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const unprocessedParks = await getUnprocessedParks();
      return sendOk(res, unprocessedParks, '获取未处理公园列表成功');
    } catch (error) {
      console.error('获取未处理公园列表失败:', error);
      return sendError(res, error, { bizMessage: '获取未处理公园列表失败' });
    }
  }
);

/**
 * 设置未处理的公园列表（通常在导入时调用）
 */
router.post(
  '/api/pota/unprocessed-parks',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const parsed = z
        .object({
          parks: z.array(PotaUnprocessedParkSchema),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return sendBizError(res, 'MISSING_PARAMS', '公园列表不能为空', null);
      }
      const { parks } = parsed.data;

      if (!parks || !Array.isArray(parks)) {
        return sendBizError(res, 'MISSING_PARAMS', '公园列表不能为空', null);
      }

      const result = await setUnprocessedParks(parks);
      return sendOk(res, result, '设置未处理公园列表成功');
    } catch (error) {
      console.error('设置未处理公园列表失败:', error);
      return sendError(res, error, { bizMessage: '设置未处理公园列表失败' });
    }
  }
);

/**
 * 清空未处理的公园列表
 */
router.delete(
  '/api/pota/unprocessed-parks',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const result = await clearUnprocessedParks();
      return sendOk(res, result, '清空未处理公园列表成功');
    } catch (error) {
      console.error('清空未处理公园列表失败:', error);
      return sendError(res, error, { bizMessage: '清空未处理公园列表失败' });
    }
  }
);

/**
 * 处理单个未处理的公园
 */
router.post(
  '/api/pota/process-unprocessed-park',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const parsed = PotaUnprocessedParkProcessRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'MISSING_PARAMS', '公园数据、参考ID和类型不能为空', null);
      }
      const { parkData } = parsed.data;

      if (!parkData || !parkData.reference || !parkData.manualType) {
        return sendBizError(res, 'MISSING_PARAMS', '公园数据、参考ID和类型不能为空', null);
      }

      // 获取用户信息
      const userInfo = await getOne('SELECT id, role FROM users WHERE id = $1', [req.user?.id]);
      if (!userInfo) {
        return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
      }

      const result = await processUnprocessedPark(parkData, userInfo.id, userInfo.role);

      if (result.success) {
        return sendOk(res, result, result.message);
      }
      return sendBizError(res, 'PROCESS_FAILED', result.error, { reference: parkData.reference });
    } catch (error) {
      console.error('处理未处理公园失败:', error);
      return sendError(res, error, { bizMessage: '处理未处理公园失败' });
    }
  }
);

/**
 * 定义批量处理的公园数据类型
 */
type BulkProcessParkData = {
  reference: string;
  manualType: string;
};

/**
 * 验证批量处理的公园数据
 */
const validateBulkProcessParksData = (parksData: BulkProcessParkData[]) => {
  if (!parksData || !Array.isArray(parksData) || parksData.length === 0) {
    return { valid: false, error: '公园数据列表不能为空' };
  }

  // 验证每个公园数据
  for (const parkData of parksData) {
    if (!parkData.reference || !parkData.manualType) {
      return { 
        valid: false, 
        error: `公园 ${parkData.reference || 'unknown'} 的数据不完整` 
      };
    }
  }

  return { valid: true, error: null };
};

/**
 * 批量处理未处理的公园
 */
router.post(
  '/api/pota/bulk-process-unprocessed-parks',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const parsed = PotaUnprocessedParkBulkProcessRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'MISSING_PARAMS', '公园数据列表不能为空', null);
      }
      const { parksData } = parsed.data;

      // 验证公园数据
      const validationResult = validateBulkProcessParksData(parksData);
      if (!validationResult.valid) {
        return sendBizError(res, 'MISSING_PARAMS', validationResult.error, null);
      }

      // 获取用户信息
      const userInfo = await getOne('SELECT id, role FROM users WHERE id = $1', [req.user?.id]);
      if (!userInfo) {
        return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
      }

      const results = await bulkProcessUnprocessedParks(parksData, userInfo.id, userInfo.role);

      // 计算成功和失败的数量
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      return sendOk(
        res,
        {
          results,
          successCount,
          failCount,
        },
        `批量处理完成，成功: ${successCount}，失败: ${failCount}`
      );
    } catch (error) {
      console.error('批量处理未处理公园失败:', error);
      return sendError(res, error, { bizMessage: '批量处理未处理公园失败' });
    }
  }
);

/**
 * 触发POTA导入（会更新未处理公园列表）
 */
router.post(
  '/api/pota/import',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const userId = req.user?.id;

      const result = await manualTriggerPotaImport(userId);

      if (result.rejected) {
        return sendBizError(res, 'IMPORT_TASK_REJECTED', result.message, {
          reason: result.reason,
        });
      }

      return sendOk(res, result, '已提交 POTA 导入任务');
    } catch (error) {
      console.error('手动触发POTA导入失败:', error);
      return sendError(res, error, { bizMessage: '手动触发POTA导入失败' });
    }
  }
);

/**
 * 获取当前用户最新的POTA导入任务
 */
router.get(
  '/api/pota/import-task/latest',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const task = await getLatestImportTaskForUser(req.user?.id);
      return sendOk(res, task, '获取导入任务成功');
    } catch (error) {
      console.error('获取导入任务失败:', error);
      return sendError(res, error, { bizMessage: '获取导入任务失败' });
    }
  }
);

/**
 * 标记导入任务已读
 */
router.post(
  '/api/pota/import-task/:taskId/read',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await markImportTaskRead(req.user?.id, taskId as string);
      if (!task) {
        return sendBizError(res, 'TASK_NOT_FOUND', '未找到可标记的导入任务', null);
      }
      return sendOk(res, task, '任务已标记为已读');
    } catch (error) {
      console.error('标记导入任务已读失败:', error);
      return sendError(res, error, { bizMessage: '标记导入任务已读失败' });
    }
  }
);

/**
 * 获取公园类型不一致的列表
 */
router.get(
  '/api/pota/park-type-mismatches',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const mismatches = await getParkTypeMismatches();
      return sendOk(res, mismatches, '获取公园类型不一致列表成功');
    } catch (error) {
      console.error('获取公园类型不一致列表失败:', error);
      return sendError(res, error, { bizMessage: '获取公园类型不一致列表失败' });
    }
  }
);

/**
 * 批量更新公园类型
 */
router.put(
  '/api/pota/bulk-update-park-types',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const parsed = BulkUpdateParkTypeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'MISSING_PARAMS', '更新列表不能为空', null);
      }
      const { updates } = parsed.data;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return sendBizError(res, 'MISSING_PARAMS', '更新列表不能为空', null);
      }

      // 获取用户信息
      const userInfo = await getOne('SELECT id, role FROM users WHERE id = $1', [req.user?.id]);
      if (!userInfo) {
        return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
      }

      const results = await bulkUpdateParkTypes(updates, userInfo.id, userInfo.role);

      // 计算成功和失败的数量
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      return sendOk(
        res,
        {
          results,
          successCount,
          failCount,
        },
        `批量更新完成，成功: ${successCount}，失败: ${failCount}`
      );
    } catch (error) {
      console.error('批量更新公园类型失败:', error);
      return sendError(res, error, { bizMessage: '批量更新公园类型失败' });
    }
  }
);

export default router;
