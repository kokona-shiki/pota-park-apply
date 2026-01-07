import express from 'express';
import { testConnection } from '../config/database.js';
import { initializeDatabase } from '../config/initDatabase.js';

const router = express.Router();

// 基础路由
router.get('/', (_req, res) => {
  res.json({
    message: 'POTA Park Apply Backend API',
    version: '1.0.0',
    status: 'running',
    database: 'PostgreSQL'
  });
});

const isInternalIp = (ip) => {
  // Express 在 IPv6/代理场景下可能返回 ::ffff:10.x.x.x
  const normalized = String(ip || '').replace('::ffff:', '');
  return normalized.startsWith('10.');
};

// API 健康检查（仅内网 10.0.0.0/8 允许访问）
router.get('/api/health', async (req, res) => {
  if (!isInternalIp(req.ip)) {
    return res.status(403).json({ error: '仅允许内网访问' });
  }

  const dbStatus = await testConnection();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected'
  });
});

// 初始化数据库
router.post('/api/init-database', async (_req, res) => {
  try {
    await initializeDatabase();
    res.json({
      success: true,
      message: '数据库初始化成功'
    });
  } catch (error) {
    console.error('数据库初始化失败:', error);
    res.status(500).json({
      error: '数据库初始化失败',
      details: error.message
    });
  }
});

export default router;
