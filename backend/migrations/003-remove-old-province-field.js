/**
 * 数据库迁移: 移除旧的 province_iso_code 字段，完全使用新的 provinces JSONB 字段
 *
 * 执行方式:
 * node -e "import('./backend/migrations/003-remove-old-province-field.js').then(m => m.removeOldProvinceField())"
 */

import { query } from '../config/database.js';

export const removeOldProvinceField = async () => {
  console.log('🔄 开始移除旧的 province_iso_code 字段...');

  try {
    // 1. 确保所有记录都有新的 provinces 字段数据
    console.log('  🔄 确保所有记录都有新的省份数据...');
    await query(`
      UPDATE park_applications 
      SET provinces = jsonb_build_array(province_iso_code)
      WHERE provinces IS NULL OR jsonb_array_length(provinces) = 0
    `);

    // 2. 移除旧的 province_iso_code 字段
    console.log('  ➖ 移除旧的 province_iso_code 字段...');
    await query(`
      ALTER TABLE park_applications DROP COLUMN IF EXISTS province_iso_code
    `);

    // 3. 更新相关索引
    console.log('  🗂️ 更新相关索引...');
    await query(`
      DROP INDEX IF EXISTS idx_province_status
    `);

    // 4. 记录迁移统计信息
    const stats = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN provinces IS NOT NULL THEN 1 END) as records_with_new_provinces
      FROM park_applications
    `);

    console.log(
      `  📊 迁移统计: 总共 ${stats.rows[0].total_records} 条记录, ${stats.rows[0].records_with_new_provinces} 条记录已更新新省份数据`
    );

    console.log('✅ 旧省份字段移除完成!');
    console.log('💡 提示: 请确保所有应用程序代码都已更新以使用新的 provinces 字段');
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

    await removeOldProvinceField();
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
