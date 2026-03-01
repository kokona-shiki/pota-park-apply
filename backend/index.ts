import dotenv from 'dotenv';

import app from './app.js';
import { testConnection } from './config/database.js';
import { getMapProvider } from './config/proxyConfig.js';
import scheduler from './utils/scheduler.js';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const PORT = process.env.PORT || 3101;

const startServer = async () => {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.warn('⚠️  数据库连接失败，某些功能可能无法正常工作');
    }

    const mapProvider = getMapProvider();

    scheduler.init().catch((err: Error) => {
      console.error('❌ 定时任务初始化失败:', err);
    });

    app.listen(PORT, () => {
      console.warn(`🚀 POTA Park Apply Backend is running on port ${PORT}`);
      console.warn(`📖 API documentation: http://localhost:${PORT}`);
      console.warn('');
      console.warn(`🗄️  Database: PostgreSQL`);
      console.warn(`🔗 Status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.warn(`🗺️  Map Provider: ${mapProvider}`);
      console.warn('');
      console.warn('📋 可用的初始化接口:');
      console.warn('POST /api/init-database - 初始化数据库表结构');
      console.warn('');
      console.warn('🔐 认证接口:');
      console.warn('POST /api/register - 用户注册');
      console.warn('POST /api/login - 用户登录');
      console.warn('GET  /api/user-info - 获取用户信息');
      console.warn('GET  /api/user-permissions - 获取用户权限');
      console.warn('');
      console.warn('👥 用户管理:');
      console.warn('GET  /api/users - 获取用户列表');
      console.warn('PUT  /api/users/:userId - 修改用户信息');
      console.warn('PUT  /api/users/:userId/role - 修改用户角色');
      console.warn('');
      console.warn('📝 呼号管理:');
      console.warn('POST /api/callsign-change-requests - 申请呼号变更');
      console.warn('GET  /api/callsign-change-requests - 获取变更申请');
      console.warn('PUT  /api/callsign-change-requests/:requestId/review - 审核变更');
      console.warn('');
      console.warn('🏞️  公园申请:');
      console.warn('POST /api/park-applications - 提交申请');
      console.warn('GET  /api/park-applications - 获取申请列表');
      console.warn('GET  /api/park-applications/:id - 获取申请详情');
      console.warn('PUT  /api/park-applications/:id/review - 审核申请');
      console.warn('PUT  /api/park-applications/:id/re-review - 重新审核');
      console.warn('PUT  /api/park-applications/:id/sync-pota - 录入POTA');
      console.warn('GET  /api/park-applications/:id/audit-logs - 获取审核记录');
      console.warn('');
      console.warn('⏰ 审核提醒:');
      console.warn('POST /api/park-applications/:id/reminders - 创建审核提醒');
      console.warn('GET  /api/review-reminders - 获取审核提醒列表');
      console.warn('');
      console.warn('📍 基础数据:');
      console.warn('GET  /api/provinces - 获取省份列表');
      console.warn('');
      console.warn('🔗 POTA 认证:');
      console.warn('POST /api/pota/init-auth - 初始化 POTA 认证');
      console.warn('POST /api/pota/callback - POTA 认证回调');
      console.warn('GET  /api/pota/token - 获取 POTA token（自动刷新）');
      console.warn('GET  /api/pota/status - 获取 POTA 连接状态');
      console.warn('DELETE /api/pota/token - 断开 POTA 连接');
      console.warn('');
      console.warn('📥 POTA 公园导入:');
      console.warn('POST /api/pota/import - 手动触发 POTA 公园导入');
      console.warn('GET /api/pota/import-status - 获取导入权限状态');
      console.warn('GET /api/pota/import-task/latest - 获取导入任务');
      console.warn('GET /api/pota/unprocessed-parks - 获取未处理公园');
      console.warn('POST /api/pota/process-unprocessed-park - 处理未处理公园');
      console.warn('POST /api/pota/bulk-process-unprocessed-parks - 批量处理未处理公园');
      console.warn('');
      console.warn('🔔 通知系统:');
      console.warn('GET /api/notifications - 获取通知列表');
      console.warn('GET /api/notifications/unread-count - 获取未读数量');
      console.warn('GET /api/notifications/popup - 获取弹窗通知');
      console.warn('GET /api/notifications/:id - 获取通知详情');
      console.warn('PUT /api/notifications/:id/read - 标记已读');
      console.warn('PUT /api/notifications/read-all - 全部标记已读');
      console.warn('PUT /api/notifications/:id/dismiss-popup - 关闭弹窗');
      console.warn('POST /api/notifications - 创建全局通知');
      console.warn('POST /api/notifications/drafts - 创建草稿');
      console.warn('GET /api/notifications/drafts - 获取草稿列表');
      console.warn('GET /api/notifications/drafts/:id - 获取草稿详情');
      console.warn('PUT /api/notifications/drafts/:id - 更新草稿');
      console.warn('DELETE /api/notifications/drafts/:id - 删除草稿');
      console.warn('POST /api/notifications/drafts/:id/publish - 发布草稿');
      console.warn('POST /api/notifications/:id/withdraw - 撤回通知');
      console.warn('GET /api/notifications/global - 获取全局通知列表');
      console.warn('');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', (error as Error)?.message || error);
    process.exit(1);
  }
};

startServer();
