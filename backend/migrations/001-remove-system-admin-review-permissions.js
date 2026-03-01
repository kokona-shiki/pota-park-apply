/**
 * 数据库迁移: 移除 system_admin 的公园审核权限
 *
 * 执行方式:
 * pnpm migrate:remove-admin-review-permissions
 */

import { query } from '../config/database.js';

export const removeSystemAdminReviewPermissions = async () => {
  console.warn('🔄 开始移除 system_admin 的公园审核权限...');

  try {
    // 删除 system_admin 的审核相关权限
    const reviewPermissions = [
      'review_application',
      'remind_review',
      'sync_to_pota'
    ];

    for (const permissionCode of reviewPermissions) {
      const result = await query(
        `
        DELETE FROM role_permissions
        WHERE role = 'system_admin'
          AND permission_id = (SELECT id FROM permissions WHERE permission_code = $1)
        RETURNING permission_id
        `,
        [permissionCode]
      );

      if (result.rowCount > 0) {
        console.warn(`  ✅ 已移除权限: ${permissionCode}`);
      } else {
        console.warn(`  ℹ️  权限不存在: ${permissionCode}`);
      }
    }

    // 验证 system_admin 的剩余权限
    const remainingPermissions = await query(
      `
      SELECT p.permission_code, p.description
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role = 'system_admin'
      ORDER BY p.permission_code
      `
    );

    console.warn('\n📋 system_admin 当前权限列表:');
    remainingPermissions.rows.forEach((perm) => {
      console.warn(`  - ${perm.permission_code}: ${perm.description}`);
    });

    console.warn('\n✅ 权限调整完成!');
    console.warn('📝 system_admin 现在只拥有用户管理相关权限,不参与公园审核流程。');
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

    await removeSystemAdminReviewPermissions();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    process.exit(1);
  }
};

runMigration();
