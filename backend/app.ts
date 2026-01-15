import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import systemRoutes from './routes/systemRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import callsignRoutes from './routes/callsignRoutes.js';
import parkApplicationRoutes from './routes/parkApplicationRoutes.js';
import provinceRoutes from './routes/provinceRoutes.js';
import potaRoutes from './routes/potaRoutes.js';
import potaImportRoutes from './routes/potaImportRoutes.js';
import potaSyncLogRoutes from './routes/potaSyncLogRoutes.js';
import { initProxies } from './config/proxyConfig.js';

const app = express();

// CSP（安全补偿措施）：
// - 禁用内联脚本：script-src 'self'
// - 允许 Vite dev server 的 HMR/WebSocket（仅开发环境）
// 注意：生产环境建议由反代/网关层注入 CSP，这里先在后端兜底。
app.use((_req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  const connectSrc = ["'self'"];
  if (isDev) {
    // Vite HMR
    connectSrc.push('ws:', 'wss:', 'http://localhost:*');
  }

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    `connect-src ${connectSrc.join(' ')}`,
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "form-action 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(self)');

  // 如果你未来把前端静态资源也交给后端托管，这里也适用。
  next();
});

// 在反向代理/容器环境下获取真实客户端 IP
// - 设为 1：信任一层代理（例如 Nginx / Vite dev server），避免 express-rate-limit 的 permissive trust proxy 报错
app.set('trust proxy', 1);

// -----------------
// 中间件
// -----------------
app.use(
  cors({
    origin: true,
    // 使用 HttpOnly Cookie 携带 refresh token（开发/部署走同源代理时不会触发 CORS，但这里保持可用）
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json());

// 初始化动态代理 (在路由之前)
initProxies(app);

// 全局限流（所有接口）
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试', data: null },
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
app.use(potaRoutes);
app.use(potaImportRoutes);
app.use(potaSyncLogRoutes);

// 404 处理
app.use('*', (_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: '接口不存在', data: null });
});

// 全局错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    code: 'SERVER_ERROR',
    message: '服务器内部错误',
    data: null,
  });
});

export default app;
