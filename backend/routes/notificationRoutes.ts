import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as notificationService from '../services/notificationService.js';
import { sendBizError, sendError, sendOk } from '../utils/response.js';
import {
  NotificationCreateSchema,
  NotificationDraftCreateSchema,
  NotificationDraftUpdateSchema,
  NotificationUpdateSchema,
} from '../../shared/schemas/notification.js';

const router = express.Router();

router.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
    }

    const { type, isRead, page, pageSize } = req.query;
    const filters: {
      type?: string;
      isRead?: boolean;
      page?: number;
      pageSize?: number;
    } = {};

    if (type) filters.type = String(type);
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (page) filters.page = Number.parseInt(String(page), 10);
    if (pageSize) filters.pageSize = Number.parseInt(String(pageSize), 10);

    const result = await notificationService.getNotifications(userId, filters);

    return sendOk(res, result, '获取通知列表成功');
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return sendError(res, error, { bizMessage: '获取通知列表失败' });
  }
});

router.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
    }

    const unreadCount = await notificationService.getUnreadCount(userId);

    return sendOk(res, { unread_count: unreadCount }, '获取未读数量成功');
  } catch (error) {
    console.error('获取未读数量失败:', error);
    return sendError(res, error, { bizMessage: '获取未读数量失败' });
  }
});

router.get('/api/notifications/popup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
    }

    const notification = await notificationService.getPopupNotification(userId);

    return sendOk(res, { notification }, '获取弹窗通知成功');
  } catch (error) {
    console.error('获取弹窗通知失败:', error);
    return sendError(res, error, { bizMessage: '获取弹窗通知失败' });
  }
});

router.get('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
    }

    const { id } = req.params;
    const notificationId = Number.parseInt(id, 10);

    const notification = await notificationService.getNotificationById(notificationId);

    if (!notification) {
      return sendBizError(res, 'NOT_FOUND', '通知不存在', null);
    }

    if (notification.user_id !== userId && !notification.is_global) {
      return sendBizError(res, 'FORBIDDEN', '无权访问此通知', null);
    }

    return sendOk(res, { notification }, '获取通知详情成功');
  } catch (error) {
    console.error('获取通知详情失败:', error);
    return sendError(res, error, { bizMessage: '获取通知详情失败' });
  }
});

router.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
    }

    const { id } = req.params;
    const notificationId = Number.parseInt(id, 10);

    const notification = await notificationService.markAsRead(notificationId, userId);

    return sendOk(res, { notification }, '标记已读成功');
  } catch (error) {
    console.error('标记已读失败:', error);
    return sendError(res, error, { bizMessage: '标记已读失败' });
  }
});

router.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
    }

    const result = await notificationService.markAllAsRead(userId);

    return sendOk(res, result, '全部标记已读成功');
  } catch (error) {
    console.error('全部标记已读失败:', error);
    return sendError(res, error, { bizMessage: '全部标记已读失败' });
  }
});

router.put('/api/notifications/:id/dismiss-popup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
    }

    const { id } = req.params;
    const notificationId = Number.parseInt(id, 10);

    const notification = await notificationService.dismissPopup(notificationId, userId);

    return sendOk(res, { notification }, '关闭弹窗成功');
  } catch (error) {
    console.error('关闭弹窗失败:', error);
    return sendError(res, error, { bizMessage: '关闭弹窗失败' });
  }
});

router.post(
  '/api/notifications',
  authenticateToken,
  requirePermission('create_global_notification'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
      }

      const parsed = NotificationCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的请求数据', {
          errors: parsed.error.issues,
        });
      }

      const { type, title, description, link_url, notification_mode, scheduled_at } = parsed.data;

      const result = await notificationService.publishGlobalNotification(
        {
          type,
          title,
          description,
          linkUrl: link_url,
          notificationMode: notification_mode,
          scheduledAt: scheduled_at,
          isGlobal: true,
        },
        userId
      );

      return sendOk(res, result, '发布全局通知成功');
    } catch (error) {
      console.error('发布全局通知失败:', error);
      return sendError(res, error, { bizMessage: '发布全局通知失败' });
    }
  }
);

