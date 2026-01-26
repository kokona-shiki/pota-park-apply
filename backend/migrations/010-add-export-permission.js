/**
 * 数据库迁移: 添加导出权限和审计日志表
 *
 * 执行方式:
 * node -e "import('./backend/migrations/010-add-export-permission.js').then(m => m.addExportPermission())"
 */
import { query } from '../config/database.js';

export const addExportPermission = async () => {
  console.log('🔄 开始添加导出权限和审计日志表...');

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS export_audit_logs (
        id SERIAL PRIMARY KEY,
        file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('csv', 'kmz')),
        park_count INTEGER NOT NULL,
        exported_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exported_by_callsign VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      INSERT INTO permissions (permission_code, description)
      VALUES ('export_parks', '导出公园数据权限')
      ON CONFLICT (permission_code) DO NOTHING
    `);

    await query(`
      INSERT INTO role_permissions (role, permission_id)
      SELECT 'pota_representative', p.id
      FROM permissions p
      WHERE p.permission_code = 'export_parks'
      ON CONFLICT (role, permission_id) DO NOTHING
    `);

    await query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '10')
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    `);

    console.log('✅ 导出权限和审计日志表添加完成!');
    console.log('💡 权限说明:');
    console.log('   - 权限代码: export_parks');
    console.log('   - 权限描述: 导出公园数据权限');
    console.log('   - 授权角色: pota_representative');
    console.log('📊 审计日志表: export_audit_logs');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
};

import { testConnection } from '../config/database.js';

const runMigration = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 数据库连接失败');
      process.exit(1);
    }

    await addExportPermission();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}
