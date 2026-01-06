import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as userService from '../services/userService.js';

const router = express.Router();

// 获取用户列表
router.get('/api/users', authenticateToken, requirePermission('view_all_users'), async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const users = await userService.getUsers(role, isActive !== 'false');

    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 修改用户信息
router.put('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { field, value, reason } = req.body;

    if (!field || !value) {
      return res.status(400).json({ error: '字段名和新值不能为空' });
    }

    const updatedUser = await userService.updateUserInfo(
      req.user.id,
      parseInt(userId),
      field,
      value,
      reason
    );

    res.json({
      success: true,
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('修改用户信息失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 修改用户角色（业务层会做最终权限校验）
router.put('/api/users/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: '角色不能为空' });
    }

    const updatedUser = await userService.updateUserRole(
      req.user.id,
      parseInt(userId),
      role
    );

    res.json({
      success: true,
      message: '用户角色更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('修改用户角色失败:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
