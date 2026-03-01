/**
 * 数据库迁移: 将公园申请表中的省份字段从单个字段改为JSONB数组字段
 *
 * 执行方式:
 * node -e "import('./backend/migrations/002-migrate-province-to-jsonb.js').then(m => m.migrateProvinces())"
 */

import { query } from '../config/database.js';

export const migrateProvinces = async () => {
  console.warn('🔄 开始迁移公园申请表的省份字段...');

  try {
    // 1. 添加新的 provinces JSONB 字段，初始默认值为包含原有 province_iso_code 的数组
    console.warn('  ➕ 添加新的 provinces JSONB 字段...');
    await query(`
      ALTER TABLE park_applications ADD COLUMN IF NOT EXISTS provinces JSONB
    `);

    // 2. 将现有的 province_iso_code 数据迁移到新的 provinces 字段
    console.warn('  🔄 迁移现有省份数据...');
    await query(`
      UPDATE park_applications 
      SET provinces = jsonb_build_array(province_iso_code)
      WHERE provinces IS NULL OR jsonb_array_length(provinces) = 0
    `);

    // 3. 设置新的默认值
    await query(`
      ALTER TABLE park_applications 
      ALTER COLUMN provinces SET DEFAULT '[]'::jsonb
    `);

    // 4. 创建新字段的索引
    console.warn('  🔍 创建新字段索引...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_park_applications_provinces 
      ON park_applications USING GIN (provinces)
    `);

    // 5. 记录迁移统计信息
    const stats = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN provinces IS NOT NULL THEN 1 END) as migrated_records
      FROM park_applications
    `);

    console.warn(
      `  📊 迁移统计: 总共 ${stats.rows[0].total_records} 条记录, 已迁移 ${stats.rows[0].migrated_records} 条`
    );

    console.warn('✅ 省份字段迁移完成!');
    console.warn('💡 注意: 原有的 province_iso_code 字段暂时保留以确保向后兼容，可在后续版本中移除');
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

    await migrateProvinces();
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
