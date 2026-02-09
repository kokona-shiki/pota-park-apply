import { insert, getOne, getMany, transaction } from '../config/database.js';
import { checkUserPermission } from '../utils/auth.js';
import { resolveParkTypeId } from './pota-import/parkTypeResolver.js';
import { calculateSimilarity } from '../utils/similarity.js';
import { parseProvincesFromParkName } from '../utils/locationParser.js';
import { } from '../utils/distance.js';
import * as notificationService from './notificationService.js';

type AppError = Error & { status?: number; code?: string };

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'pota_synced';

type ParkApplicationSubmitInput = {
  park_name: string;
  park_type?: string;
  provinces: string[];
  latitude: number;
  longitude: number;
  website?: string;
  description?: string;
  access_methods: string[];
  activation_methods: string[];
  confirmed_authenticity: boolean;
  confirmedNameSimilarity?: boolean;
  confirmedNearbyLocation?: boolean;
  confirmedRejectedPark?: boolean;
};

// 定义数据库查询结果类型
type QueryResult = {
  rows: unknown[];
  rowCount: number;
};

// 定义数据库客户端类型
type DatabaseClient = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};

// 验证申请权限
async function validateSubmitPermission(userId: number) {
  const canSubmit = await checkUserPermission(userId, 'submit_application');
  if (!canSubmit) {
    const err: AppError = new Error('没有权限提交申请');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
}

// 验证申请数据格式
function validateApplicationData(applicationData: ParkApplicationSubmitInput) {
  const { access_methods, activation_methods } = applicationData;

  if (!Array.isArray(access_methods) || access_methods.length === 0) {
    const err: AppError = new Error('至少需要选择一个访问方法');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (!Array.isArray(activation_methods) || activation_methods.length === 0) {
    const err: AppError = new Error('至少需要选择一个激活方法');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
}

// 验证公园类型
async function validateParkType(park_type?: string) {
  const parkTypeId = await resolveParkTypeId(park_type);
  if (!parkTypeId) {
    const err: AppError = new Error('公园类型无效');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return parkTypeId;
}

// 检查公园名称重复
async function checkDuplicateParkName(park_name: string, confirmedRejectedPark?: boolean) {
  const existingPark = await getOne(
    `
    SELECT id, park_name, status FROM park_applications 
    WHERE park_name = $1
    `,
    [park_name]
  );

  if (existingPark) {
    const { id, status } = existingPark;
    let errorMessage: string;
    let errorCode: string;
    let allowRetry: boolean = false;
    
    switch (status) {
      case 'pending':
        errorMessage = '您提交的公园名称已经在审核中';
        errorCode = 'DUPLICATE_NAME_PENDING';
        break;
      case 'approved':
        errorMessage = '您提交的公园名称待上传 POTA';
        errorCode = 'DUPLICATE_NAME_APPROVED';
        break;
      case 'pota_synced':
        errorMessage = '您提交的公园名称已经上传 POTA';
        errorCode = 'DUPLICATE_NAME_POTA_SYNCED';
        break;
      case 'rejected':
        errorMessage = '您提交的公园名称曾被审核拒绝，请确定是否要提交';
        errorCode = 'DUPLICATE_NAME_REJECTED';
        allowRetry = true;
        break;
      default:
        errorMessage = '您提交的公园名称已存在';
        errorCode = 'DUPLICATE_NAME';
    }
    
    // 如果是已拒绝状态且用户已确认，则允许提交
    if (status === 'rejected' && confirmedRejectedPark) {
      // 允许提交，跳过错误
    } else {
      const err: AppError & { 
        details?: { 
          existingPark: { id: number; name: string; status: ApplicationStatus };
          allowRetry?: boolean 
        } 
      } = new Error(errorMessage);
      err.code = errorCode;
      err.status = 400;
      err.details = {
        existingPark: {
          id: id,
          name: existingPark.park_name,
          status: status
        },
        allowRetry: allowRetry
      };
      throw err;
    }
  }
}

// 检查公园名称相似度
async function checkParkNameSimilarity(park_name: string, confirmedNameSimilarity?: boolean) {
  const similarParks = await getMany(
    `
    SELECT id, park_name FROM park_applications 
    WHERE 
      status IN ('approved', 'pota_synced')
    `
  );

  const filteredSimilarParks = similarParks
    .map(park => ({
      id: park.id,
      name: park.park_name,
      similarity: calculateSimilarity(park.park_name, park_name)
    }))
    .filter(park => {
      if (park.similarity < 0.7) return false;
      
      // 从两个公园名称中解析省份
      const newParkProvinces = parseProvincesFromParkName(park_name);
      const existingParkProvinces = parseProvincesFromParkName(park.name);
      
      // 如果至少有一个公园名称解析出了省份，且解析结果不同，则放行
      if (newParkProvinces.length > 0 && existingParkProvinces.length > 0) {
        // 检查是否有任何省份重叠
        const hasOverlap = newParkProvinces.some(prov => existingParkProvinces.includes(prov));
        return hasOverlap; // 只有省份重叠时才视为相似
      }
      
      // 如果都没有解析出省份，或者只有一个解析出，则视为相似
      return true;
    })
    .sort((a, b) => b.similarity - a.similarity)
    .map(park => ({
      id: park.id,
      name: park.name
    }));

  if (filteredSimilarParks.length > 0 && !confirmedNameSimilarity) {
    const err: AppError & { details?: { similarParks: Array<{ id: number; name: string }> } } = new Error('公园名称相似度高');
    err.code = 'SIMILAR_NAME';
    err.status = 400;
    err.details = {
      similarParks: filteredSimilarParks
    };
    throw err;
  }
}

// 检查公园地理位置距离
async function checkParkLocationDistance(latitude: number, longitude: number, confirmedNearbyLocation?: boolean) {
  const nearbyParks = await getMany(
    `
    SELECT id, park_name, latitude, longitude FROM park_applications 
    WHERE 
      status IN ('approved', 'pota_synced')
      AND ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        500
      )
    `,
    [longitude, latitude] // PostGIS 使用 (lon, lat) 顺序
  );

  const filteredNearbyParks = nearbyParks.map(park => ({
    id: park.id,
    name: park.park_name
  }));

  if (filteredNearbyParks.length > 0 && !confirmedNearbyLocation) {
    const err: AppError & { details?: { nearbyParks: Array<{ id: number; name: string }> } } = new Error('公园距离过近');
    err.code = 'NEARBY_LOCATION';
    err.status = 400;
    err.details = {
      nearbyParks: filteredNearbyParks
    };
    throw err;
  }
}

// 创建公园申请记录
async function createParkApplication(
  client: DatabaseClient,
  userId: number,
  applicationData: ParkApplicationSubmitInput,
  parkTypeId: string
) {
  const {
    park_name,
    provinces,
    latitude,
    longitude,
    website,
    description,
    access_methods,
    activation_methods,
    confirmed_authenticity,
  } = applicationData;

  // 创建公园申请
  const application = await client.query(
    `
    INSERT INTO park_applications (
      park_name, park_type, provinces,
      location, latitude, longitude, website, description,
      access_methods, activation_methods, applicant_id, confirmed_authenticity
    ) VALUES (
      $1, $2, $3::json,
      ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, $6, $7,
      $8::json, $9::json, $10, $11
    ) RETURNING *
  `,
    [
      park_name,
      parkTypeId,
      JSON.stringify(provinces),
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

  // 重新查询完整的申请数据
  const fullApplication = await client.query(
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
    [newApplication.id]
  );

  return {
    newApplication,
    fullApplication: fullApplication.rows[0]
  };
}

// 提交公园申请
export const submitParkApplication = async (
  userId: number,
  applicationData: ParkApplicationSubmitInput
) => {
  const {
    park_name,
    park_type,
    confirmedRejectedPark,
    confirmedNameSimilarity,
    confirmedNearbyLocation
  } = applicationData;

  // 验证权限
  await validateSubmitPermission(userId);

  // 验证申请数据格式
  validateApplicationData(applicationData);

  // 验证公园类型
  const parkTypeId = await validateParkType(park_type);

  // 检查公园名称重复
  await checkDuplicateParkName(park_name, confirmedRejectedPark);

  // 检查公园名称相似度
  await checkParkNameSimilarity(park_name, confirmedNameSimilarity);

  // 检查公园地理位置距离
  await checkParkLocationDistance(
    applicationData.latitude, 
    applicationData.longitude, 
    confirmedNearbyLocation
  );

  return await transaction(async (client) => {
    // 创建公园申请记录
    const { newApplication, fullApplication } = await createParkApplication(
      client, userId, applicationData, parkTypeId
    );

    // 通知审核员
    await notifyReviewersOnNewApplication(newApplication.id, park_name);

    return fullApplication;
  });
};

export const notifyReviewersOnNewApplication = async (applicationId: number, parkName: string) => {
  try {
    const reviewers = await getMany(
      `
      SELECT u.id FROM users u
      JOIN role_permissions rp ON u.role = rp.role
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.is_active = true
        AND p.permission_code = 'review_application'
      `
    );

    const reviewerIds = reviewers.map((r) => r.id);

    if (reviewerIds.length > 0) {
      await notificationService.createNotificationForUsers(
        reviewerIds,
        'park_application_status_change',
        '新的公园申请待审核',
        `有新的公园申请"${parkName}"需要您审核`,
        null
      );
    }
  } catch (error) {
    console.error('通知审核员失败:', error);
  }
};

// 获取申请列表
// 获取当前用户的公园申请列表（普通用户）
export const getMyApplications = async (
  userId: number,
  status: ApplicationStatus | null = null,
  province: string | null = null
) => {
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

  const params: Array<string | number> = [userId];
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
  userId: number,
  status: ApplicationStatus | null = null,
  province: string | null = null,
  applicantId: number | null = null
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

  const params: Array<string | number> = [];
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
export const getApplicationById = async (userId: number, applicationId: number) => {
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
  reviewerId: number,
  applicationId: number,
  status: 'approved' | 'rejected',
  reviewNotes: string,
  rejectionReason: string | null = null
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
    await client.query(
      `
      UPDATE park_applications 
      SET status = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
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

    // 重新查询完整的申请数据（包含 province_name 等关联字段）
    const fullApplication = await client.query(
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

    const application = fullApplication.rows[0];

    if (status === 'approved') {
      await notificationService.createNotification(
        {
          type: 'park_application_status_change',
          title: '公园申请审核通过',
          description: `您的公园申请"${currentApplication.park_name}"已通过审核`,
          userId: application.applicant_id,
          linkUrl: `/park-applications/${applicationId}`,
        }
      );

      if (operatorRole !== 'pota_representative') {
        const potaReps = await notificationService.getUsersByRole('pota_representative');
        if (potaReps.length > 0) {
          await notificationService.createNotificationForUsers(
            potaReps,
            'park_application_status_change',
            '公园申请审核通过',
            `公园申请"${currentApplication.park_name}"已通过审核`,
            `/park-applications/${applicationId}`
          );
        }
      }
    } else {
      await notificationService.createNotification(
        {
          type: 'park_application_status_change',
          title: '公园申请审核拒绝',
          description: `您的公园申请"${currentApplication.park_name}"已被拒绝${rejectionReason ? `：${rejectionReason}` : ''}`,
          userId: application.applicant_id,
          linkUrl: `/park-applications/${applicationId}`,
        }
      );
    }

    return application;
  });
};

// 重新审核申请（系统管理员和POTA代表权限）
export const reReviewApplication = async (
  operatorId: number,
  applicationId: number,
  newStatus: 'approved' | 'rejected',
  reviewNotes: string
) => {
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
    await client.query(
      `
      UPDATE park_applications 
      SET status = $1, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
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

    // 重新查询完整的申请数据（包含 province_name 等关联字段）
    const fullApplication = await client.query(
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

    const application = fullApplication.rows[0];

    await notificationService.createNotification(
      {
        type: 'park_application_status_change',
        title: '公园申请已同步到 POTA',
        description: `您的公园申请"${currentApplication.park_name}"已成功同步到 POTA 系统`,
        userId: currentApplication.applicant_id,
        linkUrl: `/park-applications/${applicationId}`,
      }
    );

    return application;
  });
};

// POTA系统录入
export const syncToPOTA = async (operatorId: number, applicationId: number, potaNotes: string) => {
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
    await client.query(
      `
      UPDATE park_applications 
      SET status = 'pota_synced', 
          pota_synced_at = CURRENT_TIMESTAMP,
          pota_synced_by = $1,
          pota_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
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

    // 重新查询完整的申请数据（包含 province_name 等关联字段）
    const fullApplication = await client.query(
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

    return fullApplication.rows[0];
  });
};

// 获取申请审核记录
export const getAuditLogs = async (userId: number, applicationId: number) => {
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
  userId: number,
  applicationId: number,
  reminderType: string,
  notes: string,
  remindedTo: number | null = null
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
export const getReviewReminders = async (
  userId: number,
  applicationId: number | null = null,
  acknowledged: boolean | null = null
) => {
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

  const params: Array<string | number | boolean> = [];
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
