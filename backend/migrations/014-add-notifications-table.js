/**
 * 数据库迁移: 添加通知表
 *
 * 执行方式:
 * pnpm migrate:add-notifications-table
 */

import { query } from '../config/database.js';

export const addNotificationsTable = async () => {
  console.log('🚀 开始迁移：创建通知表和全局通知草稿表...');

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        link_url VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        is_global BOOLEAN DEFAULT false,
        notification_mode VARCHAR(20) DEFAULT 'normal' CHECK (notification_mode IN ('normal', 'popup')),
        popup_dismissed BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'withdrawn')),
        published_at TIMESTAMP WITH TIME ZONE,
        published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        scheduled_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
      ON notifications(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
      ON notifications(is_read)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
      ON notifications(created_at DESC)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_global 
      ON notifications(is_global)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_status 
      ON notifications(status)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_notification_mode 
      ON notifications(notification_mode)
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notification_drafts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        link_url VARCHAR(500),
        notification_mode VARCHAR(20) DEFAULT 'normal' CHECK (notification_mode IN ('normal', 'popup')),
        scheduled_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notification_drafts_created_by 
      ON notification_drafts(created_by)
    `);

    await query(`
      INSERT INTO permissions (permission_code, description)
      VALUES 
        ('create_global_notification', '创建全局通知'),
        ('edit_global_notification', '编辑全局通知'),
        ('publish_global_notification', '发布全局通知'),
        ('withdraw_global_notification', '撤回全局通知'),
        ('view_global_notifications', '查看全局通知列表')
      ON CONFLICT (permission_code) DO NOTHING
    `);

    await query(`
      INSERT INTO role_permissions (role, permission_id)
      SELECT 'system_admin', p.id
      FROM permissions p
      WHERE p.permission_code IN (
        'create_global_notification',
        'edit_global_notification',
        'publish_global_notification',
        'withdraw_global_notification',
        'view_global_notifications'
      )
      ON CONFLICT (role, permission_id) DO NOTHING
    `);

    await query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '13')
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    `);

    console.log('✅ 迁移完成：通知表和全局通知草稿表创建成功');
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

    await addNotificationsTable();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    process.exit(1);
  }
};

runMigration();
