import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as userService from '../services/userService.js';
import { sendBizError, sendError, sendOk } from '../utils/response.js';

const router = express.Router();

// 获取用户列表（仅管理员）
router.get(
  '/api/users',
  authenticateToken,
  requirePermission('view_all_users'),
  async (req, res) => {
    try {
      const { role, isActive } = req.query;

      let isActiveParsed = null;
      if (isActive === 'true') isActiveParsed = true;
      if (isActive === 'false') isActiveParsed = false;

      const users = await userService.getUsers(role || null, isActiveParsed);

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
    const { field, value, reason, oldPassword } = req.body;

    if (!field || value === undefined || value === null) {
      return sendBizError(res, 'VALIDATION_ERROR', '字段名和新值不能为空', null);
    }

    // 如果是修改邮箱，需要验证原密码
    if (field === 'email' && !oldPassword) {
      return sendBizError(res, 'VALIDATION_ERROR', '修改邮箱需要提供原密码', null);
    }

    const updatedUser = await userService.updateUserInfo(
      req.user.id,
      parseInt(userId, 10),
      field,
      value,
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
    const { role, reason } = req.body;

    if (!role) {
      return sendBizError(res, 'VALIDATION_ERROR', '角色不能为空', null);
    }

    const updatedUser = await userService.updateUserRole(
      req.user.id,
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
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendBizError(res, 'VALIDATION_ERROR', 'isActive 必须为 boolean', null);
    }

    const updatedUser = await userService.updateUserActive(
      req.user.id,
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
        action: action || null,
        targetUserId: targetUserId || null,
        operatorId: operatorId || null,
        limit: limit || 200,
        offset: offset || 0,
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
    const { oldPassword, newPassword, reason } = req.body;

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
    if (req.user.id !== parseInt(userId, 10)) {
      return sendBizError(res, 'PERMISSION_ERROR', '只能修改自己的密码', null);
    }

    const updatedUser = await userService.updateUserPassword(
      req.user.id,
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
