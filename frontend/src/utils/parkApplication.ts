// src/utils/parkApplication.ts
import type { ApplicationStatus, ParkApplication } from '../types/parkApplication';

/**
 * 格式化日期时间
 */
export function formatDateTime(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

/**
 * 获取状态元信息
 */
export function getStatusMeta(status: ApplicationStatus) {
  switch (status) {
    case 'pending':
      return { label: '待审核', color: 'warning' as const };
    case 'approved':
      return { label: '待上传', color: 'info' as const };
    case 'pota_pending_upload':
      return { label: '队列中', color: 'warning' as const };
    case 'pota_uploading':
      return { label: '上传中', color: 'info' as const };
    case 'pota_upload_failed':
      return { label: '上传失败', color: 'error' as const };
    case 'pota_uploaded':
      return { label: '已上传', color: 'success' as const };
    case 'pota_synced':
      return { label: '已同步', color: 'success' as const };
    case 'rejected':
      return { label: '未通过', color: 'error' as const };
    default:
      return { label: status, color: 'default' as const };
  }
}

/**
 * 截断文本
 */
export function truncateText(input: string, maxLen: number): string {
  const raw = String(input || '');
  if (raw.length <= maxLen) return raw;
  return raw.slice(0, maxLen).trimEnd() + '…';
}

/**
 * 将值转换为有限数字，如果无法转换则返回 null
 */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * 状态排序权重
 */
const STATUS_RANK: Record<ApplicationStatus, number> = {
  pending: 1,
  approved: 2,
  pota_pending_upload: 3,
  pota_uploading: 4,
  pota_upload_failed: 5,
  pota_uploaded: 6,
  pota_synced: 7,
  rejected: 8
};

/**
 * 获取可比较的值（用于排序）
 */
function getComparableValue(app: ParkApplication, orderBy: 'created_at' | 'park_name' | 'province_name' | 'status') {
  switch (orderBy) {
    case 'created_at':
      return new Date(app.created_at).getTime();
    case 'park_name':
      return app.park_name;
    case 'province_name':
      return app.province_name;
    case 'status':
      return STATUS_RANK[app.status] ?? 999;
    default:
      return '';
  }
}

/**
 * 比较函数（用于排序）
 */
function compare(a: ParkApplication, b: ParkApplication, orderBy: 'created_at' | 'park_name' | 'province_name' | 'status') {
  const va = getComparableValue(a, orderBy);
  const vb = getComparableValue(b, orderBy);

  if (typeof va === 'number' && typeof vb === 'number') {
    return va - vb;
  }

  return String(va).localeCompare(String(vb), 'zh-CN');
}

/**
 * 稳定排序
 */
export function stableSort(
  items: ParkApplication[],
  order: 'asc' | 'desc',
  orderBy: 'created_at' | 'park_name' | 'province_name' | 'status'
): ParkApplication[] {
  const stabilized = items.map((el, index) => [el, index] as const);
  stabilized.sort((a, b) => {
    const cmp = compare(a[0], b[0], orderBy);
    if (cmp !== 0) return order === 'asc' ? cmp : -cmp;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}
