import { testConnection, getOne, closePool } from '../config/database.js';
import { initializeDatabase, ensureInitialSystemAdmin, migrateSchemaToLatest } from '../config/initDatabase.js';

const init = async () => {
  console.log('🚀 开始初始化 POTA 公园申请系统数据库...');

  try {
    // 1. 测试连接（首次启动时 Postgres 可能会经历一次短暂重启，这里做重试）
    console.log('🔍 测试数据库连接...');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    let connected = false;
    for (let i = 1; i <= 30; i++) {
      connected = await testConnection();
      if (connected) break;
      console.log(`⏳ 数据库尚未就绪，稍后重试... (${i}/30)`);
      await sleep(2000);
    }

    if (!connected) {
      console.error('❌ 数据库连接失败，请检查配置');
      process.exit(1);
    }

    // 2. 快速路径：如果检测到库已初始化，则跳过建表/建索引（这些即使幂等也会比较慢）
    const forceInit = ['1', 'true', 'yes'].includes(String(process.env.FORCE_INIT_DB || '').toLowerCase());
    if (!forceInit) {
      try {
        const regs = await getOne(`
          SELECT
            to_regclass('public.app_meta') AS app_meta,
            to_regclass('public.users') AS users
        `);

        if (regs?.app_meta && regs?.users) {
          const schemaVersion = await getOne(`SELECT value FROM app_meta WHERE key = 'schema_version'`);

          if (schemaVersion?.value === '3') {
            console.log('✅ 检测到数据库已初始化（schema_version=3），跳过建表/建索引，仅确保初始系统管理员存在...');
            await ensureInitialSystemAdmin();
            console.log('🎉 数据库检查完成！');
            return;
          }

          if (schemaVersion?.value === '2') {
            console.log('🛠️ 检测到旧数据库（schema_version=2），执行迁移（移除 dx_entity）后跳过建表/建索引...');
            await migrateSchemaToLatest();
            await ensureInitialSystemAdmin();
            console.log('🎉 数据库迁移完成！');
            return;
          }
        }
      } catch (e) {
        console.warn('⚠️ 初始化状态检测失败，将继续执行完整初始化：', e?.message || e);
      }
    }

    // 3. 完整初始化数据库
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
  } finally {
    // 关键：init-db 是一次性脚本，不关闭连接池会让 Node 进程等待 idleTimeout（默认 30s），看起来像“init-db 很慢”
    try {
      await closePool();
    } catch {
      // ignore
    }
  }
};

init();