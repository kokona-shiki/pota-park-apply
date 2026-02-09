import express from 'express';
import { testConnection } from '../config/database.js';
import { initializeDatabase } from '../config/initDatabase.js';
import { sendHttpError, sendOk } from '../utils/response.js';

const router = express.Router();

// 基础路由
router.get('/', (_req, res) => {
  return sendOk(
    res,
    {
      message: 'POTA Park Apply Backend API',
      version: '1.0.0',
      status: 'running',
      database: 'PostgreSQL'
    },
    'ok'
  );
});

const isInternalIp = (ip: string | undefined): boolean => {
  // Express 在 IPv6/代理场景下可能返回 ::ffff:10.x.x.x
  const normalized = String(ip || '').replace('::ffff:', '');
  return normalized.startsWith('10.');
};

// API 健康检查（仅内网 10.0.0.0/8 允许访问）
router.get('/api/health', async (req, res) => {
  if (!isInternalIp(req.ip)) {
    return sendHttpError(res, 403, 'FORBIDDEN', '仅允许内网访问', null);
  }

  const dbStatus = await testConnection();
  return sendOk(
    res,
    {
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected'
    },
    'ok'
  );
});

// 初始化数据库
router.post('/api/init-database', async (_req, res) => {
  try {
    await initializeDatabase();
    return sendOk(res, null, '数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return sendHttpError(res, 500, 'SERVER_ERROR', '数据库初始化失败', { details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;