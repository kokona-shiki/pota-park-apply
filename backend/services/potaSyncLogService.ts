import { query, getMany, insert } from '../config/database.js';
import * as notificationService from './notificationService.js';

type PotaSyncLogPark = {
  reference: string;
  name: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
};

type PotaSyncLogFilters = {
  startDate?: string;
  endDate?: string;
  operationType?: string;
  search?: string;
};

type PotaSyncLogPagination = {
  page?: number;
  pageSize?: number;
};

type SyncLogEntry = {
  id: number;
  operator: string;
  operationType: string;
  syncDate: string;
  parksImported: PotaSyncLogPark[] | string;
  status: string;
  details?: string;
  createdAt: string;
};

/**
 * 记录POTA同步日志
 */
export const logPotaSync = async (
  operator: string,
  operationType: string,
  parksImported: PotaSyncLogPark[],
  status: string,
  details: string | null = null
) => {
  try {
    const logEntry = await insert(
      `
      INSERT INTO pota_sync_logs (
        operator, operation_type, parks_imported, status, details
      ) VALUES ($1, $2, $3, $4, $5)
      `,
      [operator, operationType, parksImported, status, details]
    ) as { id: number };

    console.warn(
      `POTA同步日志记录成功: ID ${logEntry.id}, 操作人: ${operator}, 类型: ${operationType}, 状态: ${status}`
    );

    if (status === 'success') {
      const systemAdmins = await notificationService.getUsersByRole('system_admin');
      const potaReps = await notificationService.getUsersByRole('pota_representative');
      const notifyUserIds = [...new Set([...systemAdmins, ...potaReps])];

      if (notifyUserIds.length > 0) {
        await notificationService.createNotificationForUsers(
          notifyUserIds,
          'pota_data_sync',
          'POTA 数据同步完成',
          `POTA 数据同步任务已完成，共导入 ${parksImported.length} 个公园`,
          `/pota-sync-logs`
        );
      }
    }

    return logEntry;
  } catch (error) {
    console.error('记录POTA同步日志失败:', error.message);
    throw error;
  }
};

/**
 * 获取POTA同步日志列表
 */
export const getPotaSyncLogs = async (
  filters: PotaSyncLogFilters = {},
  pagination: PotaSyncLogPagination = {}
) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      startDate,
      endDate,
      operationType,
      search,
    } = { ...pagination, ...filters };

    const { whereClause, params, paramIndex } = buildWhereClause(startDate, endDate, operationType, search);
    const total = await getSyncLogsTotal(whereClause, params);
    const offset = calculateOffset(page, pageSize);
    const logs = await getSyncLogsData(whereClause, params, paramIndex, pageSize, offset);
    const parsedLogs = parseSyncLogs(logs);

    return {
      logs: parsedLogs,
      pagination: {
        page: Number.parseInt(String(page), 10),
        pageSize: Number.parseInt(String(pageSize), 10),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  } catch (error) {
    console.error('获取POTA同步日志失败:', error.message);
    throw error;
  }
};

/**
 * 构建 WHERE 子句
 */
const buildWhereClause = (
  startDate?: string,
  endDate?: string,
  operationType?: string,
  search?: string
) => {
  let whereClause = '';
  const params: Array<string | number> = [];
  let paramIndex = 1;

  if (startDate || endDate || operationType || search) {
    whereClause = 'WHERE ';
    
    // 添加日期范围过滤
    const { dateClause, dateParams, newParamIndex } = buildDateClause(paramIndex, startDate, endDate);
    whereClause += dateClause;
    params.push(...dateParams);
    paramIndex = newParamIndex;

    // 添加操作类型过滤
    const hasDateFilter = !!startDate || !!endDate;
    const { typeClause, typeParams, updatedParamIndex } = buildOperationTypeClause(paramIndex, operationType, hasDateFilter);
    whereClause += typeClause;
    params.push(...typeParams);
    paramIndex = updatedParamIndex;

    // 添加搜索过滤
    const hasOtherFilters = hasDateFilter || !!operationType;
    const { searchClause, searchParams, finalParamIndex } = buildSearchClause(paramIndex, search, hasOtherFilters);
    whereClause += searchClause;
    params.push(...searchParams);
    paramIndex = finalParamIndex;
  }

  return { whereClause, params, paramIndex };
};

/**
 * 构建日期范围过滤子句
 */
