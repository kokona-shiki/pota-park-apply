import dotenv from 'dotenv';

import app from './app.js';
import { testConnection } from './config/database.js';
import { getMapProvider } from './config/proxyConfig.js';
import scheduler from './utils/scheduler.js';

dotenv.config();

const PORT = process.env.PORT || 3101;

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.warn('⚠️  数据库连接失败，某些功能可能无法正常工作');
    }

    const mapProvider = getMapProvider();

    // 启动定时任务
    scheduler.init().catch((err: Error) => {
      console.error('❌ 定时任务初始化失败:', err);
    });

    app.listen(PORT, () => {
      console.log(`🚀 POTA Park Apply Backend is running on port ${PORT}`);
      console.log(`📖 API documentation: http://localhost:${PORT}`);
      console.log('');
      console.log(`🗄️  Database: PostgreSQL`);
      console.log(`🔗 Status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`🗺️  Map Provider: ${mapProvider}`);
      console.log('');
      console.log('📋 可用的初始化接口:');
      console.log('POST /api/init-database - 初始化数据库表结构');
      console.log('');
      console.log('🔐 认证接口:');
      console.log('POST /api/register - 用户注册');
      console.log('POST /api/login - 用户登录');
      console.log('GET  /api/user-info - 获取用户信息');
      console.log('GET  /api/user-permissions - 获取用户权限');
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
      console.log('GET  /api/park-applications/:id/audit-logs - 获取审核记录');
      console.log('');
      console.log('⏰ 审核提醒:');
      console.log('POST /api/park-applications/:id/reminders - 创建审核提醒');
      console.log('GET  /api/review-reminders - 获取审核提醒列表');
      console.log('');
      console.log('📍 基础数据:');
      console.log('GET  /api/provinces - 获取省份列表');
      console.log('');
      console.log('🔗 POTA 认证:');
      console.log('POST /api/pota/init-auth - 初始化 POTA 认证');
      console.log('POST /api/pota/callback - POTA 认证回调');
      console.log('GET  /api/pota/token - 获取 POTA token（自动刷新）');
      console.log('GET  /api/pota/status - 获取 POTA 连接状态');
      console.log('DELETE /api/pota/token - 断开 POTA 连接');
      console.log('');
      console.log('📥 POTA 公园导入:');
      console.log('POST /api/pota/import - 手动触发 POTA 公园导入');
      console.log('GET  /api/pota/import-status - 获取导入权限状态');
      console.log('GET  /api/pota/import-task/latest - 获取导入任务');
      console.log('GET  /api/pota/unprocessed-parks - 获取未处理公园');
      console.log('POST /api/pota/process-unprocessed-park - 处理未处理公园');
      console.log('POST /api/pota/bulk-process-unprocessed-parks - 批量处理未处理公园');
      console.log('');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', (error as Error)?.message || error);
    process.exit(1);
  }
};

startServer();
