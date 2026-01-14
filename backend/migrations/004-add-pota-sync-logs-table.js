/**
 * 数据库迁移: 添加 POTA 同步日志表
 *
 * 执行方式:
 * node -e "import('./backend/migrations/004-add-pota-sync-logs-table.js').then(m => m.addPotaSyncLogsTable())"
 */

import { query } from '../config/database.js';

export const addPotaSyncLogsTable = async () => {
  console.log('🔄 开始添加 POTA 同步日志表...');

  try {
    // 1. 创建 POTA 同步日志表
    console.log('  ➕ 创建 pota_sync_logs 表...');
    await query(`
      CREATE TABLE IF NOT EXISTS pota_sync_logs (
        id SERIAL PRIMARY KEY,
        operator TEXT NOT NULL,
        operation_type VARCHAR(20) NOT NULL
          CHECK (operation_type IN ('auto', 'manual')),
        sync_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        parks_imported JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'success'
          CHECK (status IN ('success', 'partial_success', 'failed')),
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. 创建索引
    console.log('  🔍 创建相关索引...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pota_sync_logs_operator 
      ON pota_sync_logs (operator)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pota_sync_logs_operation_type 
      ON pota_sync_logs (operation_type)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pota_sync_logs_sync_date 
      ON pota_sync_logs (sync_date)
    `);

    console.log('✅ POTA 同步日志表创建完成!');

    // 3. 更新 schema 版本
    await query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '6')
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    `);

    console.log('💡 表结构说明:');
    console.log('   - id: 日志记录ID');
    console.log('   - operator: 操作人（用户名或"系统自动"）');
    console.log('   - operation_type: 操作类型（auto/manual）');
    console.log('   - sync_date: 同步日期');
    console.log('   - parks_imported: 导入的公园列表（JSONB格式）');
    console.log('   - status: 同步状态（success/partial_success/failed）');
    console.log('   - details: 详细信息');
    console.log('   - created_at: 创建时间');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
};

// 如果直接运行此文件
import { testConnection } from '../config/database.js';

const runMigration = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 数据库连接失败');
      process.exit(1);
    }

    await addPotaSyncLogsTable();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    process.exit(1);
  }
};

// 仅当直接运行此文件时执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}