const buildDateClause = (
  paramIndex: number,
  startDate?: string,
  endDate?: string
) => {
  let clause = '';
  const params: Array<string | number> = [];
  let currentIndex = paramIndex;

  // 开始日期过滤
  if (startDate) {
    clause += `sync_date >= $${currentIndex} `;
    params.push(startDate);
    currentIndex++;
  }

  // 结束日期过滤
  if (endDate) {
    if (startDate) clause += 'AND ';
    clause += `sync_date <= $${currentIndex} `;
    params.push(endDate);
    currentIndex++;
  }

  return { dateClause: clause, dateParams: params, newParamIndex: currentIndex };
};

/**
 * 构建操作类型过滤子句
 */
const buildOperationTypeClause = (
  paramIndex: number,
  operationType?: string,
  hasDateFilter: boolean = false
) => {
  let clause = '';
  const params: Array<string | number> = [];
  let currentIndex = paramIndex;

  if (operationType) {
    if (hasDateFilter) clause += 'AND ';
    clause += `operation_type = $${currentIndex} `;
    params.push(operationType);
    currentIndex++;
  }

  return { typeClause: clause, typeParams: params, updatedParamIndex: currentIndex };
};

/**
 * 构建搜索过滤子句
 */
const buildSearchClause = (
  paramIndex: number,
  search?: string,
  hasOtherFilters: boolean = false
) => {
  let clause = '';
  const params: Array<string | number> = [];
  let currentIndex = paramIndex;

  if (search) {
    if (hasOtherFilters) clause += 'AND ';
    clause += `(operator ILIKE $${currentIndex} OR details ILIKE $${currentIndex}) `;
    params.push(`%${search}%`);
    currentIndex++;
  }

  return { searchClause: clause, searchParams: params, finalParamIndex: currentIndex };
};

/**
 * 获取同步日志总数
 */
const getSyncLogsTotal = async (whereClause: string, params: Array<string | number>): Promise<number> => {
  const countResult = await query(
    `SELECT COUNT(*) as total FROM pota_sync_logs ${whereClause}`,
    params
  );
  return Number.parseInt(countResult.rows[0]?.total || '0', 10);
};

/**
 * 计算分页偏移量
 */
const calculateOffset = (page: number, pageSize: number): number => {
  return (Number(page || 1) - 1) * Number(pageSize || 10);
};

/**
 * 获取同步日志数据
 */
const getSyncLogsData = async (
  whereClause: string,
  params: Array<string | number>,
  paramIndex: number,
  pageSize: number,
  offset: number
): Promise<SyncLogEntry[]> => {
  const orderBy = 'ORDER BY sync_date DESC';
  const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  const queryParams = [...params, pageSize, offset];

  return await getMany(
    `
    SELECT 
      id,
      operator,
      operation_type as "operationType",
      sync_date as "syncDate",
      parks_imported as "parksImported",
      status,
      details,
      created_at as "createdAt"
    FROM pota_sync_logs
    ${whereClause}
    ${orderBy}
    ${limitClause}
    `,
    queryParams
  );
};

/**
 * 解析同步日志数据
 */
const parseSyncLogs = (logs: SyncLogEntry[]): SyncLogEntry[] => {
  return logs.map(log => ({
    ...log,
    parksImported: typeof log.parksImported === 'string' 
      ? JSON.parse(log.parksImported) 
      : log.parksImported || []
  }));
};

/**
 * 获取单个POTA同步日志详情
 */
export const getPotaSyncLogById = async (logId: number) => {
  try {
    const result = await query(
      `
      SELECT 
        id,
        operator,
        operation_type as "operationType",
        sync_date as "syncDate",
        parks_imported as "parksImported",
        status,
        details,
        created_at as "createdAt"
      FROM pota_sync_logs
      WHERE id = $1
      `,
      [logId]
    );

    const log = result.rows[0] || null;
    
    // 确保 parksImported 字段是数组类型
    if (log) {
      log.parksImported = typeof log.parksImported === 'string' 
        ? JSON.parse(log.parksImported) 
        : log.parksImported || [];
    }

    return log;
  } catch (error) {
    console.error('获取POTA同步日志详情失败:', error.message);
    throw error;
  }
};

/**
 * 验证用户是否有查看POTA同步日志的权限
 */
export const hasPotaSyncLogPermission = async (userId: number) => {
  try {
    const result = await query(
      `
      SELECT COUNT(*) as count
      FROM users u
      JOIN role_permissions rp ON u.role = rp.role
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
        AND u.is_active = true
        AND p.permission_code = 'pota_import'
      `,
      [userId]
    );

    return Number.parseInt(result.rows[0]?.count || '0', 10) > 0;
  } catch (error) {
    console.error('检查POTA同步日志权限失败:', error.message);
    return false;
  }
};
