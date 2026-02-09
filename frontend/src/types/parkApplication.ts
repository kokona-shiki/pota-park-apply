// src/types/parkApplication.ts

import type { z } from 'zod';
import {
  ApplicationStatusSchema,
  AuditLogSchema,
  ParkApplicationDetailSchema,
  ParkApplicationSchema,
} from '../../../shared/schemas/parkApplication';

/**
 * 申请状态
 */
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

/**
 * 公园申请基础信息（列表用）
 */
export type ParkApplication = z.infer<typeof ParkApplicationSchema>;

/**
 * 公园申请详细信息（详情对话框用）
 */
export type ParkApplicationDetail = z.infer<typeof ParkApplicationDetailSchema>;

/**
 * 审核日志
 */
export type AuditLog = z.infer<typeof AuditLogSchema>;

/**
 * 排序方向
 */
export type Order = 'asc' | 'desc';

/**
 * 排序字段
 */
export type OrderBy = 'created_at' | 'park_name' | 'province_name' | 'status';

/**
 * 表格列配置
 */
export type TableColumnConfig = {
  showApplicantCallsign: boolean; // 是否显示申请者呼号列
  showActions: boolean; // 是否显示操作列
  showReviewButton: boolean; // 是否显示审核按钮（仅审核员和POTA代表）
};
