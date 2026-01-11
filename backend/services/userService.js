import { insert, update, getOne, getMany, transaction, query } from '../config/database.js';
import {
  hashPassword,
  verifyPassword,
  findUserByIdentifier,
  checkUserModificationPermission,
  checkUserPermission,
  normalizeCallsign,
  normalizeEmail,
  revokeAllRefreshTokensForUser
} from '../utils/auth.js';

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
  metadata = {}
}) => {
  await query(
    `
    INSERT INTO user_admin_audit_logs (
      action,
      operator_id,
      target_user_id,
      old_role,
      new_role,
      old_is_active,
      new_is_active,
      reason,
      metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `,
    [
      action,
      operatorId,
      targetUserId,
      oldRole,
      newRole,
      oldIsActive,
      newIsActive,
      reason,
      metadata
    ]
  );
};

// 用户注册
export const registerUser = async (userData) => {
  const email = normalizeEmail(userData.email);
  const callsign = normalizeCallsign(userData.callsign);
  const { password, role = 'user' } = userData;

  // 优先返回邮箱冲突
  const existingEmail = await getOne(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (existingEmail) {
    throw new Error('邮箱已被使用');
  }

  const existingCallsign = await getOne(`SELECT id FROM users WHERE upper(callsign) = upper($1)`, [callsign]);
  if (existingCallsign) {
    throw new Error('呼号已被使用');
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 创建用户
  const newUser = await insert(
    `
    INSERT INTO users (email, callsign, password_hash, role)
    VALUES ($1, $2, $3, $4)
  `,
    [email, callsign, passwordHash, role]
  );

  delete newUser.password_hash;
  return newUser;
};

// 用户登录
export const loginUser = async (identifier, password) => {
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
  await update(
    `
    UPDATE users
    SET last_login = CURRENT_TIMESTAMP
    WHERE id = $1
  `,
    [user.id]
  );

  delete user.password_hash;
  return user;
};

// 更新用户信息
export const updateUserInfo = async (operatorId, targetUserId, field, newValue, reason) => {
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, field);
  if (!canModify) {
    throw new Error('没有权限修改该用户信息');
  }

  const currentUser = await getOne(`SELECT ${field} as current_value FROM users WHERE id = $1`, [targetUserId]);
  if (!currentUser) {
    throw new Error('用户不存在');
  }

  return await transaction(async (client) => {
    await client.query(
      `
      INSERT INTO user_info_changes (user_id, field_name, old_value, new_value, change_reason)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [targetUserId, field, currentUser.current_value, newValue, reason]
    );

    const updatedUser = await client.query(
      `
      UPDATE users
      SET ${field} = $1
      WHERE id = $2
      RETURNING id, email, callsign, role, is_active, last_login, created_at, updated_at
    `,
      [newValue, targetUserId]
    );

    return updatedUser.rows[0];
  });
};

// 申请呼号变更
export const requestCallsignChange = async (userId, newCallsign, reason) => {
  const normalized = normalizeCallsign(newCallsign);

  const existingUser = await getOne(
    `
    SELECT id FROM users
    WHERE upper(callsign) = upper($1) AND id != $2 AND is_active = true
  `,
    [normalized, userId]
  );

  if (existingUser) {
    throw new Error('该呼号已被使用');
  }

  const currentUser = await getOne(`SELECT callsign FROM users WHERE id = $1`, [userId]);
  if (!currentUser) {
    throw new Error('用户不存在');
  }

  const pendingRequest = await getOne(
    `
    SELECT id FROM callsign_change_requests
    WHERE user_id = $1 AND status = 'pending'
  `,
    [userId]
  );

  if (pendingRequest) {
    throw new Error('您已有待审核的呼号变更申请');
  }

  const request = await insert(
    `
    INSERT INTO callsign_change_requests (user_id, current_callsign, requested_callsign, reason)
    VALUES ($1, $2, $3, $4)
  `,
    [userId, currentUser.callsign, normalized, reason]
  );

  return request;
};

// 审核呼号变更
export const reviewCallsignChange = async (reviewerId, requestId, status, reviewNotes) => {
  const request = await getOne(
    `
    SELECT ccr.*, u.email
    FROM callsign_change_requests ccr
    JOIN users u ON ccr.user_id = u.id
    WHERE ccr.id = $1
  `,
    [requestId]
  );

  if (!request) {
    throw new Error('申请不存在');
  }

  if (request.status !== 'pending') {
    throw new Error('申请已被处理');
  }

  return await transaction(async (client) => {
    await client.query(
      `
      UPDATE callsign_change_requests
      SET status = $1, reviewer_id = $2, review_notes = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
      [status, reviewerId, reviewNotes, requestId]
    );

    let updatedUser = null;
    if (status === 'approved') {
      const result = await client.query(
        `
        UPDATE users
        SET callsign = $1
        WHERE id = $2
        RETURNING id, email, callsign, role, is_active, last_login, created_at, updated_at
      `,
        [request.requested_callsign, request.user_id]
      );

      updatedUser = result.rows[0];
    }

    return {
      request: { ...request, status, review_notes: reviewNotes },
      updatedUser
    };
  });
};

// 获取呼号变更申请列表
export const getCallsignChangeRequests = async (status = 'pending') => {
  let queryText = `
    SELECT ccr.*, u.email as applicant_email, u.callsign as applicant_callsign,
           r.email as reviewer_email, r.callsign as reviewer_callsign
    FROM callsign_change_requests ccr
    JOIN users u ON ccr.user_id = u.id
    LEFT JOIN users r ON ccr.reviewer_id = r.id
  `;

  const params = [];
  if (status) {
    queryText += ' WHERE ccr.status = $1 ORDER BY ccr.created_at DESC';
    params.push(status);
  } else {
    queryText += ' ORDER BY ccr.created_at DESC';
  }

  return await getMany(queryText, params);
};

// 获取用户管理审计日志（仅系统管理员）
export const getUserAdminAuditLogs = async ({
  action = null,
  targetUserId = null,
  operatorId = null,
  limit = 200,
  offset = 0
} = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const conditions = [];
  const params = [];

  if (action) {
    params.push(action);
    conditions.push(`l.action = $${params.length}`);
  }

  if (targetUserId) {
    params.push(Number(targetUserId));
    conditions.push(`l.target_user_id = $${params.length}`);
  }

  if (operatorId) {
    params.push(Number(operatorId));
    conditions.push(`l.operator_id = $${params.length}`);
  }

  params.push(safeLimit);
  const limitIndex = params.length;
  params.push(safeOffset);
  const offsetIndex = params.length;

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return await getMany(
    `
      SELECT
        l.*, 
        op.callsign AS operator_callsign,
        op.email AS operator_email,
        tu.callsign AS target_callsign,
        tu.email AS target_email
      FROM user_admin_audit_logs l
      LEFT JOIN users op ON l.operator_id = op.id
      LEFT JOIN users tu ON l.target_user_id = tu.id
      ${whereSql}
      ORDER BY l.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `,
    params
  );
};

// 获取用户列表
export const getUsers = async (role = null, isActive = null) => {
  let queryText = `
    SELECT id, email, callsign, role, is_active, last_login, created_at, updated_at
    FROM users
    WHERE 1=1
  `;

  const params = [];
  if (isActive === true || isActive === false) {
    params.push(isActive);
    queryText += ` AND is_active = $${params.length}`;
  }

  if (role) {
    params.push(role);
    queryText += ` AND role = $${params.length}`;
  }

  queryText += ' ORDER BY created_at DESC';
  return await getMany(queryText, params);
};

// 修改用户角色（必须系统管理员；必须 reason；不能改自己；目标用户必须 is_active=true）
export const updateUserRole = async (operatorId, targetUserId, newRole, reason) => {
  if (operatorId === targetUserId) {
    throw new Error('不能修改自己的角色');
  }

  if (!reason || !String(reason).trim()) {
    throw new Error('修改用户角色必须填写理由');
  }

  // 业务限制：目标用户被禁用时，不允许改角色
  const target = await getOne(`SELECT id, role, is_active FROM users WHERE id = $1`, [targetUserId]);
  if (!target) throw new Error('用户不存在');
  if (!target.is_active) throw new Error('用户已被禁用，无法修改角色');

  // 权限校验：只有系统管理员
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, 'role');
  if (!canModify) {
    throw new Error('只有系统管理员才能修改用户角色');
  }

  return await transaction(async (client) => {
    const updated = await client.query(
      `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, email, callsign, role, is_active, last_login, created_at, updated_at
    `,
      [newRole, targetUserId]
    );

    await client.query(
      `
      INSERT INTO user_admin_audit_logs (
        action,
        operator_id,
        target_user_id,
        old_role,
        new_role,
        reason,
        metadata
      ) VALUES ('user_role_changed', $1, $2, $3, $4, $5, $6)
    `,
      [operatorId, targetUserId, target.role, newRole, reason, {}]
    );

    return updated.rows[0];
  });
};

