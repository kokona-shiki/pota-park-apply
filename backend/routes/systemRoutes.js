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

// API 健康检查
router.get('/api/health', async (_req, res) => {
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
