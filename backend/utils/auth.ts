import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getOne, getMany, insert, transaction, query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// -----------------
// 基础工具
// -----------------
export const normalizeEmail = (email: string): string =>
  String(email || '')
    .trim()
    .toLowerCase();
export const normalizeCallsign = (callsign: string): string =>
  String(callsign || '')
    .trim()
    .toUpperCase();

// 密码哈希
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// 验证密码
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// -----------------
// Access Token (JWT)
// -----------------
export const getAccessTokenExpiresIn = (role: string): string => {
  const highPrivilegeRoles = new Set(['park_reviewer', 'pota_representative', 'system_admin']);
  return highPrivilegeRoles.has(role) ? '5m' : '30m';
};

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  hasPotaImportPermission?: boolean;
  hasReviewPermission?: boolean;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  const expiresIn = getAccessTokenExpiresIn(payload?.role);
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new Error('无效的令牌');
  }
};

// -----------------
// User 查询
// -----------------
export interface User {
  id: number;
  email: string;
  callsign: string;
  password_hash?: string;
  role: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export const findUserByIdentifier = async (identifier: string): Promise<User | null> => {
  const id = String(identifier || '').trim();
  if (!id) return null;

  const user = await getOne<User>(
    `
    SELECT id, email, callsign, password_hash, role, is_active, last_login, created_at, updated_at
    FROM users
    WHERE lower(email) = lower($1) OR upper(callsign) = upper($1)
  `,
    [id]
  );

  return user;
};

export const findUserById = async (id: number): Promise<User | null> => {
  const user = await getOne<User>(
    `
    SELECT id, email, callsign, role, is_active, last_login, created_at, updated_at
    FROM users
    WHERE id = $1
  `,
    [id]
  );

  return user;
};

// -----------------
// RBAC
// -----------------
export interface Permission {
  permission_code: string;
  description: string;
}

export const checkUserPermission = async (
  userId: number,
  permissionCode: string
): Promise<boolean> => {
  const result = await getOne<{ has_permission: boolean }>(
    `
    SELECT COUNT(*) > 0 as has_permission
    FROM users u
    JOIN role_permissions rp ON u.role = rp.role
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = $1
      AND u.is_active = true
      AND p.permission_code = $2
  `,
    [userId, permissionCode]
  );

  return result?.has_permission || false;
};

export const checkUserModificationPermission = async (
  operatorId: number,
  targetUserId: number,
  field: string
): Promise<boolean> => {
  const result = await getOne<{ can_modify: boolean }>(
    `
    SELECT can_modify_user_info($1, $2, $3) as can_modify
  `,
    [operatorId, targetUserId, field]
  );

  return result?.can_modify || false;
};

export const getUserPermissions = async (userId: number): Promise<Permission[]> => {
  const permissions = await getMany<Permission>(
    `
    SELECT p.permission_code, p.description
    FROM users u
    JOIN role_permissions rp ON u.role = rp.role
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = $1 AND u.is_active = true
  `,
    [userId]
  );

  return permissions;
};

// -----------------
// Refresh Token（随机串 + 落库 + rotation + 重放检测）
// -----------------
const generateRefreshTokenPlain = (): string => crypto.randomBytes(48).toString('base64url');

const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

export const revokeAllRefreshTokensForUser = async (userId: number): Promise<void> => {
  await query(
    `
    UPDATE refresh_tokens
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND revoked_at IS NULL
  `,
    [userId]
  );
};

export const revokeRefreshToken = async (
  refreshTokenPlain: string
): Promise<{ user_id: number } | null> => {
  const tokenHash = hashRefreshToken(refreshTokenPlain);

  // 只吊销当前 token（rotation 已保证旧 token 会被吊销）
  const row = await getOne<{ user_id: number }>(
    `
    UPDATE refresh_tokens
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE token_hash = $1 AND revoked_at IS NULL
    RETURNING user_id
  `,
    [tokenHash]
  );

  return row;
};

export const createRefreshTokenForUser = async (
  userId: number,
  options: { userAgent?: string | null; ip?: string | null } = {}
): Promise<{ refreshToken: string }> => {
  const { userAgent = null, ip = null } = options;
  const refreshToken = generateRefreshTokenPlain();
  const tokenHash = hashRefreshToken(refreshToken);
  const familyId = crypto.randomUUID();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const absoluteExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  await insert(
    `
    INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at, absolute_expires_at, user_agent, ip)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `,
    [userId, familyId, tokenHash, expiresAt, absoluteExpiresAt, userAgent, ip]
  );

  return { refreshToken };
};

export interface RotateRefreshTokenResult {
  status: 'valid' | 'invalid' | 'expired' | 'replay' | 'user_disabled';
  user?: User;
  refreshToken?: string;
  userId?: number;
  familyId?: string;
  absoluteExpiresAt?: Date;
}

export const rotateRefreshToken = async (
  refreshTokenPlain: string,
  options: { userAgent?: string | null; ip?: string | null } = {}
): Promise<RotateRefreshTokenResult> => {
  const { userAgent = null, ip = null } = options;
  const tokenHash = hashRefreshToken(refreshTokenPlain);
  const tokenRow = await getOne<{
    id: number;
    user_id: number;
    family_id: string;
    expires_at: Date;
    absolute_expires_at: Date;
    revoked_at: Date | null;
  }>(
    `
    SELECT id, user_id, family_id, expires_at, absolute_expires_at, revoked_at
    FROM refresh_tokens
    WHERE token_hash = $1
  `,
    [tokenHash]
  );

  if (!tokenRow) {
    return { status: 'invalid' };
  }

  if (tokenRow.revoked_at) {
    // 重放：旧 token 已被 rotation 使用过，但又再次出现
    return { status: 'replay', userId: tokenRow.user_id, familyId: tokenRow.family_id };
  }

  const now = new Date();
  if (new Date(tokenRow.expires_at) <= now || new Date(tokenRow.absolute_expires_at) <= now) {
    return { status: 'expired', userId: tokenRow.user_id, familyId: tokenRow.family_id };
  }

  // 用户状态只在 refresh 时校验（符合你“不做 accessToken 立即失效”的取舍）
  const user = await getOne<User>(
    `
    SELECT id, email, callsign, role, is_active
    FROM users
    WHERE id = $1
  `,
    [tokenRow.user_id]
  );

  if (!user) return { status: 'invalid' };
  if (!user.is_active) return { status: 'user_disabled', userId: user.id };

  const newRefreshToken = generateRefreshTokenPlain();
  const newTokenHash = hashRefreshToken(newRefreshToken);

  const newExpiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const absoluteExpiresAt = new Date(tokenRow.absolute_expires_at);

  await transaction(async (client) => {
    // 1) 插入新 token
    const inserted = await client.query(
      `
      INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at, absolute_expires_at, user_agent, ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
      [user.id, tokenRow.family_id, newTokenHash, newExpiresAt, absoluteExpiresAt, userAgent, ip]
    );

    const newId = inserted.rows[0].id;

    // 2) 吊销旧 token（rotation）
    await client.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP,
          replaced_by = $2,
          last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND revoked_at IS NULL
    `,
      [tokenRow.id, newId]
    );

    return { newId };
  });

  return {
    status: 'valid',
    user,
    refreshToken: newRefreshToken,
    familyId: tokenRow.family_id,
    absoluteExpiresAt,
  };
};
