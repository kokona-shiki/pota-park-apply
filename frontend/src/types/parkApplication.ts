// src/types/parkApplication.ts

/**
 * 申请状态
 */
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'pota_synced';

/**
 * 公园申请基础信息（列表用）
 */
export type ParkApplication = {
  id: number;
  park_name: string;
  province_name: string;
  status: ApplicationStatus;
  created_at: string;
  applicant_callsign?: string; // 申请者呼号（审核员可见，普通用户自己的申请可见）
  latitude?: number | string | null;
  longitude?: number | string | null;
  rejection_reason?: string | null;
  pota_notes?: string | null;
  pota_synced_at?: string | null;
};

/**
 * 公园申请详细信息（详情对话框用）
 */
export type ParkApplicationDetail = ParkApplication & {
  province_iso_code?: string;
  park_type?: string | null;
  website?: string | null;
  description?: string | null;
};

/**
 * 审核日志
 */
export type AuditLog = {
  id: number;
  action: string;
  operator_email: string;
  operator_callsign: string;
  operator_role: string;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
};

/**
 * 表格列配置
 */
export type TableColumnConfig = {
  showApplicantCallsign: boolean; // 是否显示申请者呼号列
  showActions: boolean; // 是否显示操作列
  showReviewButton: boolean; // 是否显示审核按钮（仅审核员和POTA代表）
};
