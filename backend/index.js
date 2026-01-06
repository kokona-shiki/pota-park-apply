import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 基础路由
app.get('/', (req, res) => {
  res.json({
    message: 'POTA Park Apply Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 模拟登录接口
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body;
  
  // 临时模拟登录逻辑
  if (identifier && password) {
    res.json({
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 1,
        username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
        callsign: identifier.includes('@') ? 'BG0FFH' : identifier,
        email: identifier.includes('@') ? identifier : `${identifier}@example.com`,
        user_group: 'user',
        registration_time: '2025-01-01'
      }
    });
  } else {
    res.status(400).json({ error: '用户名和密码不能为空' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 POTA Park Apply Backend is running on port ${PORT}`);
  console.log(`📖 API documentation: http://localhost:${PORT}`);
});