import express from 'express';
import cors from 'cors';

import systemRoutes from './routes/systemRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import callsignRoutes from './routes/callsignRoutes.js';
import parkApplicationRoutes from './routes/parkApplicationRoutes.js';
import provinceRoutes from './routes/provinceRoutes.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use(systemRoutes);
app.use(authRoutes);
app.use(userRoutes);
app.use(callsignRoutes);
app.use(parkApplicationRoutes);
app.use(provinceRoutes);

// 404 处理
app.use('*', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理
app.use((err, _req, res, _next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: '请稍后重试'
  });
});

export default app;
