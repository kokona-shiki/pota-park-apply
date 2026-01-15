import { insert, getOne, getMany, transaction } from '../config/database.js';
import { checkUserPermission } from '../utils/auth.js';
import { resolveParkTypeId } from './potaImportService.js';

// 提交公园申请
export const submitParkApplication = async (userId, applicationData) => {
  const {
    park_name,
    park_type,
    provinces, // 省份数组
    latitude,
    longitude,
    website,
    description,
    access_methods,
    activation_methods,
    confirmed_authenticity,
  } = applicationData;

  // 检查权限
  const canSubmit = await checkUserPermission(userId, 'submit_application');
  if (!canSubmit) {
    const err = new Error('没有权限提交申请');
    // 鉴权/鉴权相关错误：返回 4xx
    // eslint-disable-next-line no-param-reassign
    err.status = 403;
    // eslint-disable-next-line no-param-reassign
    err.code = 'FORBIDDEN';
    throw err;
  }

  // 验证访问方法和激活方法格式
  if (!Array.isArray(access_methods) || access_methods.length === 0) {
    const err = new Error('至少需要选择一个访问方法');
    // eslint-disable-next-line no-param-reassign
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (!Array.isArray(activation_methods) || activation_methods.length === 0) {
    const err = new Error('至少需要选择一个激活方法');
    // eslint-disable-next-line no-param-reassign
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const parkTypeId = await resolveParkTypeId(park_type);
  if (!parkTypeId) {
    const err = new Error('公园类型无效');
    // eslint-disable-next-line no-param-reassign
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  return await transaction(async (client) => {
    // 创建公园申请
    const application = await client.query(
      `
      INSERT INTO park_applications (
        park_name, park_type, provinces,
        location, latitude, longitude, website, description,
        access_methods, activation_methods, applicant_id, confirmed_authenticity
      ) VALUES (
        $1, $2, $3,
        ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, $6, $7,
        $8, $9, $10, $11
      ) RETURNING *
    `,
      [
        park_name,
        parkTypeId,
        Array.isArray(provinces) ? JSON.stringify(provinces) : provinces,
        latitude,
        longitude,
        website,
        description,
        JSON.stringify(access_methods),
        JSON.stringify(activation_methods),
        userId,
        confirmed_authenticity,
      ]
    );

    const newApplication = application.rows[0];

    // 记录审核日志
    await client.query(
      `
      INSERT INTO application_audit_logs (
        application_id, action, operator_id, operator_role, 
        old_status, new_status, notes
      ) VALUES (
        $1, 'submitted', $2, 'applicant', 
        NULL, 'pending', NULL
      )
    `,
      [newApplication.id, userId]
    );

    return newApplication;
  });
};

// 获取申请列表
// 获取当前用户的公园申请列表（普通用户）
export const getMyApplications = async (userId, status = null, province = null) => {
  let query = `
    SELECT pa.*, u.email as applicant_email, u.callsign as applicant_callsign,
           COALESCE(p.zh_name, '') as province_name, 
           COALESCE(p.en_name, '') as province_en_name,
           reviewer.email as reviewer_email, reviewer.callsign as reviewer_callsign
    FROM park_applications pa
    JOIN users u ON pa.applicant_id = u.id
    LEFT JOIN provinces p ON p.iso_code = (pa.provinces->>0)
    LEFT JOIN users reviewer ON pa.pota_synced_by = reviewer.id
    WHERE pa.applicant_id = $1
  `;

  const params = [userId];
  let paramIndex = 2;

  if (status) {
    query += ` AND pa.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (province) {
    query += ` AND ($${paramIndex} = ANY(pa.provinces))`; // 检查省份是否在数组中
    params.push(province);
    paramIndex++;
  }

  query += ` ORDER BY pa.created_at DESC`;

  return await getMany(query, params);
};

// 获取公园申请列表（审核员/管理员）
export const getApplications = async (
  userId,
  status = null,
  province = null,
  applicantId = null
) => {
  let query = `
    SELECT pa.*, 
           u.email as applicant_email, u.callsign as applicant_callsign,
           COALESCE(p.zh_name, '') as province_name, 
           COALESCE(p.en_name, '') as province_en_name,
           reviewer.email as reviewer_email, reviewer.callsign as reviewer_callsign
    FROM park_applications pa
    JOIN users u ON pa.applicant_id = u.id
    LEFT JOIN provinces p ON p.iso_code = (pa.provinces->>0)
    LEFT JOIN users reviewer ON pa.pota_synced_by = reviewer.id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  // 权限检查：普通用户只能看到自己的申请
  const isReviewer = await checkUserPermission(userId, 'review_application');
  if (!isReviewer) {
    query += ` AND pa.applicant_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (status) {
    query += ` AND pa.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (province) {
    query += ` AND ($${paramIndex} = ANY(pa.provinces))`; // 检查省份是否在数组中
    params.push(province);
    paramIndex++;
  }

  if (applicantId) {
    query += ` AND pa.applicant_id = $${paramIndex}`;
    params.push(applicantId);
    paramIndex++;
  }

  query += ` ORDER BY pa.created_at DESC`;

  return await getMany(query, params);
};

// 获取申请详情
export const getApplicationById = async (userId, applicationId) => {
  const application = await getOne(
    `
    SELECT pa.*, 
           u.email as applicant_email, u.callsign as applicant_callsign,
           COALESCE(p.zh_name, '') as province_name, 
           COALESCE(p.en_name, '') as province_en_name,
           reviewer.email as reviewer_email, reviewer.callsign as reviewer_callsign
    FROM park_applications pa
    JOIN users u ON pa.applicant_id = u.id
    LEFT JOIN provinces p ON p.iso_code = (pa.provinces->>0)
    LEFT JOIN users reviewer ON pa.pota_synced_by = reviewer.id
    WHERE pa.id = $1
  `,
    [applicationId]
  );

  if (!application) {
    throw new Error('申请不存在');
  }

  // 权限检查：普通用户只能查看自己的申请
  const isReviewer = await checkUserPermission(userId, 'review_application');
  if (!isReviewer && application.applicant_id !== userId) {
    throw new Error('没有权限查看该申请');
  }

  return application;
};

// 审核申请
export const reviewApplication = async (
  reviewerId,
  applicationId,
  status,
  reviewNotes,
  rejectionReason = null
) => {
  // 检查权限
  const canReview = await checkUserPermission(reviewerId, 'review_application');
  if (!canReview) {
    throw new Error('没有权限审核申请');
  }

  // 获取当前申请信息
  const currentApplication = await getOne(
    `
    SELECT pa.*, u.role as reviewer_role
    FROM park_applications pa
    JOIN users u ON u.id = $1
    WHERE pa.id = $2
  `,
    [reviewerId, applicationId]
  );

  if (!currentApplication) {
    throw new Error('申请不存在');
  }

  if (currentApplication.status !== 'pending') {
    throw new Error('申请已被审核');
  }

  const operatorRole = currentApplication.reviewer_role;
  const oldStatus = currentApplication.status;

  return await transaction(async (client) => {
    // 更新申请状态
    const updatedApplication = await client.query(
      `
      UPDATE park_applications 
      SET status = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `,
      [status, rejectionReason, applicationId]
    );

    // 记录审核日志
    const action = status === 'approved' ? 'approved' : 'rejected';
    await client.query(
      `
      INSERT INTO application_audit_logs (
        application_id, action, operator_id, operator_role,
        old_status, new_status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `,
      [applicationId, action, reviewerId, operatorRole, oldStatus, status, reviewNotes]
    );

    return updatedApplication.rows[0];
  });
};

// 重新审核申请（系统管理员和POTA代表权限）
export const reReviewApplication = async (operatorId, applicationId, newStatus, reviewNotes) => {
  // 获取当前申请信息
  const currentApplication = await getOne(
    `
    SELECT pa.*, u.role as operator_role
    FROM park_applications pa
    JOIN users u ON u.id = $1
    WHERE pa.id = $2
  `,
    [operatorId, applicationId]
  );

  if (!currentApplication) {
    throw new Error('申请不存在');
  }

  const operatorRole = currentApplication.operator_role;
  const oldStatus = currentApplication.status;

  // 检查权限：只有系统管理员和POTA代表可以重新审核
  const isSystemAdmin = operatorRole === 'system_admin';
  const isPotaRep = operatorRole === 'pota_representative';

  if (!isSystemAdmin && !isPotaRep) {
    throw new Error('只有系统管理员和POTA代表可以重新审核申请');
  }

  // 确定动作类型
  let action;
  if (newStatus === 'approved' && oldStatus === 'rejected') {
    action = 'reverted_approved';
  } else if (newStatus === 'rejected' && oldStatus === 'approved') {
    action = 'reverted_rejected';
  } else {
    throw new Error('无效的状态转换');
  }

  return await transaction(async (client) => {
    // 更新申请状态
    const updatedApplication = await client.query(
      `
      UPDATE park_applications 
      SET status = $1, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `,
      [newStatus, applicationId]
    );

    // 记录审核日志
    await client.query(
      `
      INSERT INTO application_audit_logs (
        application_id, action, operator_id, operator_role,
        old_status, new_status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `,
      [applicationId, action, operatorId, operatorRole, oldStatus, newStatus, reviewNotes]
    );

    return updatedApplication.rows[0];
  });
};

// POTA系统录入
export const syncToPOTA = async (operatorId, applicationId, potaNotes) => {
  // 检查权限
  const canSync = await checkUserPermission(operatorId, 'sync_to_pota');
  if (!canSync) {
    throw new Error('没有权限录入POTA系统');
  }

  // 获取当前申请信息
  const currentApplication = await getOne(
    `
    SELECT pa.*, u.role as operator_role
    FROM park_applications pa
    JOIN users u ON u.id = $1
    WHERE pa.id = $2
  `,
    [operatorId, applicationId]
  );

  if (!currentApplication) {
    throw new Error('申请不存在');
  }

  if (currentApplication.status !== 'approved') {
    throw new Error('只有审核通过的申请才能录入POTA系统');
  }

  if (currentApplication.status === 'pota_synced') {
    throw new Error('申请已录入POTA系统');
  }

  const operatorRole = currentApplication.operator_role;
  const oldStatus = currentApplication.status;

  return await transaction(async (client) => {
    // 更新申请状态为已录入POTA
    const updatedApplication = await client.query(
      `
      UPDATE park_applications 
      SET status = 'pota_synced', 
          pota_synced_at = CURRENT_TIMESTAMP,
          pota_synced_by = $1,
          pota_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `,
      [operatorId, potaNotes, applicationId]
    );

    // 记录审核日志
    await client.query(
      `
      INSERT INTO application_audit_logs (
        application_id, action, operator_id, operator_role,
        old_status, new_status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `,
      [applicationId, 'pota_synced', operatorId, operatorRole, oldStatus, 'pota_synced', potaNotes]
    );

    return updatedApplication.rows[0];
  });
};

// 获取申请审核记录
export const getAuditLogs = async (userId, applicationId) => {
  // 检查申请存在性和权限
  await getApplicationById(userId, applicationId);

  return await getMany(
    `
    SELECT aal.*, u.email as operator_email, u.callsign as operator_callsign
    FROM application_audit_logs aal
    JOIN users u ON aal.operator_id = u.id
    WHERE aal.application_id = $1
    ORDER BY aal.created_at DESC
  `,
    [applicationId]
  );
};

// 创建审核提醒
export const createReviewReminder = async (
  userId,
  applicationId,
  reminderType,
  notes,
  remindedTo = null
) => {
  // 检查权限
  const canRemind = await checkUserPermission(userId, 'remind_review');
  if (!canRemind) {
    throw new Error('没有权限创建提醒');
  }

  // 检查申请存在性
  const application = await getOne(
    `
    SELECT id, status FROM park_applications WHERE id = $1
  `,
    [applicationId]
  );

  if (!application) {
    throw new Error('申请不存在');
  }

  if (application.status !== 'pending') {
    throw new Error('只能对待审核的申请创建提醒');
  }

  return await insert(
    `
    INSERT INTO review_reminders (
      application_id, reminded_by, reminded_to, reminder_type, notes
    ) VALUES ($1, $2, $3, $4, $5)
  `,
    [applicationId, userId, remindedTo, reminderType, notes]
  );
};

// 获取审核提醒列表
export const getReviewReminders = async (userId, applicationId = null, acknowledged = null) => {
  let query = `
    SELECT rr.*, 
           app.park_name,
           reminder.email as reminded_by_email, reminder.callsign as reminded_by_callsign,
           reminded.email as reminded_to_email, reminded.callsign as reminded_to_callsign
    FROM review_reminders rr
    JOIN park_applications app ON rr.application_id = app.id
    JOIN users reminder ON rr.reminded_by = reminder.id
    LEFT JOIN users reminded ON rr.reminded_to = reminded.id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  // 权限检查：普通用户只能看到自己创建的提醒
  const isReviewer = await checkUserPermission(userId, 'review_application');
  if (!isReviewer) {
    query += ` AND rr.reminded_by = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (applicationId) {
    query += ` AND rr.application_id = $${paramIndex}`;
    params.push(applicationId);
    paramIndex++;
  }

  if (acknowledged !== null) {
    query += ` AND rr.is_acknowledged = $${paramIndex}`;
    params.push(acknowledged);
    paramIndex++;
  }

  query += ` ORDER BY rr.created_at DESC`;

  return await getMany(query, params);
};
