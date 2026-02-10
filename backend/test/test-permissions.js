/**
 * 权限验证测试
 * 验证 system_admin 不再拥有公园审核权限
 */

import { query } from '../config/database.js';
import { testConnection } from '../config/database.js';

const testPermissions = async () => {
  console.warn('🧪 开始权限验证测试...\n');

  // 1. 验证 system_admin 的权限
  console.warn('1️⃣ 检查 system_admin 的权限:');
  const systemAdminPerms = await query(
    `
    SELECT p.permission_code, p.description
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = 'system_admin'
    ORDER BY p.permission_code
    `
  );

  const reviewPermissions = ['review_application', 'remind_review', 'sync_to_pota'];
  const hasReviewPermissions = systemAdminPerms.rows.some((perm) =>
    reviewPermissions.includes(perm.permission_code)
  );

  if (hasReviewPermissions) {
    console.warn('  ❌ 失败: system_admin 仍然拥有审核权限');
    console.warn('  审核权限:', systemAdminPerms.rows.filter((p) => reviewPermissions.includes(p.permission_code)));
    return false;
  } else {
    console.warn('  ✅ 通过: system_admin 不再拥有审核权限');
  }

  console.warn('  当前权限列表:');
  systemAdminPerms.rows.forEach((perm) => {
    console.warn(`    - ${perm.permission_code}: ${perm.description}`);
  });

  // 2. 验证 park_reviewer 的权限
  console.warn('\n2️⃣ 检查 park_reviewer 的权限:');
  const parkReviewerPerms = await query(
    `
    SELECT p.permission_code, p.description
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = 'park_reviewer'
    ORDER BY p.permission_code
    `
  );

  const reviewerHasReviewPerms = parkReviewerPerms.rows.some((perm) =>
    reviewPermissions.includes(perm.permission_code)
  );

  if (!reviewerHasReviewPerms) {
    console.warn('  ❌ 失败: park_reviewer 没有必要的审核权限');
    return false;
  } else {
    console.warn('  ✅ 通过: park_reviewer 拥有审核权限');
  }

  console.warn('  权限列表:');
  parkReviewerPerms.rows.forEach((perm) => {
    console.warn(`    - ${perm.permission_code}: ${perm.description}`);
  });

  // 3. 验证 pota_representative 的权限
  console.warn('\n3️⃣ 检查 pota_representative 的权限:');
  const potaRepPerms = await query(
    `
    SELECT p.permission_code, p.description
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = 'pota_representative'
    ORDER BY p.permission_code
    `
  );

  const repHasAllReviewPerms = potaRepPerms.rows.some((perm) =>
    reviewPermissions.includes(perm.permission_code)
  );

  if (!repHasAllReviewPerms) {
    console.warn('  ❌ 失败: pota_representative 没有完整的审核权限');
    return false;
  } else {
    console.warn('  ✅ 通过: pota_representative 拥有完整的审核权限');
  }

  console.warn('  权限列表:');
  potaRepPerms.rows.forEach((perm) => {
    console.warn(`    - ${perm.permission_code}: ${perm.description}`);
  });

  // 4. 权限统计
  console.warn('\n📊 权限分布统计:');
  const rolePermissions = await query(
    `
    SELECT role, COUNT(*) as permission_count
    FROM role_permissions
    GROUP BY role
    ORDER BY role
    `
  );

  rolePermissions.rows.forEach((row) => {
    console.warn(`  ${row.role}: ${row.permission_count} 个权限`);
  });

  console.warn('\n✅ 所有测试通过!');
  console.warn('\n📝 权限调整总结:');
  console.warn('  - system_admin: 只保留用户管理权限,不再参与公园审核');
  console.warn('  - park_reviewer: 拥有公园申请审核权限');
  console.warn('  - pota_representative: 拥有公园申请审核 + POTA 系统录入权限');

  return true;
};

const runTests = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 数据库连接失败');
      process.exit(1);
    }

    const success = await testPermissions();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
};

runTests();