router.post(
  '/api/notifications/drafts',
  authenticateToken,
  requirePermission('create_global_notification'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
      }

      const parsed = NotificationDraftCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的请求数据', {
          errors: parsed.error.issues,
        });
      }

      const { title, description, link_url, notification_mode, scheduled_at } = parsed.data;

      const draft = await notificationService.createDraft({
        title,
        description,
        linkUrl: link_url,
        notificationMode: notification_mode,
        scheduledAt: scheduled_at,
        createdBy: userId,
      });

      return sendOk(res, { draft }, '创建草稿成功');
    } catch (error) {
      console.error('创建草稿失败:', error);
      return sendError(res, error, { bizMessage: '创建草稿失败' });
    }
  }
);

router.get(
  '/api/notifications/drafts',
  authenticateToken,
  requirePermission('view_global_notifications'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
      }

      const drafts = await notificationService.getDrafts(userId);

      return sendOk(res, { drafts }, '获取草稿列表成功');
    } catch (error) {
      console.error('获取草稿列表失败:', error);
      return sendError(res, error, { bizMessage: '获取草稿列表失败' });
    }
  }
);

router.get(
  '/api/notifications/drafts/:id',
  authenticateToken,
  requirePermission('view_global_notifications'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
      }

      const { id } = req.params;
      const draftId = Number.parseInt(id, 10);

      const draft = await notificationService.getDraftById(draftId, userId);

      if (!draft) {
        return sendBizError(res, 'NOT_FOUND', '草稿不存在', null);
      }

      return sendOk(res, { draft }, '获取草稿详情成功');
    } catch (error) {
      console.error('获取草稿详情失败:', error);
      return sendError(res, error, { bizMessage: '获取草稿详情失败' });
    }
  }
);

router.put(
  '/api/notifications/drafts/:id',
  authenticateToken,
  requirePermission('edit_global_notification'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
      }

      const { id } = req.params;
      const draftId = Number.parseInt(id, 10);

      const parsed = NotificationDraftUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的请求数据', {
          errors: parsed.error.issues,
        });
      }

      const draft = await notificationService.updateDraft(draftId, userId, parsed.data);

      if (!draft) {
        return sendBizError(res, 'NOT_FOUND', '草稿不存在', null);
      }

      return sendOk(res, { draft }, '更新草稿成功');
    } catch (error) {
      console.error('更新草稿失败:', error);
      return sendError(res, error, { bizMessage: '更新草稿失败' });
    }
  }
);

router.delete(
  '/api/notifications/drafts/:id',
  authenticateToken,
  requirePermission('edit_global_notification'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
      }

      const { id } = req.params;
      const draftId = Number.parseInt(id, 10);

      await notificationService.deleteDraft(draftId, userId);

      return sendOk(res, { success: true }, '删除草稿成功');
    } catch (error) {
      console.error('删除草稿失败:', error);
      return sendError(res, error, { bizMessage: '删除草稿失败' });
    }
  }
);

router.post(
  '/api/notifications/drafts/:id/publish',
  authenticateToken,
  requirePermission('publish_global_notification'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendBizError(res, 'UNAUTHORIZED', '未登录', null);
      }

      const { id } = req.params;
      const draftId = Number.parseInt(id, 10);

      const result = await notificationService.publishDraft(draftId, userId, userId);

      return sendOk(res, result, '发布草稿成功');
    } catch (error) {
      console.error('发布草稿失败:', error);
      return sendError(res, error, { bizMessage: '发布草稿失败' });
    }
  }
);

router.post(
  '/api/notifications/:id/withdraw',
  authenticateToken,
  requirePermission('withdraw_global_notification'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const notificationId = Number.parseInt(id, 10);

      const { reason } = req.body;

      const notification = await notificationService.withdrawNotification(notificationId, reason);

      return sendOk(res, { notification }, '撤回通知成功');
    } catch (error) {
      console.error('撤回通知失败:', error);
      return sendError(res, error, { bizMessage: '撤回通知失败' });
    }
  }
);

router.get(
  '/api/notifications/global',
  authenticateToken,
  requirePermission('view_global_notifications'),
  async (req, res) => {
    try {
      const { status, page, pageSize } = req.query;
      const filters: {
        status?: string;
        page?: number;
        pageSize?: number;
      } = {};

      if (status) filters.status = String(status);
      if (page) filters.page = Number.parseInt(String(page), 10);
      if (pageSize) filters.pageSize = Number.parseInt(String(pageSize), 10);

      const result = await notificationService.getGlobalNotifications(filters);

      return sendOk(res, result, '获取全局通知列表成功');
    } catch (error) {
      console.error('获取全局通知列表失败:', error);
      return sendError(res, error, { bizMessage: '获取全局通知列表失败' });
    }
  }
);

export default router;
