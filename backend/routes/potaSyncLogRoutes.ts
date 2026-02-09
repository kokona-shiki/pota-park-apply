import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken';
import { requirePermission } from '../middleware/requirePermission';
import { getPotaSyncLogs, getPotaSyncLogById } from '../services/potaSyncLogService.js';

const router = express.Router();

// 获取POTA同步日志列表（需要pota_import权限）
router.get('/api/pota/sync-logs', authenticateToken, requirePermission('pota_import'), async (req, res) => {
  try {
    const { page, pageSize, startDate, endDate, operationType, search } = req.query;

    const filters: Record<string, string> = {};
    if (startDate) filters.startDate = String(startDate);
    if (endDate) filters.endDate = String(endDate);
    if (operationType) filters.operationType = String(operationType);
    if (search) filters.search = String(search);

    const pagination: Record<string, number> = {};
    if (page) pagination.page = parseInt(String(page), 10);
    if (pageSize) pagination.pageSize = parseInt(String(pageSize), 10);

    const result = await getPotaSyncLogs(filters, pagination);

    res.json({
      code: 0,
      message: '获取POTA同步日志成功',
      data: {
        logs: result.logs,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('获取POTA同步日志失败:', err);
    res.status(500).json({
      code: 1,
      message: `获取POTA同步日志失败: ${err.message}`,
    });
  }
});

// 获取单个POTA同步日志详情（需要pota_import权限）
router.get('/api/pota/sync-logs/:id', authenticateToken, requirePermission('pota_import'), async (req, res) => {
  try {
    const { id } = req.params;

    const log = await getPotaSyncLogById(parseInt(Array.isArray(id) ? id[0] : id, 10));

    if (!log) {
      return res.status(404).json({
        code: 1,
        message: '未找到指定的POTA同步日志',
      });
    }

    res.json({
      code: 0,
      message: '获取POTA同步日志详情成功',
      data: log,
    });
  } catch (error) {
    const err = error as Error;
    console.error('获取POTA同步日志详情失败:', err);
    res.status(500).json({
      code: 1,
      message: `获取POTA同步日志详情失败: ${err.message}`,
    });
  }
});

export default router;
