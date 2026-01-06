import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne, getMany } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 密码哈希
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// 验证密码
export const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// 生成 JWT Token
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// 验证 JWT Token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('无效的令牌');
  }
};

// 根据邮箱或呼号查找用户
export const findUserByIdentifier = async (identifier) => {
  const user = await getOne(`
    SELECT id, email, callsign, password_hash, role, is_active, created_at, updated_at
    FROM users 
    WHERE (email = $1 OR callsign = $1) AND is_active = true
  `, [identifier]);
  
  return user;
};

// 根据ID查找用户
export const findUserById = async (id) => {
  const user = await getOne(`
    SELECT id, email, callsign, role, is_active, created_at, updated_at
    FROM users 
    WHERE id = $1 AND is_active = true
  `, [id]);
  
  return user;
};

// 检查用户权限
export const checkUserPermission = async (userId, permissionCode) => {
  const result = await getOne(`
    SELECT COUNT(*) > 0 as has_permission
    FROM users u
    JOIN role_permissions rp ON u.role = rp.role
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = $1 
      AND u.is_active = true
      AND p.permission_code = $2
  `, [userId, permissionCode]);
  
  return result?.has_permission || false;
};

// 检查是否可以修改用户信息
export const checkUserModificationPermission = async (operatorId, targetUserId, field) => {
  const result = await getOne(`
    SELECT can_modify_user_info($1, $2, $3) as can_modify
  `, [operatorId, targetUserId, field]);
  
  return result?.can_modify || false;
};

// 获取用户的所有权限
export const getUserPermissions = async (userId) => {
  const permissions = await getMany(`
    SELECT p.permission_code, p.description 
    FROM users u
    JOIN role_permissions rp ON u.role = rp.role
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = $1 AND u.is_active = true
  `, [userId]);
  
  return permissions;
};