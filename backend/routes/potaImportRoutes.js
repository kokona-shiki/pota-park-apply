import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { checkUserPermission } from '../utils/auth.js';
import {
  getUnprocessedParks,
  setUnprocessedParks,
  clearUnprocessedParks,
  processUnprocessedPark,
  bulkProcessUnprocessedParks,
  manualTriggerPotaImport,
} from '../services/potaImportService.js';
import { getOne } from '../config/database.js';
import { sendOk, sendError, sendBizError } from '../utils/response.js';

const router = express.Router();

/**
 * 检查用户是否有 POTA 导入权限
 */
const requirePotaImportPermission = async (req, res, next) => {
  try {
    const hasImportPermission = await checkUserPermission(req.user.id, 'pota_import');
    const hasSyncPermission = await checkUserPermission(req.user.id, 'sync_to_pota');

    if (!hasImportPermission && !hasSyncPermission) {
      return sendBizError(res, 'FORBIDDEN', '没有权限执行此操作', null);
    }

    next();
  } catch (error) {
    console.error('检查权限失败:', error);
    return sendError(res, error, { bizMessage: '权限检查失败' });
  }
};

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
      const { parks } = req.body;

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
      const { parkData } = req.body;

      if (!parkData || !parkData.reference || !parkData.manualType) {
        return sendBizError(res, 'MISSING_PARAMS', '公园数据、参考ID和类型不能为空', null);
      }

      // 获取用户信息
      const userInfo = await getOne('SELECT id, role FROM users WHERE id = $1', [req.user.id]);
      if (!userInfo) {
        return sendBizError(res, 'USER_NOT_FOUND', '用户不存在', null);
      }

      const result = await processUnprocessedPark(parkData, userInfo.id, userInfo.role);

      if (result.success) {
        return sendOk(res, result, result.message);
      } else {
        return sendBizError(res, 'PROCESS_FAILED', result.error, { reference: parkData.reference });
      }
    } catch (error) {
      console.error('处理未处理公园失败:', error);
      return sendError(res, error, { bizMessage: '处理未处理公园失败' });
    }
  }
);

/**
 * 批量处理未处理的公园
 */
router.post(
  '/api/pota/bulk-process-unprocessed-parks',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const { parksData } = req.body;

      if (!parksData || !Array.isArray(parksData) || parksData.length === 0) {
        return sendBizError(res, 'MISSING_PARAMS', '公园数据列表不能为空', null);
      }

      // 验证每个公园数据
      for (const parkData of parksData) {
        if (!parkData.reference || !parkData.manualType) {
          return sendBizError(
            res,
            'MISSING_PARAMS',
            `公园 ${parkData.reference || 'unknown'} 的数据不完整`,
            null
          );
        }
      }

      // 获取用户信息
      const userInfo = await getOne('SELECT id, role FROM users WHERE id = $1', [req.user.id]);
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
 * 手动触发POTA导入（会更新未处理公园列表）
 */
router.post(
  '/api/pota/manual-import',
  authenticateToken,
  requirePotaImportPermission,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await manualTriggerPotaImport(userId);

      // 如果导入结果中有需要手动确认的公园，更新缓存
      if (result.needs_manual_confirmation && result.needs_manual_confirmation.length > 0) {
        await setUnprocessedParks(result.needs_manual_confirmation);
      }

      return sendOk(res, result, '手动触发POTA导入成功');
    } catch (error) {
      console.error('手动触发POTA导入失败:', error);
      return sendError(res, error, { bizMessage: '手动触发POTA导入失败' });
    }
  }
);

export default router;
