import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken';
import { requirePermission } from '../middleware/requirePermission';
import * as exportService from '../services/exportService.js';
import { sendError, sendOk } from '../utils/response.js';

interface AuthenticatedRequest extends express.Request {
  user: {
    id: number;
    email: string;
    hasPotaImportPermission?: boolean;
    hasReviewPermission?: boolean;
  };
}

const router = express.Router();

router.get('/api/export/csv', authenticateToken, requirePermission('export_parks'), async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const csvBuffer = await exportService.exportToCSV(userId);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="parks.csv"');
    res.send(csvBuffer);
  } catch (error) {
    console.error('导出 CSV 失败:', error);
    return sendError(res, error, { bizMessage: '导出 CSV 失败' });
  }
});

router.get('/api/export/kmz', authenticateToken, requirePermission('export_parks'), async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    const kmzBuffer = await exportService.exportToKMZ(userId);
    
    res.setHeader('Content-Type', 'application/vnd.google-earth.kmz');
    res.setHeader('Content-Disposition', 'attachment; filename="parks.kmz"');
    res.send(kmzBuffer);
  } catch (error) {
    console.error('导出 KMZ 失败:', error);
    return sendError(res, error, { bizMessage: '导出 KMZ 失败' });
  }
});

router.get('/api/export/audit-logs', authenticateToken, requirePermission('view_all_users'), async (req, res) => {
  try {
    const logs = await exportService.getExportAuditLogs();
    
    return sendOk(res, { logs }, '获取审计日志成功');
  } catch (error) {
    console.error('获取审计日志失败:', error);
    return sendError(res, error, { bizMessage: '获取审计日志失败' });
  }
});

export default router;
