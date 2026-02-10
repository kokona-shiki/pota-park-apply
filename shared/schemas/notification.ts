import { z } from 'zod';
import { createApiResponseSchema } from './common.js';

export const NotificationModeSchema = z.union([z.literal('normal'), z.literal('popup')]);

export const NotificationStatusSchema = z.union([
  z.literal('draft'),
  z.literal('published'),
  z.literal('withdrawn'),
]);

export const NotificationTypeSchema = z.union([
  z.literal('park_application_status_change'),
  z.literal('user_management_operation'),
  z.literal('pota_data_sync'),
  z.literal('callsign_change_request'),
  z.literal('global_notification'),
]);

export const NotificationSchema = z.object({
  id: z.number(),
  user_id: z.number().nullable(),
  type: NotificationTypeSchema,
  title: z.string(),
  description: z.string(),
  link_url: z.string().nullable().optional(),
  is_read: z.boolean(),
  created_at: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  is_global: z.boolean().optional(),
  notification_mode: NotificationModeSchema.optional(),
  popup_dismissed: z.boolean().optional(),
  status: NotificationStatusSchema.optional(),
  published_at: z.string().nullable().optional(),
  published_by: z.number().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsDataSchema = z.object({
  notifications: z.array(NotificationSchema).optional(),
});

export const NotificationCreateSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  link_url: z.string().url().optional().or(z.literal('')),
  notification_mode: NotificationModeSchema.default('normal'),
  scheduled_at: z.string().optional(),
});

export const NotificationDraftSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  link_url: z.string().nullable().optional(),
  notification_mode: NotificationModeSchema,
  scheduled_at: z.string().nullable().optional(),
  created_by: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type NotificationDraft = z.infer<typeof NotificationDraftSchema>;

export const NotificationDraftsDataSchema = z.object({
  drafts: z.array(NotificationDraftSchema).optional(),
});

export const NotificationDraftCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  link_url: z.string().url().optional().or(z.literal('')),
  notification_mode: NotificationModeSchema.default('normal'),
  scheduled_at: z.string().optional(),
});

export const NotificationDraftUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  link_url: z.string().url().optional().or(z.literal('')),
  notification_mode: NotificationModeSchema.optional(),
  scheduled_at: z.string().optional(),
});

export const NotificationUpdateSchema = z.object({
  is_read: z.boolean(),
});

export const NotificationUnreadCountSchema = z.object({
  unread_count: z.number(),
});

export const NotificationPublishSchema = z.object({
  status: NotificationStatusSchema,
});

export const NotificationWithdrawSchema = z.object({
  reason: z.string().optional(),
});

export const NotificationsResponseSchema = createApiResponseSchema(NotificationsDataSchema);
export const NotificationResponseSchema = createApiResponseSchema(
  z.object({
    notification: NotificationSchema.nullable().optional(),
  })
);
export const NotificationDraftsResponseSchema = createApiResponseSchema(NotificationDraftsDataSchema);
export const NotificationDraftResponseSchema = createApiResponseSchema(
  z.object({
    draft: NotificationDraftSchema.nullable().optional(),
  })
);
export const NotificationUnreadCountResponseSchema = createApiResponseSchema(NotificationUnreadCountSchema);
