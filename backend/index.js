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

// 提交公园申请接口
app.post('/api/apply-park', (req, res) => {
  try {
    const {
      dx_entity,
      park_name,
      park_type,
      province,
      latitude,
      longitude,
      website,
      access_methods,
      activation_methods,
      confirmed_authenticity
    } = req.body;

    // 验证必填字段
    if (!dx_entity || !park_name || !park_type || !province || !latitude || !longitude) {
      return res.status(400).json({ 
        error: '缺少必填字段',
        required_fields: ['dx_entity', 'park_name', 'park_type', 'province', 'latitude', 'longitude']
      });
    }

    // 验证确认真实性
    if (!confirmed_authenticity) {
      return res.status(400).json({ error: '请确认公园真实性' });
    }

    // 验证访问方法格式
    const validAccessMethods = ['汽车', '步行', '船只', '水上飞机/空中出租车', '其他'];
    if (!Array.isArray(access_methods) || access_methods.some(method => !method.zh || !validAccessMethods.includes(method.zh))) {
      return res.status(400).json({ 
        error: '访问方法格式无效',
        expected_format: [{ zh: '中文方法', en: 'English method' }],
        valid_zh_methods: validAccessMethods
      });
    }

    // 验证激活方法格式
    const validActivationMethods = ['步行', '车载', '固定建筑', '露营地', '庇护所', '其他'];
    if (!Array.isArray(activation_methods) || activation_methods.some(method => !method.zh || !validActivationMethods.includes(method.zh))) {
      return res.status(400).json({ 
        error: '激活方法格式无效',
        expected_format: [{ zh: '中文方法', en: 'English method' }],
        valid_zh_methods: validActivationMethods
      });
    }

    // 创建申请数据对象
    const application = {
      id: Date.now(), // 临时使用时间戳作为ID
      dx_entity,
      park_name,
      park_type,
      province,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      website: website || '',
      access_methods,
      activation_methods,
      confirmed_authenticity,
      status: 'pending', // 待审核状态
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 这里应该保存到数据库，目前只是模拟成功响应
    console.log('📝 收到公园申请:', application);

    res.json({
      success: true,
      message: '公园申请提交成功',
      data: application,
      application_id: application.id
    });

  } catch (error) {
    console.error('处理公园申请时出错:', error);
    res.status(500).json({ 
      error: '服务器内部错误',
      message: '提交申请失败，请稍后重试'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 POTA Park Apply Backend is running on port ${PORT}`);
  console.log(`📖 API documentation: http://localhost:${PORT}`);
});