import potaAuthService from './potaAuthService.js';
import {
  hashPassword,
  verifyPassword,
  findUserByIdentifier,
  checkUserModificationPermission,
  checkUserPermission,
  normalizeCallsign,
  normalizeEmail,
  revokeAllRefreshTokensForUser,
} from '../utils/auth.js';
import * as notificationService from './notificationService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type UserAdminAuditPayload = {
  action: string;
  operatorId: number;
  targetUserId: number;
  oldRole?: string | null;
  newRole?: string | null;
  oldIsActive?: boolean | null;
  newIsActive?: boolean | null;
  reason?: string | null;
  metadata?: unknown;
};

type RegisterUserPayload = {
  email: string;
  callsign: string;
  password: string;
  role?: string;
};

// -----------------
// 审计日志（封禁/解封不需要理由；修改角色必须理由）
// -----------------
export const logUserAdminAudit = async ({
  action,
  operatorId,
  targetUserId,
  oldRole = null,
  newRole = null,
  oldIsActive = null,
  newIsActive = null,
  reason = null,
  metadata = {},
}: UserAdminAuditPayload) => {
  await prisma.userAdminAuditLog.create({
    data: {
      action,
      operator_id: operatorId,
      target_user_id: targetUserId,
      old_role: oldRole,
      new_role: newRole,
      old_is_active: oldIsActive,
      new_is_active: newIsActive,
      reason,
      metadata,
    },
  });
};

// 用户注册
export const registerUser = async (userData: RegisterUserPayload) => {
  const email = normalizeEmail(userData.email);
  const callsign = normalizeCallsign(userData.callsign);
  const { password, role = 'user' } = userData;

  // 优先返回邮箱冲突
  const existingEmail = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
  });
  if (existingEmail) {
    throw new Error('邮箱已被使用');
  }

  const existingCallsign = await prisma.user.findFirst({
    where: {
      callsign: {
        equals: callsign,
        mode: 'insensitive',
      },
    },
  });
  if (existingCallsign) {
    throw new Error('呼号已被使用');
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 创建用户
  const newUser = await prisma.user.create({
    data: {
      email,
      callsign,
      password_hash: passwordHash,
      role,
    },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    callsign: newUser.callsign,
    role: newUser.role,
    is_active: newUser.is_active,
    last_login: newUser.last_login,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  };
};

// 用户登录
export const loginUser = async (identifier: string, password: string) => {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    throw new Error('用户不存在或密码错误');
  }

  if (!user.is_active) {
    // is_active=false：禁止登录，给明确提示
    throw new Error('用户已被禁用');
  }

  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('用户不存在或密码错误');
  }

  // 更新 last_login
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      last_login: new Date(),
    },
  });

  return {
    id: user.id,
    email: user.email,
    callsign: user.callsign,
    role: user.role,
    is_active: user.is_active,
    last_login: user.last_login,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

// 更新用户信息
export const updateUserInfo = async (
  operatorId: number,
  targetUserId: number,
  field: string,
  newValue: string,
  _reason: string,
  oldPassword: string | null = null
) => {
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, field);
  if (!canModify) {
    throw new Error('没有权限修改该用户信息');
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
  });
  if (!currentUser) {
    throw new Error('用户不存在');
  }

  // 如果是修改邮箱或密码，需要验证原密码
  if (field === 'email' && oldPassword !== null) {
    // 验证原密码
    const isValidOldPassword = await verifyPassword(oldPassword, currentUser.password_hash);
    if (!isValidOldPassword) {
      throw new Error('原密码不正确');
    }
  }

  return await prisma.$transaction(async (prisma) => {
    // 记录用户信息变更
    await prisma.userInfoChange.create({
      data: {
        user_id: targetUserId,
        field_name: field,
        old_value: currentUser[field as keyof typeof currentUser] as string,
        new_value: newValue,
        change_reason: reason,
      },
    });

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        [field]: newValue,
      },
      select: {
        id: true,
        email: true,
        callsign: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    return updatedUser;
  });
};

