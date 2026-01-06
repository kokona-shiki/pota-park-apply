import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, initializeDatabase } from './config/database.js';
import { generateToken, verifyToken, findUserById } from './utils/auth.js';
import * as userService from './services/userService.js';
import * as parkApplicationService from './services/parkApplicationService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// JWT 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '缺少访问令牌' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: '无效或过期的令牌' });
  }
};

// 权限检查中间件
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const { checkUserPermission } = await import('./utils/auth.js');
      const hasPermission = await checkUserPermission(req.user.id, permission);
      
      if (!hasPermission) {
        return res.status(403).json({ error: '权限不足' });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: '权限检查失败' });
    }
  };
};

// 基础路由
app.get('/', (_req, res) => {
  res.json({
    message: 'POTA Park Apply Backend API',
    version: '1.0.0',
    status: 'running',
    database: 'PostgreSQL'
  });
});

// API 路由
app.get('/api/health', async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected'
  });
});

// 初始化数据库
app.post('/api/init-database', async (_req, res) => {
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

// ==================== 用户认证相关 ====================

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { email, callsign, password } = req.body;
    
    if (!email || !callsign || !password) {
      return res.status(400).json({ 
        error: '邮箱、呼号和密码不能为空' 
      });
    }
    
    const user = await userService.registerUser({
      email,
      callsign,
      password
    });
    
    const token = generateToken({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });
    
    res.json({
      success: true,
      message: '注册成功',
      token,
      user
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ 
        error: '用户名/邮箱和密码不能为空' 
      });
    }
    
    const user = await userService.loginUser(identifier, password);
    
    const token = generateToken({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });
    
    res.json({
      success: true,
      message: '登录成功',
      token,
      user
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取当前用户信息
app.get('/api/user-info', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取用户权限
app.get('/api/user-permissions', authenticateToken, async (req, res) => {
  try {
    const { getUserPermissions } = await import('./utils/auth.js');
    const permissions = await getUserPermissions(req.user.id);
    
    res.json({ permissions });
  } catch (error) {
    console.error('获取用户权限失败:', error);
    res.status(500).json({ error: '获取用户权限失败' });
  }
});

// ==================== 用户管理相关 ====================

// 获取用户列表
app.get('/api/users', authenticateToken, requirePermission('view_all_users'), async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const users = await userService.getUsers(role, isActive !== 'false');
    
    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 修改用户信息
app.put('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { field, value, reason } = req.body;
    
    if (!field || !value) {
      return res.status(400).json({ error: '字段名和新值不能为空' });
    }
    
    const updatedUser = await userService.updateUserInfo(
      req.user.id, 
      parseInt(userId), 
      field, 
      value, 
      reason
    );
    
    res.json({
      success: true,
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('修改用户信息失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 修改用户角色
app.put('/api/users/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: '角色不能为空' });
    }
    
    const updatedUser = await userService.updateUserRole(
      req.user.id, 
      parseInt(userId), 
      role
    );
    
    res.json({
      success: true,
      message: '用户角色更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('修改用户角色失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== 呼号变更相关 ====================

// 申请呼号变更
app.post('/api/callsign-change-requests', authenticateToken, async (req, res) => {
  try {
    const { newCallsign, reason } = req.body;
    
    if (!newCallsign || !reason) {
      return res.status(400).json({ error: '新呼号和申请原因不能为空' });
    }
    
    const request = await userService.requestCallsignChange(
      req.user.id, 
      newCallsign, 
      reason
    );
    
    res.json({
      success: true,
      message: '呼号变更申请提交成功',
      request
    });
  } catch (error) {
    console.error('呼号变更申请失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取呼号变更申请列表
app.get('/api/callsign-change-requests', authenticateToken, requirePermission('approve_callsign_change'), async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await userService.getCallsignChangeRequests(status);
    
    res.json({ requests });
  } catch (error) {
    console.error('获取呼号变更申请失败:', error);
    res.status(500).json({ error: '获取呼号变更申请失败' });
  }
});

// 审核呼号变更
app.put('/api/callsign-change-requests/:requestId/review', authenticateToken, requirePermission('approve_callsign_change'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, reviewNotes } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的审核状态' });
    }
    
    const result = await userService.reviewCallsignChange(
      req.user.id, 
      parseInt(requestId), 
      status, 
      reviewNotes
    );
    
    res.json({
      success: true,
      message: `呼号变更${status === 'approved' ? '通过' : '拒绝'}`,
      ...result
    });
  } catch (error) {
    console.error('审核呼号变更失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== 公园申请相关 ====================

// 提交公园申请
app.post('/api/park-applications', authenticateToken, async (req, res) => {
  try {
    const applicationData = req.body;
    
    // 验证必填字段
    const requiredFields = ['dx_entity', 'park_name', 'province_iso_code', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter(field => !applicationData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: '缺少必填字段', 
        missingFields 
      });
    }
    
    const application = await parkApplicationService.submitParkApplication(
      req.user.id, 
      applicationData
    );
    
    res.json({
      success: true,
      message: '公园申请提交成功',
      application
    });
  } catch (error) {
    console.error('提交公园申请失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取公园申请列表
app.get('/api/park-applications', authenticateToken, async (req, res) => {
  try {
    const { status, province, applicantId } = req.query;
    
    const applications = await parkApplicationService.getApplications(
      req.user.id, 
      status, 
      province, 
      applicantId ? parseInt(applicantId) : null
    );
    
    res.json({ applications });
  } catch (error) {
    console.error('获取公园申请列表失败:', error);
    res.status(500).json({ error: '获取公园申请列表失败' });
  }
});

// 获取公园申请详情
app.get('/api/park-applications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await parkApplicationService.getApplicationById(
      req.user.id, 
      parseInt(id)
    );
    
    res.json({ application });
  } catch (error) {
    console.error('获取公园申请详情失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 审核公园申请
app.put('/api/park-applications/:id/review', authenticateToken, requirePermission('review_application'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes, rejectionReason } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的审核状态' });
    }
    
    const application = await parkApplicationService.reviewApplication(
      req.user.id, 
      parseInt(id), 
      status, 
      reviewNotes, 
      rejectionReason
    );
    
    res.json({
      success: true,
      message: `申请${status === 'approved' ? '通过' : '拒绝'}`,
      application
    });
  } catch (error) {
    console.error('审核公园申请失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 重新审核公园申请
app.put('/api/park-applications/:id/re-review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }
    
    const application = await parkApplicationService.reReviewApplication(
      req.user.id, 
      parseInt(id), 
      status, 
      reviewNotes
    );
    
    res.json({
      success: true,
      message: '重新审核成功',
      application
    });
  } catch (error) {
    console.error('重新审核公园申请失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 录入POTA系统
app.put('/api/park-applications/:id/sync-pota', authenticateToken, requirePermission('sync_to_pota'), async (req, res) => {
  try {
    const { id } = req.params;
    const { potaNotes } = req.body;
    
    const application = await parkApplicationService.syncToPOTA(
      req.user.id, 
      parseInt(id), 
      potaNotes
    );
    
    res.json({
      success: true,
      message: 'POTA系统录入成功',
      application
    });
  } catch (error) {
    console.error('POTA系统录入失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取申请审核记录
app.get('/api/park-applications/:id/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const logs = await parkApplicationService.getAuditLogs(
      req.user.id, 
      parseInt(id)
    );
    
    res.json({ logs });
  } catch (error) {
    console.error('获取审核记录失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 创建审核提醒
app.post('/api/park-applications/:id/reminders', authenticateToken, requirePermission('remind_review'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderType, notes, remindedTo } = req.body;
    
    if (!reminderType || !['general', 'urgent', 'escalated'].includes(reminderType)) {
      return res.status(400).json({ error: '无效的提醒类型' });
    }
    
    const reminder = await parkApplicationService.createReviewReminder(
      req.user.id, 
      parseInt(id), 
      reminderType, 
      notes, 
      remindedTo ? parseInt(remindedTo) : null
    );
    
    res.json({
      success: true,
      message: '审核提醒创建成功',
      reminder
    });
  } catch (error) {
    console.error('创建审核提醒失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取审核提醒列表
app.get('/api/review-reminders', authenticateToken, async (req, res) => {
  try {
    const { applicationId, acknowledged } = req.query;
    
    const reminders = await parkApplicationService.getReviewReminders(
      req.user.id, 
      applicationId ? parseInt(applicationId) : null, 
      acknowledged !== null ? acknowledged === 'true' : null
    );
    
    res.json({ reminders });
  } catch (error) {
    console.error('获取审核提醒失败:', error);
    res.status(500).json({ error: '获取审核提醒失败' });
  }
});

// ==================== 省份相关 ====================

// 获取省份列表
app.get('/api/provinces', async (_req, res) => {
  try {
    const { getMany } = await import('./config/database.js');
    const provinces = await getMany(`
      SELECT iso_code, zh_name, en_name, sort_order 
      FROM provinces 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `);
    
    res.json({ provinces });
  } catch (error) {
    console.error('获取省份列表失败:', error);
    res.status(500).json({ error: '获取省份列表失败' });
  }
});

// ==================== 错误处理 ====================

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

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.warn('⚠️  数据库连接失败，某些功能可能无法正常工作');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 POTA Park Apply Backend is running on port ${PORT}`);
      console.log(`📖 API documentation: http://localhost:${PORT}`);
      console.log(`🗄️  Database: PostgreSQL`);
      console.log(`🔗 Status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.log('');
      console.log('📋 可用的初始化接口:');
      console.log('POST /api/init-database - 初始化数据库表结构');
      console.log('');
      console.log('🔐 认证接口:');
      console.log('POST /api/register - 用户注册');
      console.log('POST /api/login - 用户登录');
      console.log('GET  /api/user-info - 获取用户信息');
      console.log('');
      console.log('👥 用户管理:');
      console.log('GET  /api/users - 获取用户列表');
      console.log('PUT  /api/users/:userId - 修改用户信息');
      console.log('PUT  /api/users/:userId/role - 修改用户角色');
      console.log('');
      console.log('📝 呼号管理:');
      console.log('POST /api/callsign-change-requests - 申请呼号变更');
      console.log('GET  /api/callsign-change-requests - 获取变更申请');
      console.log('PUT  /api/callsign-change-requests/:requestId/review - 审核变更');
      console.log('');
      console.log('🏞️  公园申请:');
      console.log('POST /api/park-applications - 提交申请');
      console.log('GET  /api/park-applications - 获取申请列表');
      console.log('GET  /api/park-applications/:id - 获取申请详情');
      console.log('PUT  /api/park-applications/:id/review - 审核申请');
      console.log('PUT  /api/park-applications/:id/re-review - 重新审核');
      console.log('PUT  /api/park-applications/:id/sync-pota - 录入POTA');
      console.log('');
      console.log('📍 基础数据:');
      console.log('GET  /api/provinces - 获取省份列表');
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 启动服务器
startServer();