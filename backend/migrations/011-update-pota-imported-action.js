/**
 * 数据库迁移: 更新审核日志 action 从 'pota_synced' 到 'pota_imported'
 *
 * 执行方式:
 * node -e "import('./backend/migrations/011-update-pota-imported-action.js').then(m => m.updatePotaImportedAction())"
 */
import { query, testConnection } from '../config/database.js';

export const updatePotaImportedAction = async () => {
  console.warn('🔄 开始更新审核日志 action...');

  try {
    await query(`
      ALTER TABLE application_audit_logs
      DROP CONSTRAINT IF EXISTS application_audit_logs_action_check
    `);
    console.warn('✅ 删除旧的 CHECK 约束');

    const result = await query(`
      UPDATE application_audit_logs
      SET action = 'pota_imported'
      WHERE action = 'pota_synced'
    `);

    console.warn(`✅ 更新了 ${result.rowCount} 条审核日志记录`);

    await query(`
      ALTER TABLE application_audit_logs
      ADD CONSTRAINT application_audit_logs_action_check
      CHECK (action IN ('submitted', 'approved', 'rejected', 'reverted_approved', 'reverted_rejected', 'pota_imported'))
    `);
    console.warn('✅ 添加新的 CHECK 约束');

    await query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '11')
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    `);

    console.warn('✅ schema 迁移完成（schema_version=11）');
    console.warn('💡 更新说明:');
    console.warn('   - 将审核日志 action 从 "pota_synced" 更新为 "pota_imported"');
    console.warn('   - 用于区分 POTA 导入和后续的 POTA 同步功能');
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

    await updatePotaImportedAction();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}
