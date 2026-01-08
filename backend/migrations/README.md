# 数据库迁移说明

本目录包含数据库迁移脚本,用于在不重建数据库的情况下更新数据库结构和数据。

## 可用的迁移脚本

### 001-remove-system-admin-review-permissions.js

**功能**: 移除 system_admin 角色的公园审核权限

**背景**:
根据需求调整,系统管理员 (system_admin) 应该只负责用户管理相关的事情,不应该参与公园的审核流程。

**执行方式**:
```bash
cd backend
pnpm migrate:remove-admin-review-permissions
```

**变更内容**:
- 从 system_admin 角色移除以下权限:
  - `review_application`: 审核申请
  - `remind_review`: 提醒审核
  - `sync_to_pota`: 将公园数据录入到POTA系统

**保留的 system_admin 权限**:
- 用户管理相关:
  - `create_user`: 创建用户
  - `modify_user_info`: 修改用户信息
  - `modify_user_role`: 修改用户角色
  - `delete_user`: 删除用户
  - `approve_callsign_change`: 批准呼号变更
  - `view_all_users`: 查看所有用户
- 公园申请相关(只读):
  - `submit_application`: 发起申请
  - `view_application_list`: 查看申请列表
  - `view_application_detail`: 查看申请详情

## 验证测试

迁移完成后,可以运行测试脚本验证权限配置:
```bash
cd backend
node test/test-permissions.js
```

## 注意事项

1. **数据库备份**: 执行迁移前建议先备份数据库
2. **权限影响**: 修改后,所有 system_admin 用户将无法再审核公园申请
3. **前端同步**: 前端代码已同步更新权限判断逻辑

## 回滚方案

如需回滚此迁移,需要手动将权限添加回 system_admin 角色:
```sql
INSERT INTO role_permissions (role, permission_id)
SELECT 'system_admin', id FROM permissions
WHERE permission_code IN ('review_application', 'remind_review', 'sync_to_pota')
ON CONFLICT (role, permission_id) DO NOTHING;
```
