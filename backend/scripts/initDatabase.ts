import { testConnection, getOne, closePool } from '../config/database.js';
import {
  initializeDatabase,
  ensureInitialSystemAdmin,
  migrateSchemaToLatest,
} from '../config/initDatabase.js';

// 测试数据库连接
async function testDatabaseConnection(): Promise<boolean> {
  console.warn('🔍 测试数据库连接...');
  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

  let connected = false;
  for (let i = 1; i <= 30; i++) {
    connected = await testConnection();
    if (connected) break;
    console.warn(`⏳ 数据库尚未就绪，稍后重试... (${i}/30)`);
    await sleep(2000);
  }

  if (!connected) {
    console.error('❌ 数据库连接失败，请检查配置');
    process.exit(1);
  }

  return connected;
}

// 检查数据库初始化状态
async function checkDatabaseInitialization(): Promise<{ value: string } | false> {
  const forceInit = ['1', 'true', 'yes'].includes(
    String(process.env.FORCE_INIT_DB || '').toLowerCase()
  );
  
  if (forceInit) {
    return false;
  }

  try {
    const regs = await getOne<{ app_meta: string | null; users: string | null }>(`
      SELECT
        to_regclass('public.app_meta') AS app_meta,
        to_regclass('public.users') AS users
    `);

    if (regs?.app_meta && regs?.users) {
      const schemaVersion = await getOne<{ value: string }>(
        `SELECT value FROM app_meta WHERE key = 'schema_version'`
      );

      return schemaVersion;
    }
  } catch (e) {
    console.warn('⚠️ 初始化状态检测失败，将继续执行完整初始化：', e instanceof Error ? e.message : String(e));
  }

  return false;
}

// 处理数据库迁移
async function handleDatabaseMigration(schemaVersion: { value: string }): Promise<boolean> {
  if (schemaVersion?.value === '9' || schemaVersion?.value === '8') {
    console.warn(
      `✅ 检测到数据库已初始化（schema_version=${schemaVersion.value}），执行迁移并确保初始系统管理员存在...`
    );
    await migrateSchemaToLatest();
    await ensureInitialSystemAdmin();
    console.warn('🎉 数据库检查完成！');
    return true;
  }

  if (schemaVersion?.value === '2') {
    console.warn(
      '🛠️ 检测到旧数据库（schema_version=2），执行迁移（移除 dx_entity）后跳过建表/建索引...'
    );
    await migrateSchemaToLatest();
    await ensureInitialSystemAdmin();
    console.warn('🎉 数据库迁移完成！');
    return true;
  }

  if (schemaVersion?.value === '3') {
    console.warn(
      '🛠️ 检测到数据库版本 3，需要升级到版本 9（添加 POTA 认证表、权限、未处理公园表、pota_park_type 字段、pota_id 字段）...'
    );
    // 继续执行初始化，会创建新表并更新版本号
    return false;
  }

  // For any other version, run migrations
  console.warn(`🛠️ 检测到数据库版本 ${schemaVersion?.value}，执行迁移到最新版本...`);
  await migrateSchemaToLatest();
  await ensureInitialSystemAdmin();
  console.warn('🎉 数据库迁移完成！');
  return true;
}

// 完整初始化数据库
async function initializeDatabaseSchema(): Promise<void> {
  console.warn('📝 初始化数据库表结构和数据...');
  await initializeDatabase();

  console.warn('🎉 数据库初始化完成！');
  console.warn('');
  console.warn('📋 创建的表:');
  console.warn('  - users (用户表)');
  console.warn('  - permissions (权限表)');
  console.warn('  - role_permissions (角色权限表)');
  console.warn('  - provinces (省份表)');
  console.warn('  - callsign_change_requests (呼号变更申请表)');
  console.warn('  - user_info_changes (用户信息修改记录表)');
  console.warn('  - park_applications (公园申请表)');
  console.warn('  - application_audit_logs (申请审核记录表)');
  console.warn('  - review_reminders (审核提醒表)');
  console.warn('');
  console.warn('⚙️  创建的功能:');
  console.warn('  - 地理空间索引 (PostGIS)');
  console.warn('  - 全文搜索索引');
  console.warn('  - 权限验证函数');
  console.warn('  - 自动更新时间戳触发器');
  console.warn('');
  console.warn('👥 初始数据:');
  console.warn('  - 34 个省份数据');
  console.warn('  - 13 个权限项');
  console.warn('  - 4 种角色的权限配置');
}

const init = async (): Promise<void> => {
  console.warn('🚀 开始初始化 POTA 公园申请系统数据库...');

  try {
    // 1. 测试连接
    await testDatabaseConnection();

    // 2. 检查数据库初始化状态
    const schemaVersion = await checkDatabaseInitialization();

    // 3. 处理数据库迁移
    if (schemaVersion) {
      const migrated = await handleDatabaseMigration(schemaVersion);
      if (migrated) {
        return;
      }
    }

    // 4. 完整初始化数据库
    await initializeDatabaseSchema();
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error instanceof Error ? error.message : String(error));
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