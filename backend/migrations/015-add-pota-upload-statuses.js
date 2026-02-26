/**
 * 数据库迁移: 添加 POTA 上传状态
 *
 * 执行方式:
 * node -e "import('./backend/migrations/015-add-pota-upload-statuses.js').then(m => m.addPotaUploadStatuses())"
 */
import { query } from '../config/database.js';

export const addPotaUploadStatuses = async () => {
  console.warn('🔄 开始添加 POTA 上传状态...');

  try {
    await query(`
      ALTER TABLE park_applications 
      DROP CONSTRAINT IF EXISTS park_applications_status_check
    `);

    await query(`
      ALTER TABLE park_applications 
      ADD CONSTRAINT park_applications_status_check 
      CHECK (status IN ('pending', 'approved', 'rejected', 'pota_pending_upload', 'pota_uploading', 'pota_upload_failed', 'pota_uploaded', 'pota_synced'))
    `);
    console.warn('✓ 更新了状态约束，添加了新状态');

    await query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '15')
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    `);

    console.warn('✅ POTA 上传状态添加完成!');
    console.warn('💡 新增状态说明:');
    console.warn('   - pota_pending_upload: 待上传（已加入队列，等待执行）');
    console.warn('   - pota_uploading: 上传中（正在执行）');
    console.warn('   - pota_upload_failed: 上传失败');
    console.warn('   - pota_uploaded: 上传成功');
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

    await addPotaUploadStatuses();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}
