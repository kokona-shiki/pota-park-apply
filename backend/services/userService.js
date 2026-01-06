import { insert, update, getOne, getMany, transaction } from '../config/database.js';
import { hashPassword, verifyPassword, findUserByIdentifier, checkUserModificationPermission, checkUserPermission } from '../utils/auth.js';

// 用户注册
export const registerUser = async (userData) => {
  const { email, callsign, password, role = 'user' } = userData;
  
  // 检查邮箱和呼号是否已存在
  const existingUser = await getOne(`
    SELECT id FROM users 
    WHERE email = $1 OR callsign = $2
  `, [email, callsign]);
  
  if (existingUser) {
    throw new Error('邮箱或呼号已被使用');
  }
  
  // 哈希密码
  const passwordHash = await hashPassword(password);
  
  // 创建用户
  const newUser = await insert(`
    INSERT INTO users (email, callsign, password_hash, role)
    VALUES ($1, $2, $3, $4)
  `, [email, callsign, passwordHash, role]);
  
  // 移除密码哈希
  delete newUser.password_hash;
  return newUser;
};

// 用户登录
export const loginUser = async (identifier, password) => {
  // 查找用户
  const user = await findUserByIdentifier(identifier);
  
  if (!user) {
    throw new Error('用户不存在或密码错误');
  }
  
  // 验证密码
  const isValidPassword = await verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) {
    throw new Error('用户不存在或密码错误');
  }
  
  // 移除密码哈希
  delete user.password_hash;
  
  return user;
};

// 更新用户信息
export const updateUserInfo = async (operatorId, targetUserId, field, newValue, reason) => {
  // 检查权限
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, field);
  
  if (!canModify) {
    throw new Error('没有权限修改该用户信息');
  }
  
  // 获取当前值
  const currentUser = await getOne(`
    SELECT ${field} as current_value FROM users WHERE id = $1
  `, [targetUserId]);
  
  if (!currentUser) {
    throw new Error('用户不存在');
  }
  
  return await transaction(async (client) => {
    // 记录修改历史
    await client.query(`
      INSERT INTO user_info_changes (user_id, field_name, old_value, new_value, change_reason)
      VALUES ($1, $2, $3, $4, $5)
    `, [targetUserId, field, currentUser.current_value, newValue, reason]);
    
    // 更新用户信息
    const updatedUser = await client.query(`
      UPDATE users 
      SET ${field} = $1 
      WHERE id = $2 
      RETURNING id, email, callsign, role, is_active, created_at, updated_at
    `, [newValue, targetUserId]);
    
    return updatedUser.rows[0];
  });
};

// 申请呼号变更
export const requestCallsignChange = async (userId, newCallsign, reason) => {
  // 检查新呼号是否已被使用
  const existingUser = await getOne(`
    SELECT id FROM users 
    WHERE callsign = $1 AND id != $2 AND is_active = true
  `, [newCallsign, userId]);
  
  if (existingUser) {
    throw new Error('该呼号已被使用');
  }
  
  // 获取当前呼号
  const currentUser = await getOne(`
    SELECT callsign FROM users WHERE id = $1
  `, [userId]);
  
  if (!currentUser) {
    throw new Error('用户不存在');
  }
  
  // 检查是否有待审核的申请
  const pendingRequest = await getOne(`
    SELECT id FROM callsign_change_requests 
    WHERE user_id = $1 AND status = 'pending'
  `, [userId]);
  
  if (pendingRequest) {
    throw new Error('您已有待审核的呼号变更申请');
  }
  
  // 创建变更申请
  const request = await insert(`
    INSERT INTO callsign_change_requests (user_id, current_callsign, requested_callsign, reason)
    VALUES ($1, $2, $3, $4)
  `, [userId, currentUser.callsign, newCallsign, reason]);
  
  return request;
};