// 申请呼号变更
export const requestCallsignChange = async (userId: number, newCallsign: string, _reason: string) => {
  const normalized = normalizeCallsign(newCallsign);

  const existingUser = await prisma.user.findFirst({
    where: {
      callsign: {
        equals: normalized,
        mode: 'insensitive',
      },
      id: {
        not: userId,
      },
      is_active: true,
    },
  });

  if (existingUser) {
    throw new Error('该呼号已被使用');
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      callsign: true,
    },
  });
  if (!currentUser) {
    throw new Error('用户不存在');
  }

  const pendingRequest = await prisma.callsignChangeRequest.findFirst({
    where: {
      user_id: userId,
      status: 'pending',
    },
  });

  if (pendingRequest) {
    throw new Error('您已有待审核的呼号变更申请');
  }

  const request = await prisma.callsignChangeRequest.create({
    data: {
      user_id: userId,
      current_callsign: currentUser.callsign,
      requested_callsign: normalized,
    },
  });

  const systemAdmins = await notificationService.getUsersByRole('system_admin');
  if (systemAdmins.length > 0) {
    await notificationService.createNotificationForUsers(
      systemAdmins,
      'callsign_change_request',
      '新的呼号变更申请',
      `用户"${currentUser.callsign}"申请将呼号变更为"${normalized}"`,
      `/callsign-change-requests`
    );
  }

  return request;
};

// 审核呼号变更
export const reviewCallsignChange = async (
  reviewerId: number,
  requestId: number,
  status: string,
  reviewNotes: string
) => {
  const request = await prisma.callsignChangeRequest.findUnique({
    where: {
      id: requestId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error('申请不存在');
  }

  if (request.status !== 'pending') {
    throw new Error('申请已被处理');
  }

  return await prisma.$transaction(async (prisma) => {
    // 更新呼号变更申请状态
    await prisma.callsignChangeRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status,
        reviewer_id: reviewerId,
        review_notes: reviewNotes,
        reviewed_at: new Date(),
      },
    });

    let updatedUser = null;
    if (status === 'approved') {
      updatedUser = await prisma.user.update({
        where: {
          id: request.user_id,
        },
        data: {
          callsign: request.requested_callsign,
        },
        select: {
          id: true,
          email: true,
          callsign: true,
          role: true,
          is_active: true,
          last_login: true,
          created_at: true,
          updated_at: true,
        },
      });
    }

    await notificationService.createNotification(
      {
        type: 'callsign_change_request',
        title: status === 'approved' ? '呼号变更申请已通过' : '呼号变更申请已拒绝',
        description: status === 'approved'
          ? `您的呼号变更申请已通过，呼号已变更为"${request.requested_callsign}"`
          : `您的呼号变更申请已被拒绝${reviewNotes ? `：${reviewNotes}` : ''}`,
        userId: request.user_id,
        linkUrl: `/callsign-change-requests`,
      }
    );

    return {
      request: { ...request, status, review_notes: reviewNotes },
      updatedUser,
    };
  });
};

