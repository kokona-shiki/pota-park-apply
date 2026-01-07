import { testConnection } from '../config/database.js';
import { initializeDatabase } from '../config/initDatabase.js';

const init = async () => {
  console.log('🚀 开始初始化 POTA 公园申请系统数据库...');
  
  try {
    // 1. 测试连接
    console.log('🔍 测试数据库连接...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ 数据库连接失败，请检查配置');
      process.exit(1);
    }
    
    // 2. 初始化数据库
    console.log('📝 初始化数据库表结构和数据...');
    await initializeDatabase();
    
    console.log('🎉 数据库初始化完成！');
    console.log('');
    console.log('📋 创建的表:');
    console.log('  - users (用户表)');
    console.log('  - permissions (权限表)');
    console.log('  - role_permissions (角色权限表)');
    console.log('  - provinces (省份表)');
    console.log('  - callsign_change_requests (呼号变更申请表)');
    console.log('  - user_info_changes (用户信息修改记录表)');
    console.log('  - park_applications (公园申请表)');
    console.log('  - application_audit_logs (申请审核记录表)');
    console.log('  - review_reminders (审核提醒表)');
    console.log('');
    console.log('⚙️  创建的功能:');
    console.log('  - 地理空间索引 (PostGIS)');
    console.log('  - 全文搜索索引');
    console.log('  - 权限验证函数');
    console.log('  - 自动更新时间戳触发器');
    console.log('');
    console.log('👥 初始数据:');
    console.log('  - 34 个省份数据');
    console.log('  - 13 个权限项');
    console.log('  - 4 种角色的权限配置');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
};

init();