import { query, getMany, insert } from '../config/database.js';

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
    );

    console.log(
      `POTA同步日志记录成功: ID ${logEntry.id}, 操作人: ${operator}, 类型: ${operationType}, 状态: ${status}`
    );
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

    let whereClause = '';
    const params: Array<string | number> = [];
    let paramIndex = 1;

    // 构建过滤条件
    if (startDate || endDate || operationType || search) {
      whereClause = 'WHERE ';
      
      // 日期范围过滤
      if (startDate) {
        whereClause += `sync_date >= $${paramIndex} `;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        if (startDate) whereClause += 'AND ';
        whereClause += `sync_date <= $${paramIndex} `;
        params.push(endDate);
        paramIndex++;
      }

      // 操作类型过滤
      if (operationType) {
        if (startDate || endDate) whereClause += 'AND ';
        whereClause += `operation_type = $${paramIndex} `;
        params.push(operationType);
        paramIndex++;
      }

      // 搜索过滤
      if (search) {
        if (startDate || endDate || operationType) whereClause += 'AND ';
        whereClause += `(operator ILIKE $${paramIndex} OR details ILIKE $${paramIndex}) `;
        params.push(`%${search}%`);
        paramIndex++;
      }
    }

    // 获取总数用于分页
    const countResult = await query(
      `SELECT COUNT(*) as total FROM pota_sync_logs ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0].total, 10);

    // 计算偏移量
    const offset = (Number(page) - 1) * Number(pageSize);

    // 添加分页和排序
    const orderBy = 'ORDER BY sync_date DESC';
    const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const logs = await getMany(
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
      params
    );

    // 确保 parksImported 字段是数组类型
    const parsedLogs = logs.map(log => ({
      ...log,
      parksImported: typeof log.parksImported === 'string' 
        ? JSON.parse(log.parksImported) 
        : log.parksImported || []
    }));

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

    return Number.parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    console.error('检查POTA同步日志权限失败:', error.message);
    return false;
  }
};
