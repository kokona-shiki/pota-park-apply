/**
 * 数据库迁移: 添加 POTA 未处理公园表
 *
 * 执行方式:
 * node -e "import('./backend/migrations/006-add-pota-unprocessed-parks-table.js').then(m => m.addPotaUnprocessedParksTable())"
 */

import { query, testConnection } from '../config/database.js';

export const addPotaUnprocessedParksTable = async () => {
  console.log('🔄 开始添加 POTA 未处理公园表...');

  try {
    // 1. 创建未处理公园表
    console.log('  ➕ 创建 pota_unprocessed_parks 表...');
    await query(`
      CREATE TABLE IF NOT EXISTS pota_unprocessed_parks (
        reference TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. 创建索引
    console.log('  🔍 创建相关索引...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pota_unprocessed_created_at
      ON pota_unprocessed_parks (created_at DESC)
    `);

    // 3. 更新 schema 版本
    await query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '8')
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    `);

    console.log('✅ POTA 未处理公园表创建完成!');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
};

const runMigration = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 数据库连接失败');
      process.exit(1);
    }

    await addPotaUnprocessedParksTable();
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
