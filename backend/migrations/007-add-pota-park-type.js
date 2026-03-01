/**
 * 数据库迁移: 为公园申请表添加 pota_park_type 字段
 * 用于存储从 POTA 导入的公园的原始公园类型描述
 *
 * 执行方式:
 * node -e "import('./backend/migrations/007-add-pota-park-type.js').then(m => m.migratePotaParkType())"
 */

import { query } from '../config/database.js';

export const migratePotaParkType = async () => {
  console.warn('🔄 开始添加 pota_park_type 字段...');

  try {
    // 添加 pota_park_type 字段
    console.warn('  ➕ 添加 pota_park_type 字段...');
    await query(`
      ALTER TABLE park_applications 
      ADD COLUMN IF NOT EXISTS pota_park_type VARCHAR(255)
    `);

    console.warn('✅ pota_park_type 字段添加完成!');
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

    await migratePotaParkType();
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
