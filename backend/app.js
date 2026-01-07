import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import systemRoutes from './routes/systemRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import callsignRoutes from './routes/callsignRoutes.js';
import parkApplicationRoutes from './routes/parkApplicationRoutes.js';
import provinceRoutes from './routes/provinceRoutes.js';

const app = express();

// 在反向代理/容器环境下获取真实客户端 IP
app.set('trust proxy', true);

// -----------------
// 中间件
// -----------------
app.use(
  cors({
    origin: true,
    // 使用 HttpOnly Cookie 携带 refresh token（开发/部署走同源代理时不会触发 CORS，但这里保持可用）
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);
app.use(express.json());

// 全局限流（所有接口）
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '请求过于频繁，请稍后再试' }
  })
);

// -----------------
// 路由
// -----------------
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
