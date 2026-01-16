import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as userService from '../services/userService.js';
import { sendBizError, sendError, sendOk } from '../utils/response.js';

const router = express.Router();

const updateUserInfoSchema = z.object({
  field: z.string(),
  value: z.unknown(),
  reason: z.string().optional(),
  oldPassword: z.string().optional(),
});

const updateUserRoleSchema = z.object({
  role: z.string().min(1),
  reason: z.string().min(1),
});

const updateUserActiveSchema = z.object({
  isActive: z.boolean(),
});

const updateUserPasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(1),
  reason: z.string().optional(),
});

// 获取用户列表（仅管理员）
router.get(
  '/api/users',
  authenticateToken,
  requirePermission('view_all_users'),
  async (req, res) => {
    try {
      const { role, isActive } = req.query;

      let isActiveParsed: boolean | null = null;
      if (isActive === 'true') isActiveParsed = true;
      if (isActive === 'false') isActiveParsed = false;

      const users = await userService.getUsers((role as string) || null, isActiveParsed);

      return sendOk(res, { users }, 'ok');
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return sendError(res, error, {
        httpMessage: '获取用户列表失败',
        bizMessage: '获取用户列表失败',
      });
    }
  }
);

// 修改用户信息
router.put('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = updateUserInfoSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', '字段名和新值不能为空', null);
    }
    const { field, value, reason, oldPassword } = parsed.data;

    if (!field || value === undefined || value === null) {
      return sendBizError(res, 'VALIDATION_ERROR', '字段名和新值不能为空', null);
    }

    // 如果是修改邮箱，需要验证原密码
    if (field === 'email' && !oldPassword) {
      return sendBizError(res, 'VALIDATION_ERROR', '修改邮箱需要提供原密码', null);
    }

    const updatedUser = await userService.updateUserInfo(
      req.user?.id,
      parseInt(userId, 10),
      field,
      String(value),
      reason,
      oldPassword
    );

    return sendOk(res, { user: updatedUser }, '用户信息更新成功');
  } catch (error) {
    console.error('修改用户信息失败:', error);
    return sendError(res, error, { bizMessage: '修改用户信息失败' });
  }
});

// 修改用户角色（必须 reason）
router.put('/api/users/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', '角色不能为空', null);
    }
    const { role, reason } = parsed.data;

    if (!role) {
      return sendBizError(res, 'VALIDATION_ERROR', '角色不能为空', null);
    }

    const updatedUser = await userService.updateUserRole(
      req.user?.id,
      parseInt(userId, 10),
      role,
      reason
    );

    return sendOk(res, { user: updatedUser }, '用户角色更新成功');
  } catch (error) {
    console.error('修改用户角色失败:', error);
    return sendError(res, error, { bizMessage: '修改用户角色失败' });
  }
});

// 封禁/解封（不需要 reason，但写审计；封禁会吊销 refresh tokens）
router.put('/api/users/:userId/active', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = updateUserActiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', 'isActive 必须为 boolean', null);
    }
    const { isActive } = parsed.data;

    if (typeof isActive !== 'boolean') {
      return sendBizError(res, 'VALIDATION_ERROR', 'isActive 必须为 boolean', null);
    }

    const updatedUser = await userService.updateUserActive(
      req.user?.id,
      parseInt(userId, 10),
      isActive
    );

    return sendOk(res, { user: updatedUser }, isActive ? '用户已解封' : '用户已封禁');
  } catch (error) {
    console.error('封禁/解封用户失败:', error);
    return sendError(res, error, { bizMessage: '封禁/解封用户失败' });
  }
});

// 用户管理审计日志（仅系统管理员）
router.get(
  '/api/user-admin-audit-logs',
  authenticateToken,
  requirePermission('view_all_users'),
  async (req, res) => {
    try {
      const { action, targetUserId, operatorId, limit, offset } = req.query;

      const logs = await userService.getUserAdminAuditLogs({
        action: typeof action === 'string' ? action : null,
        targetUserId: typeof targetUserId === 'string' ? parseInt(targetUserId, 10) : null,
        operatorId: typeof operatorId === 'string' ? parseInt(operatorId, 10) : null,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 200,
        offset: typeof offset === 'string' ? parseInt(offset, 10) : 0,
      });

      return sendOk(res, { logs }, 'ok');
    } catch (error) {
      console.error('获取用户管理审计日志失败:', error);
      return sendError(res, error, {
        httpMessage: '获取用户管理审计日志失败',
        bizMessage: '获取用户管理审计日志失败',
      });
    }
  }
);

// 修改用户密码（仅限修改自己的密码）
router.put('/api/users/:userId/change-password', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const parsed = updateUserPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', '原密码和新密码不能为空', null);
    }
    const { oldPassword, newPassword, reason } = parsed.data;

    if (!oldPassword) {
      return sendBizError(res, 'VALIDATION_ERROR', '原密码不能为空', null);
    }

    if (!newPassword) {
      return sendBizError(res, 'VALIDATION_ERROR', '新密码不能为空', null);
    }

    if (newPassword.length < 6) {
      return sendBizError(res, 'VALIDATION_ERROR', '密码长度至少为6位', null);
    }

    // 确保用户只能修改自己的密码
    if (req.user?.id !== parseInt(userId, 10)) {
      return sendBizError(res, 'PERMISSION_ERROR', '只能修改自己的密码', null);
    }

    const updatedUser = await userService.updateUserPassword(
      req.user?.id,
      oldPassword,
      newPassword,
      reason
    );

    return sendOk(res, { user: updatedUser }, '密码更新成功');
  } catch (error) {
    console.error('修改用户密码失败:', error);
    return sendError(res, error, { bizMessage: '修改用户密码失败' });
  }
});

export default router;
