import express from 'express';
import { testConnection } from '../config/database.js';
import { initializeDatabase } from '../config/initDatabase.js';
import { sendHttpError, sendOk } from '../utils/response.js';

const router = express.Router();

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

router.get('/api/health', async (req, res) => {
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
