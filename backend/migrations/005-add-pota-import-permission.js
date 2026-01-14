/**
 * 数据库迁移: 添加 POTA 导入权限
 *
 * 执行方式:
 * node -e "import('./backend/migrations/005-add-pota-import-permission.js').then(m => m.addPotaImportPermission())"
 */

import { query } from '../config/database.js';

export const addPotaImportPermission = async () => {
  console.log('🔄 开始添加 POTA 导入权限...');

  try {
    // 1. 添加 pota_import 权限
    console.log('  ➕ 添加 pota_import 权限...');
    await query(`
      INSERT INTO permissions (permission_code, description)
      VALUES ('pota_import', 'POTA 公园数据导入权限')
      ON CONFLICT (permission_code) DO NOTHING
    `);

    // 2. 为 pota_representative 角色分配 pota_import 权限
    console.log('  👥 为 POTA 代表分配导入权限...');
    await query(`
      INSERT INTO role_permissions (role, permission_id)
      SELECT 'pota_representative', p.id
      FROM permissions p
      WHERE p.permission_code = 'pota_import'
      ON CONFLICT (role, permission_id) DO NOTHING
    `);

    // 3. 更新 schema 版本
    await query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '7')
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    `);

    console.log('✅ POTA 导入权限添加完成!');

    console.log('💡 权限说明:');
    console.log('   - 权限代码: pota_import');
    console.log('   - 权限描述: POTA 公园数据导入权限');
    console.log('   - 授权角色: pota_representative');
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

    await addPotaImportPermission();
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
