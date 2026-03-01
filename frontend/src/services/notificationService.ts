import { apiClient, requestWithSchema } from './apiClient';
import { z } from 'zod';

const notificationService = {
  /**
   * 获取通知列表
   */
  getNotifications: async () => {
    return requestWithSchema(
      apiClient.get('/api/notifications'),
      z.array(z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        read: z.boolean(),
        created_at: z.string(),
      }))
    );
  },

  /**
   * 获取未读通知数量
   */
  getUnreadCount: async () => {
    return requestWithSchema(
      apiClient.get('/api/notifications/unread-count'),
      z.object({
        count: z.number(),
      })
    );
  },

  /**
   * 获取弹窗通知
   */
  getPopupNotifications: async () => {
    return requestWithSchema(
      apiClient.get('/api/notifications/popup'),
      z.object({
        notification: z.object({
          id: z.number(),
          title: z.string(),
          content: z.string(),
          type: z.string(),
          created_at: z.string(),
        }).nullable()
      })
    );
  },

  /**
   * 获取通知详情
   */
  getNotificationById: async (id: number) => {
    return requestWithSchema(
      apiClient.get(`/api/notifications/${id}`),
      z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        read: z.boolean(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 标记通知为已读
   */
  markAsRead: async (id: number) => {
    return requestWithSchema(
      apiClient.put(`/api/notifications/${id}/read`),
      z.object({
        success: z.boolean(),
      })
    );
  },

  /**
   * 标记所有通知为已读
   */
  markAllAsRead: async () => {
    return requestWithSchema(
      apiClient.put('/api/notifications/read-all'),
      z.object({
        success: z.boolean(),
      })
    );
  },

  /**
   * 创建全局通知
   */
  createGlobalNotification: async (data: {
    title: string;
    content: string;
    type: string;
    target_roles?: string[];
  }) => {
    return requestWithSchema(
      apiClient.post('/api/notifications', data),
      z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 创建通知草稿
   */
  createNotificationDraft: async (data: {
    title: string;
    content: string;
    type: string;
    target_roles?: string[];
  }) => {
    return requestWithSchema(
      apiClient.post('/api/notifications/drafts', data),
      z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 获取通知草稿列表
   */
  getNotificationDrafts: async () => {
    return requestWithSchema(
      apiClient.get('/api/notifications/drafts'),
      z.array(z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        created_at: z.string(),
      }))
    );
  },

  /**
   * 获取通知草稿详情
   */
  getNotificationDraftById: async (id: number) => {
    return requestWithSchema(
      apiClient.get(`/api/notifications/drafts/${id}`),
      z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        target_roles: z.array(z.string()).nullable(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 更新通知草稿
   */
  updateNotificationDraft: async (id: number, data: {
    title: string;
    content: string;
    type: string;
    target_roles?: string[];
  }) => {
    return requestWithSchema(
      apiClient.put(`/api/notifications/drafts/${id}`, data),
      z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 删除通知草稿
   */
  deleteNotificationDraft: async (id: number) => {
    return requestWithSchema(
      apiClient.delete(`/api/notifications/drafts/${id}`),
      z.object({
        success: z.boolean(),
      })
    );
  },

  /**
   * 发布通知草稿
   */
  publishNotificationDraft: async (id: number) => {
    return requestWithSchema(
      apiClient.post(`/api/notifications/drafts/${id}/publish`),
      z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 撤回通知
   */
  withdrawNotification: async (id: number) => {
    return requestWithSchema(
      apiClient.post(`/api/notifications/${id}/withdraw`),
      z.object({
        success: z.boolean(),
      })
    );
  },

  /**
   * 获取全局通知列表
   */
  getGlobalNotifications: async () => {
    return requestWithSchema(
      apiClient.get('/api/notifications/global'),
      z.array(z.object({
        id: z.number(),
        title: z.string(),
        content: z.string(),
        type: z.string(),
        created_at: z.string(),
        created_by: z.string(),
      }))
    );
  },
};

export default notificationService;
