import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { manualTriggerPotaImport } from '../services/potaImportService.js';
import { sendOk, sendError, sendBizError } from '../utils/response.js';

const router = express.Router();

/**
 * 检查用户是否为 POTA 地图代表
 */
const requirePotaRepresentative = (req, res, next) => {
  // 检查用户是否具有POTA导入权限或POTA代表权限
  if (req.user?.role !== 'pota_representative') {
    return sendBizError(res, 'FORBIDDEN', '只有 POTA 地图代表可以执行此操作', null);
  }
  next();
};

/**
 * 手动触发 POTA 公园导入
 */
router.post('/api/pota/import', authenticateToken, requirePotaRepresentative, async (req, res) => {
  try {
    console.log(`用户 ${req.user.id} (${req.user.callsign}) 开始手动触发 POTA 公园导入`);

    const results = await manualTriggerPotaImport(req.user.id);

    return sendOk(
      res,
      {
        results,
        message: `POTA 公园导入完成: 总计 ${results.total}, 导入 ${results.imported}, 跳过 ${
          results.skipped
        }, 错误 ${results.errors?.length || 0}`,
      },
      'POTA 公园导入执行成功'
    );
  } catch (error) {
    console.error('POTA 公园导入失败:', error);
    return sendError(res, error, { bizMessage: error.message || 'POTA 公园导入失败' });
  }
});

/**
 * 获取 POTA 导入状态
 */
router.get('/api/pota/import-status', authenticateToken, async (req, res) => {
  try {
    // 简单返回当前用户是否有权限执行导入
    const canImport = req.user?.role === 'pota_representative';

    return sendOk(
      res,
      {
        canImport,
        role: req.user?.role,
        userId: req.user?.id,
      },
      'ok'
    );
  } catch (error) {
    console.error('获取 POTA 导入状态失败:', error);
    return sendError(res, error, { bizMessage: '获取状态失败' });
  }
});

export default router;