// 获取呼号变更申请列表
export const getCallsignChangeRequests = async (status: string | null) => {
  return await prisma.callsignChangeRequest.findMany({
    where: status ? { status } : {},
    include: {
      user: {
        select: {
          email: true,
          callsign: true,
        },
      },
      reviewer: {
        select: {
          email: true,
          callsign: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};



// 定义 getUserAdminAuditLogs 的参数类型
interface GetUserAdminAuditLogsParams {
  action?: string | null;
  targetUserId?: number | null;
  operatorId?: number | null;
  limit?: number;
  offset?: number;
}

// 获取用户管理审计日志（仅系统管理员）
export const getUserAdminAuditLogs = async (params: GetUserAdminAuditLogsParams = {}) => {
  const { action = null, targetUserId = null, operatorId = null, limit = 200, offset = 0 } = params;
  
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const whereConditions = buildAuditLogWhereConditions(action, targetUserId, operatorId);

  return await prisma.userAdminAuditLog.findMany({
    where: whereConditions,
    include: {
      operator: {
        select: {
          callsign: true,
          email: true,
        },
      },
      target_user: {
        select: {
          callsign: true,
          email: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: safeLimit,
    skip: safeOffset,
  });
};

// 构建审计日志查询条件
function buildAuditLogWhereConditions(action: string | null, targetUserId: number | null, operatorId: number | null) {
  const whereConditions: {
    action?: string;
    target_user_id?: number;
    operator_id?: number;
  } = {};
  if (action) {
    whereConditions.action = action;
  }
  if (targetUserId) {
    whereConditions.target_user_id = targetUserId;
  }
  if (operatorId) {
    whereConditions.operator_id = operatorId;
  }
  return whereConditions;
}

// 获取用户列表
export const getUsers = async (role: string | null = null, isActive: boolean | null = null) => {
  const whereConditions: {
    is_active?: boolean;
    role?: string;
  } = {};
  if (isActive === true || isActive === false) {
    whereConditions.is_active = isActive;
  }

  if (role) {
    whereConditions.role = role;
  }

  return await prisma.user.findMany({
    where: whereConditions,
    select: {
      id: true,
      email: true,
      callsign: true,
      role: true,
      is_active: true,
      last_login: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};

// 修改用户角色（必须系统管理员；必须 reason；不能改自己；目标用户必须 is_active=true）
export const updateUserRole = async (
  operatorId: number,
  targetUserId: number,
  newRole: string,
  reason: string
) => {
  if (operatorId === targetUserId) {
    throw new Error('不能修改自己的角色');
  }

  if (!reason || !String(reason).trim()) {
    throw new Error('修改用户角色必须填写理由');
  }

  // 业务限制：目标用户被禁用时，不允许改角色
  const target = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
    select: {
      id: true,
      role: true,
      is_active: true,
    },
  });
  if (!target) throw new Error('用户不存在');
  if (!target.is_active) throw new Error('用户已被禁用，无法修改角色');

  // 权限校验：只有系统管理员
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, 'role');
  if (!canModify) {
    throw new Error('只有系统管理员才能修改用户角色');
  }

  return await prisma.$transaction(async (prisma) => {
    // 更新用户角色
    const updated = await prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        role: newRole,
      },
      select: {
        id: true,
        email: true,
        callsign: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    // 记录审计日志
    await prisma.userAdminAuditLog.create({
      data: {
        action: 'user_role_changed',
        operator_id: operatorId,
        target_user_id: targetUserId,
        old_role: target.role,
        new_role: newRole,
        reason: reason,
        metadata: {},
      },
    });

    // 创建通知
    await notificationService.createNotification(
      {
        type: 'user_management_operation',
        title: '用户角色已变更',
        description: `您的角色已从"${target.role}"变更为"${newRole}"`,
        userId: targetUserId,
        linkUrl: '/profile',
      }
    );

    return updated;
  });
};

// 封禁/解封（is_active）
export const updateUserActive = async (
  operatorId: number,
  targetUserId: number,
  isActive: boolean
) => {
  if (operatorId === targetUserId) {
    throw new Error('不能修改自己的启用状态');
  }

  const target = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
    select: {
      id: true,
      role: true,
      is_active: true,
    },
  });
  if (!target) throw new Error('用户不存在');

  // 权限校验：只有系统管理员
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, 'role');
  if (!canModify) {
    throw new Error('只有系统管理员才能封禁/解封用户');
  }

  // 禁用时：不允许同时改角色（这里不做；改角色接口已禁止 is_active=false）
  const newIsActive = Boolean(isActive);

  const updatedUser = await prisma.$transaction(async (prisma) => {
    // 更新用户启用状态
    const updated = await prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        is_active: newIsActive,
      },
      select: {
        id: true,
        email: true,
        callsign: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    // 记录审计日志
    await prisma.userAdminAuditLog.create({
      data: {
        action: newIsActive ? 'user_enabled' : 'user_disabled',
        operator_id: operatorId,
        target_user_id: targetUserId,
        old_is_active: target.is_active,
        new_is_active: newIsActive,
        metadata: {},
      },
    });

    return updated;
  });

  // 封禁：吊销所有 refresh tokens（实现“强制登出”的可达部分：无法续期/重登）
  if (!newIsActive) {
    await revokeAllRefreshTokensForUser(targetUserId);
  }

  return updatedUser;
};

// 删除用户（软删除）
export const deleteUser = async (operatorId: number, targetUserId: number) => {
  const canDelete = await checkUserPermission(operatorId, 'delete_user');
  if (!canDelete) {
    throw new Error('没有权限删除用户');
  }

  const deletedUser = await prisma.user.update({
    where: {
      id: targetUserId,
      is_active: true,
    },
    data: {
      is_active: false,
      updated_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      callsign: true,
      role: true,
      is_active: true,
      last_login: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!deletedUser) {
    throw new Error('用户不存在或已被删除');
  }

  // 删除也视为禁用：吊销 refresh tokens
  await revokeAllRefreshTokensForUser(targetUserId);

  return deletedUser;
};

// 验证密码更新参数
const validatePasswordUpdate = async (
  userId: number,
  oldPassword: string,
  newPassword: string
) => {
  // 验证新密码
  if (!newPassword || newPassword.length < 6) {
    throw new Error('密码长度至少为6位');
  }

  // 获取当前用户信息以验证原密码
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      password_hash: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 验证原密码
  const isValidOldPassword = await verifyPassword(oldPassword, user.password_hash);
  if (!isValidOldPassword) {
    throw new Error('原密码不正确');
  }

  // 检查新密码是否与原密码相同
  if (oldPassword === newPassword) {
    throw new Error('新密码不能与原密码相同');
  }

  return user;
};

// 处理 POTA token 重新加密
const handlePotaTokensReencryption = async (
  userId: number,
  oldPasswordHash: string
) => {
  try {
    return await potaAuthService.getStoredTokens(userId, oldPasswordHash);
  } catch (error) {
    // 如果获取不到POTA token（可能是因为密码不匹配或不存在），则跳过重新加密
    console.log('未能获取当前POTA token，可能未配置或密码不匹配:', error.message);
    return null;
  }
};

// 记录密码变更日志
const logPasswordChange = async (userId: number, reason: string) => {
  await prisma.userInfoChange.create({
    data: {
      user_id: userId,
      field_name: 'password_hash',
      old_value: 'PASSWORD_HASH_REDACTED',
      new_value: 'PASSWORD_HASH_REDACTED',
      change_reason: reason || '用户修改密码',
    },
  });
};

// 更新用户密码
export const updateUserPassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string,
  reason: string
) => {
  const user = await validatePasswordUpdate(userId, oldPassword, newPassword);

  // 为新密码生成哈希
  const newPasswordHash = await hashPassword(newPassword);

  // 获取当前存储的POTA token（如果有）
  const existingPotaTokens = await handlePotaTokensReencryption(userId, user.password_hash);

  // 更新用户密码
  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      callsign: true,
      role: true,
      is_active: true,
      last_login: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!updatedUser) {
    throw new Error('用户不存在');
  }

  // 如果存在POTA token，则使用新密码重新加密
  if (existingPotaTokens) {
    try {
      await potaAuthService.storeTokens(userId, existingPotaTokens, newPasswordHash);
    } catch (error) {
      console.error('重新加密POTA token失败:', error);
      // 记录错误但不中断密码更新流程
    }
  }

  // 记录密码变更日志
  await logPasswordChange(userId, reason);

  return updatedUser;
};