// 封禁/解封（is_active）
export const updateUserActive = async (operatorId, targetUserId, isActive) => {
  if (operatorId === targetUserId) {
    throw new Error('不能修改自己的启用状态');
  }

  const target = await getOne(`SELECT id, role, is_active FROM users WHERE id = $1`, [targetUserId]);
  if (!target) throw new Error('用户不存在');

  // 权限校验：只有系统管理员
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, 'role');
  if (!canModify) {
    throw new Error('只有系统管理员才能封禁/解封用户');
  }

  // 禁用时：不允许同时改角色（这里不做；改角色接口已禁止 is_active=false）
  const newIsActive = Boolean(isActive);

  const updatedUser = await transaction(async (client) => {
    const updated = await client.query(
      `
      UPDATE users
      SET is_active = $1
      WHERE id = $2
      RETURNING id, email, callsign, role, is_active, last_login, created_at, updated_at
    `,
      [newIsActive, targetUserId]
    );

    await client.query(
      `
      INSERT INTO user_admin_audit_logs (
        action,
        operator_id,
        target_user_id,
        old_is_active,
        new_is_active,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [newIsActive ? 'user_enabled' : 'user_disabled', operatorId, targetUserId, target.is_active, newIsActive, {}]
    );

    return updated.rows[0];
  });

  // 封禁：吊销所有 refresh tokens（实现“强制登出”的可达部分：无法续期/重登）
  if (!newIsActive) {
    await revokeAllRefreshTokensForUser(targetUserId);
  }

  return updatedUser;
};

// 删除用户（软删除）
export const deleteUser = async (operatorId, targetUserId) => {
  const canDelete = await checkUserPermission(operatorId, 'delete_user');
  if (!canDelete) {
    throw new Error('没有权限删除用户');
  }

  const deletedUser = await update(
    `
    UPDATE users
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING id, email, callsign, role, is_active, last_login, created_at, updated_at
  `,
    [targetUserId]
  );

  if (!deletedUser) {
    throw new Error('用户不存在或已被删除');
  }

  // 删除也视为禁用：吊销 refresh tokens
  await revokeAllRefreshTokensForUser(targetUserId);

  return deletedUser;
};

// 更新用户密码
export const updateUserPassword = async (userId, newPassword, reason) => {
  // 验证新密码
  if (!newPassword || newPassword.length < 6) {
    throw new Error('密码长度至少为6位');
  }

  // 为新密码生成哈希
  const newPasswordHash = await hashPassword(newPassword);

  // 更新用户密码
  const updatedUser = await update(
    `
    UPDATE users
    SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, email, callsign, role, is_active, last_login, created_at, updated_at
  `,
    [newPasswordHash, userId]
  );

  if (!updatedUser) {
    throw new Error('用户不存在');
  }

  // 记录密码变更日志
  await insert(
    `
    INSERT INTO user_info_changes (user_id, field_name, old_value, new_value, change_reason)
    VALUES ($1, $2, 'PASSWORD_HASH_REDACTED', 'PASSWORD_HASH_REDACTED', $3)
  `,
    [userId, 'password_hash', reason || '用户修改密码']
  );

  // 删除旧的密码哈希，只返回用户基本信息
  delete updatedUser.password_hash;
  return updatedUser;
};
