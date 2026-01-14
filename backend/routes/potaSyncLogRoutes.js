import express from 'express';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPotaSyncLogs, getPotaSyncLogById } from '../services/potaSyncLogService.js';

const router = express.Router();

// 获取POTA同步日志列表（需要pota_import权限）
router.get('/pota/sync-logs', requirePermission('pota_import'), async (req, res) => {
  try {
    const { page, pageSize, startDate, endDate, operationType, search } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (operationType) filters.operationType = operationType;
    if (search) filters.search = search;

    const pagination = {};
    if (page) pagination.page = parseInt(page);
    if (pageSize) pagination.pageSize = parseInt(pageSize);

    const result = await getPotaSyncLogs(filters, pagination);

    res.json({
      code: 0,
      message: '获取POTA同步日志成功',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('获取POTA同步日志失败:', error);
    res.status(500).json({
      code: 1,
      message: '获取POTA同步日志失败: ' + error.message,
    });
  }
});

// 获取单个POTA同步日志详情（需要pota_import权限）
router.get('/pota/sync-logs/:id', requirePermission('pota_import'), async (req, res) => {
  try {
    const { id } = req.params;

    const log = await getPotaSyncLogById(parseInt(id));

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
    console.error('获取POTA同步日志详情失败:', error);
    res.status(500).json({
      code: 1,
      message: '获取POTA同步日志详情失败: ' + error.message,
    });
  }
});

export default router;
