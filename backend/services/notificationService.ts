import { insert, update, getOne, getMany, query, transaction } from '../config/database.js';
import { checkUserPermission } from '../utils/auth.js';

type NotificationCreateInput = {
  type: string;
  title: string;
  description: string;
  linkUrl?: string | null;
  userId?: number | null;
  isGlobal?: boolean;
  notificationMode?: string;
  metadata?: Record<string, unknown> | null;
  scheduledAt?: string | null;
};

type NotificationDraftCreateInput = {
  title: string;
  description: string;
  linkUrl?: string | null;
  notificationMode: string;
  scheduledAt?: string | null;
  createdBy: number;
};

type NotificationDraftUpdateInput = {
  title?: string;
  description?: string;
  linkUrl?: string | null;
  notificationMode?: string;
  scheduledAt?: string | null;
};

export const createNotification = async (input: NotificationCreateInput) => {
  const {
    type,
    title,
    description,
    linkUrl,
    userId = null,
    isGlobal = false,
    notificationMode = 'normal',
    metadata = null,
    scheduledAt = null,
  } = input;

  const notification = await insert(
    `
    INSERT INTO notifications (
      user_id, type, title, description, link_url,
      is_global, notification_mode, metadata, scheduled_at, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
    [
      userId,
      type,
      title,
      description,
      linkUrl,
      isGlobal,
      notificationMode,
      metadata ? JSON.stringify(metadata) : null,
      scheduledAt,
      'published',
    ]
  );

  return notification;
};

export const createNotificationForUsers = async (
  userIds: number[],
  type: string,
  title: string,
  description: string,
  linkUrl?: string | null,
  metadata?: Record<string, unknown> | null
) => {
  if (userIds.length === 0) return [];

  const values = userIds
    .map(
      (_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
    )
    .join(', ');

  const params = userIds.flatMap((userId) => [
    userId,
    type,
    title,
    description,
    linkUrl,
  ]);

  const notifications = await query(
    `
    INSERT INTO notifications (
      user_id, type, title, description, link_url, metadata
    ) VALUES ${values}
    RETURNING *
    `,
    params
  );

  return notifications.rows;
};

export const getNotifications = async (
  userId: number,
  filters: {
    type?: string;
    isRead?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
) => {
  const { type, isRead, page = 1, pageSize = 20 } = filters;

  let whereClause = 'WHERE user_id = $1';
  const params: (string | number | boolean)[] = [userId];
  let paramIndex = 2;

  if (type) {
    whereClause += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (isRead !== undefined) {
    whereClause += ` AND is_read = $${paramIndex}`;
    params.push(isRead);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
    params
  );
  const total = Number.parseInt(countResult.rows[0].total, 10);

  const offset = (page - 1) * pageSize;

  const notifications = await getMany(
    `
    SELECT * FROM notifications
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...params, pageSize, offset]
  );

  return {
    notifications,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

export const getGlobalNotifications = async (filters: {
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) => {
  const { status, page = 1, pageSize = 20 } = filters;

  let whereClause = 'WHERE is_global = true';
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(DISTINCT title, description, published_at, published_by) as total FROM notifications ${whereClause}`,
    params
  );
  const total = Number.parseInt(countResult.rows[0].total, 10);

  const offset = (page - 1) * pageSize;

  const notifications = await getMany(
    `
    SELECT DISTINCT ON (n.title, n.description, n.published_at, n.published_by) n.*, 
           u.email as published_by_email,
           u.callsign as published_by_callsign
    FROM notifications n
    LEFT JOIN users u ON n.published_by = u.id
    ${whereClause}
    ORDER BY n.title, n.description, n.published_at, n.published_by, n.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...params, pageSize, offset]
  );

  return {
    notifications,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

export const getNotificationById = async (notificationId: number) => {
  const notification = await getOne(
    `
    SELECT * FROM notifications WHERE id = $1
    `,
    [notificationId]
  );

  return notification;
};

export const getUnreadCount = async (userId: number) => {
  const result = await query(
    `
    SELECT COUNT(*) as unread_count 
    FROM notifications 
    WHERE user_id = $1 AND is_read = false
    `,
    [userId]
  );

  return Number.parseInt(result.rows[0].unread_count, 10);
};

export const markAsRead = async (notificationId: number, userId: number) => {
  const notification = await getOne(
    `
    SELECT * FROM notifications WHERE id = $1 AND user_id = $2
    `,
    [notificationId, userId]
  );

  if (!notification) {
    throw new Error('通知不存在或无权访问');
  }

  await update(
    `
    UPDATE notifications 
    SET is_read = true 
    WHERE id = $1
    `,
    [notificationId]
  );

  return notification;
};

export const markAllAsRead = async (userId: number) => {
  await query(
    `
    UPDATE notifications 
    SET is_read = true 
    WHERE user_id = $1 AND is_read = false
    `,
    [userId]
  );

  return { success: true };
};

export const dismissPopup = async (notificationId: number, userId: number) => {
  const notification = await getOne(
    `
    SELECT * FROM notifications WHERE id = $1 AND user_id = $2
    `,
    [notificationId, userId]
  );

  if (!notification) {
    throw new Error('通知不存在或无权访问');
  }

  await update(
    `
    UPDATE notifications 
    SET is_read = true, popup_dismissed = true 
    WHERE id = $1
    `,
    [notificationId]
  );

  return notification;
};

export const getPopupNotification = async (userId: number) => {
  const notification = await getOne(
    `
    SELECT * FROM notifications 
    WHERE user_id = $1 
      AND notification_mode = 'popup' 
      AND popup_dismissed = false 
      AND is_read = false
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId]
  );

  return notification;
};

export const getUsersByRole = async (role: string) => {
  const users = await getMany(
    `
    SELECT id FROM users WHERE role = $1 AND is_active = true
    `,
    [role]
  );

  return users.map((u) => u.id);
};

export const createDraft = async (input: NotificationDraftCreateInput) => {
  const { title, description, linkUrl, notificationMode, scheduledAt, createdBy } = input;

  const draft = await insert(
    `
    INSERT INTO notification_drafts (
      title, description, link_url, notification_mode, scheduled_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [title, description, linkUrl, notificationMode, scheduledAt, createdBy]
  );

  return draft;
};

export const getDrafts = async (createdBy: number) => {
  const drafts = await getMany(
    `
    SELECT * FROM notification_drafts 
    WHERE created_by = $1 
    ORDER BY created_at DESC
    `,
    [createdBy]
  );

  return drafts;
};

export const getDraftById = async (draftId: number, createdBy: number) => {
  const draft = await getOne(
    `
    SELECT * FROM notification_drafts 
    WHERE id = $1 AND created_by = $2
    `,
    [draftId, createdBy]
  );

  return draft;
};

export const updateDraft = async (
  draftId: number,
  createdBy: number,
  input: NotificationDraftUpdateInput
) => {
  const { title, description, linkUrl, notificationMode, scheduledAt } = input;

  const updates: string[] = [];
  const params: (string | number | null)[] = [draftId, createdBy];
  let paramIndex = 3;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(title);
    paramIndex++;
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(description);
    paramIndex++;
  }

  if (linkUrl !== undefined) {
    updates.push(`link_url = $${paramIndex}`);
    params.push(linkUrl);
    paramIndex++;
  }

  if (notificationMode !== undefined) {
    updates.push(`notification_mode = $${paramIndex}`);
    params.push(notificationMode);
    paramIndex++;
  }

  if (scheduledAt !== undefined) {
    updates.push(`scheduled_at = $${paramIndex}`);
    params.push(scheduledAt);
    paramIndex++;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const draft = await query(
    `
    UPDATE notification_drafts 
    SET ${updates.join(', ')}
    WHERE id = $1 AND created_by = $2
    RETURNING *
    `,
    params
  );

  return draft.rows[0];
};

export const deleteDraft = async (draftId: number, createdBy: number) => {
  await query(
    `
    DELETE FROM notification_drafts 
    WHERE id = $1 AND created_by = $2
    `,
    [draftId, createdBy]
  );

  return { success: true };
};

export const publishDraft = async (
  draftId: number,
  createdBy: number,
  publishedBy: number
) => {
  const draft = await getOne(
    `
    SELECT * FROM notification_drafts 
    WHERE id = $1 AND created_by = $2
    `,
    [draftId, createdBy]
  );

  if (!draft) {
    throw new Error('草稿不存在或无权访问');
  }

  return await transaction(async (client) => {
    const users = await client.query(
      `
      SELECT id FROM users WHERE is_active = true
      `
    );

    const userIds = users.rows.map((u) => u.id);

    if (draft.scheduled_at) {
      await client.query(
        `
        INSERT INTO notifications (
          user_id, type, title, description, link_url,
          is_global, notification_mode, metadata, scheduled_at, status,
          published_at, published_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          null,
          'global_notification',
          draft.title,
          draft.description,
          draft.link_url,
          true,
          draft.notification_mode,
          null,
          draft.scheduled_at,
          'draft',
          null,
          null,
        ]
      );
    } else {
      const publishedAt = new Date().toISOString();
      for (const userId of userIds) {
        await client.query(
          `
          INSERT INTO notifications (
            user_id, type, title, description, link_url,
            is_global, notification_mode, metadata, status,
            published_at, published_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            userId,
            'global_notification',
            draft.title,
            draft.description,
            draft.link_url,
            true,
            draft.notification_mode,
            null,
            'published',
            publishedAt,
            publishedBy,
          ]
        );
      }
    }

    await client.query(
      `
      DELETE FROM notification_drafts WHERE id = $1
      `,
      [draftId]
    );

    return { success: true };
  });
};

export const publishGlobalNotification = async (
  input: NotificationCreateInput,
  publishedBy: number
) => {
  const {
    type,
    title,
    description,
    linkUrl,
    notificationMode = 'normal',
    scheduledAt = null,
    metadata = null,
  } = input;

  return await transaction(async (client) => {
    const users = await client.query(
      `
      SELECT id FROM users WHERE is_active = true
      `
    );

    const userIds = users.rows.map((u) => u.id);

    if (scheduledAt) {
      await client.query(
        `
        INSERT INTO notifications (
          user_id, type, title, description, link_url,
          is_global, notification_mode, metadata, scheduled_at, status,
          published_at, published_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          null,
          type,
          title,
          description,
          linkUrl,
          true,
          notificationMode,
          metadata ? JSON.stringify(metadata) : null,
          scheduledAt,
          'draft',
          null,
          null,
        ]
      );
    } else {
      const publishedAt = new Date().toISOString();
      for (const userId of userIds) {
        await client.query(
          `
          INSERT INTO notifications (
            user_id, type, title, description, link_url,
            is_global, notification_mode, metadata, status,
            published_at, published_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            userId,
            type,
            title,
            description,
            linkUrl,
            true,
            notificationMode,
            metadata ? JSON.stringify(metadata) : null,
            'published',
            publishedAt,
            publishedBy,
          ]
        );
      }
    }

    return { success: true };
  });
};

export const withdrawNotification = async (
  notificationId: number,
  reason?: string | null
) => {
  const notification = await getOne(
    `
    SELECT * FROM notifications WHERE id = $1 AND is_global = true
    `,
    [notificationId]
  );

  if (!notification) {
    throw new Error('通知不存在或不是全局通知');
  }

  await update(
    `
    UPDATE notifications 
    SET status = 'withdrawn', metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), 'withdraw_reason', to_jsonb($2))
    WHERE id = $1
    `,
    [notificationId, reason]
  );

  return notification;
};

export const publishScheduledNotifications = async () => {
  const result = await query(
    `
    UPDATE notifications 
    SET status = 'published', 
        published_at = CURRENT_TIMESTAMP
    WHERE status = 'draft' 
      AND scheduled_at IS NOT NULL 
      AND scheduled_at <= CURRENT_TIMESTAMP
    RETURNING *
    `,
    []
  );

  console.log(`发布定时通知: ${result.rows.length} 条`);

  for (const notification of result.rows) {
    const users = await getMany(
      `
      SELECT id FROM users WHERE is_active = true
      `
    );

    const userIds = users.map((u) => u.id);

    for (const userId of userIds) {
      await insert(
        `
        INSERT INTO notifications (
          user_id, type, title, description, link_url,
          is_global, notification_mode, metadata, status,
          published_at, published_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          userId,
          notification.type,
          notification.title,
          notification.description,
          notification.link_url,
          true,
          notification.notification_mode,
          notification.metadata,
          'published',
          notification.published_at,
          notification.published_by,
        ]
      );
    }
  }

  await query(
    `
    DELETE FROM notifications WHERE id IN (
      SELECT id FROM notifications 
      WHERE status = 'draft' 
        AND scheduled_at IS NOT NULL 
        AND scheduled_at <= CURRENT_TIMESTAMP
    )
    `
  );

  return { published: result.rows.length };
};