// 审核呼号变更
export const reviewCallsignChange = async (reviewerId, requestId, status, reviewNotes) => {
  // 获取申请信息
  const request = await getOne(`
    SELECT ccr.*, u.email 
    FROM callsign_change_requests ccr
    JOIN users u ON ccr.user_id = u.id
    WHERE ccr.id = $1
  `, [requestId]);
  
  if (!request) {
    throw new Error('申请不存在');
  }
  
  if (request.status !== 'pending') {
    throw new Error('申请已被处理');
  }
  
  return await transaction(async (client) => {
    // 更新申请状态
    await client.query(`
      UPDATE callsign_change_requests 
      SET status = $1, reviewer_id = $2, review_notes = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [status, reviewerId, reviewNotes, requestId]);
    
    // 如果通过，更新用户呼号
    let updatedUser = null;
    if (status === 'approved') {
      const result = await client.query(`
        UPDATE users 
        SET callsign = $1 
        WHERE id = $2 
        RETURNING id, email, callsign, role, is_active, created_at, updated_at
      `, [request.requested_callsign, request.user_id]);
      
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
  let query = `
    SELECT ccr.*, u.email as applicant_email, u.callsign as applicant_callsign,
           r.email as reviewer_email, r.callsign as reviewer_callsign
    FROM callsign_change_requests ccr
    JOIN users u ON ccr.user_id = u.id
    LEFT JOIN users r ON ccr.reviewer_id = r.id
  `;
  
  const params = [];
  if (status) {
    query += ' WHERE ccr.status = $1 ORDER BY ccr.created_at DESC';
    params.push(status);
  } else {
    query += ' ORDER BY ccr.created_at DESC';
  }
  
  return await getMany(query, params);
};

// 获取用户列表
export const getUsers = async (role = null, isActive = true) => {
  let query = `
    SELECT id, email, callsign, role, is_active, last_login, created_at, updated_at
    FROM users
    WHERE is_active = $1
  `;
  const params = [isActive];
  
  if (role) {
    query += ' AND role = $2 ORDER BY created_at DESC';
    params.push(role);
  } else {
    query += ' ORDER BY created_at DESC';
  }
  
  return await getMany(query, params);
};

// 修改用户角色
export const updateUserRole = async (operatorId, targetUserId, newRole) => {
  // 检查权限（只有系统管理员可以修改角色）
  const canModify = await checkUserModificationPermission(operatorId, targetUserId, 'role');
  
  if (!canModify) {
    throw new Error('只有系统管理员才能修改用户角色');
  }
  
  // 获取当前角色
  const currentUser = await getOne(`
    SELECT role FROM users WHERE id = $1
  `, [targetUserId]);
  
  if (!currentUser) {
    throw new Error('用户不存在');
  }
  
  // 更新角色
  return await transaction(async (client) => {
    // 记录修改历史
    await client.query(`
      INSERT INTO user_info_changes (user_id, field_name, old_value, new_value, change_reason)
      VALUES ($1, 'role', $2, $3, '系统管理员修改用户角色')
    `, [targetUserId, currentUser.role, newRole]);
    
    // 更新用户角色
    const updatedUser = await client.query(`
      UPDATE users 
      SET role = $1 
      WHERE id = $2 
      RETURNING id, email, callsign, role, is_active, created_at, updated_at
    `, [newRole, targetUserId]);
    
    return updatedUser.rows[0];
  });
};

// 删除用户（软删除）
export const deleteUser = async (operatorId, targetUserId) => {
  // 检查权限
  const canDelete = await checkUserPermission(operatorId, 'delete_user');
  
  if (!canDelete) {
    throw new Error('没有权限删除用户');
  }
  
  // 软删除：设置为非活跃状态
  const deletedUser = await update(`
    UPDATE users 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND is_active = true
    RETURNING id, email, callsign, role, is_active, created_at, updated_at
  `, [targetUserId]);
  
  if (!deletedUser) {
    throw new Error('用户不存在或已被删除');
  }
  
  return deletedUser;
};