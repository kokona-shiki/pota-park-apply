import { query, getMany, insert } from '../config/database.js';

/**
 * 记录POTA同步日志
 */
export const logPotaSync = async (
  operator,
  operationType,
  parksImported,
  status,
  details = null
) => {
  try {
    const logEntry = await insert(
      `
      INSERT INTO pota_sync_logs (
        operator, operation_type, parks_imported, status, details
      ) VALUES ($1, $2, $3, $4, $5)
      `,
      [operator, operationType, JSON.stringify(parksImported), status, details]
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
export const getPotaSyncLogs = async (filters = {}, pagination = {}) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      startDate,
      endDate,
      operationType,
    } = { ...pagination, ...filters };

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    // 构建过滤条件
    if (startDate || endDate) {
      if (startDate) {
        whereClause += `WHERE sync_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        const endCondition = startDate ? ' AND sync_date <= $' : 'WHERE sync_date <= $';
        whereClause += `${endCondition}${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
    }

    if (operationType) {
      const condition = whereClause ? ' AND operation_type = $' : 'WHERE operation_type = $';
      whereClause += `${condition}${paramIndex}`;
      params.push(operationType);
      paramIndex++;
    }

    // 获取总数用于分页
    const countResult = await query(
      `SELECT COUNT(*) as total FROM pota_sync_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 添加分页和排序
    const orderBy = 'ORDER BY sync_date DESC';
    const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const logs = await getMany(
      `
      SELECT 
        id,
        operator,
        operation_type as operationType,
        sync_date as syncDate,
        parks_imported as parksImported,
        status,
        details,
        created_at as createdAt
      FROM pota_sync_logs
      ${whereClause}
      ${orderBy}
      ${limitClause}
      `,
      params
    );

    return {
      logs,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize),
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
export const getPotaSyncLogById = async (logId) => {
  try {
    const log = await query(
      `
      SELECT 
        id,
        operator,
        operation_type as operationType,
        sync_date as syncDate,
        parks_imported as parksImported,
        status,
        details,
        created_at as createdAt
      FROM pota_sync_logs
      WHERE id = $1
      `,
      [logId]
    );

    return log.rows[0] || null;
  } catch (error) {
    console.error('获取POTA同步日志详情失败:', error.message);
    throw error;
  }
};

/**
 * 验证用户是否有查看POTA同步日志的权限
 */
export const hasPotaSyncLogPermission = async (userId) => {
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

    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('检查POTA同步日志权限失败:', error.message);
    return false;
  }
};
