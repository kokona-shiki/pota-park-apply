import express from 'express';
import { generateToken, findUserById, getUserPermissions } from '../utils/auth.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import * as userService from '../services/userService.js';

const router = express.Router();

// 用户注册
router.post('/api/register', async (req, res) => {
  try {
    const { email, callsign, password } = req.body;

    if (!email || !callsign || !password) {
      return res.status(400).json({ error: '邮箱、呼号和密码不能为空' });
    }

    const user = await userService.registerUser({ email, callsign, password });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: '注册成功',
      token,
      user
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 用户登录
router.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: '用户名/邮箱和密码不能为空' });
    }

    const user = await userService.loginUser(identifier, password);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: '登录成功',
      token,
      user
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取当前用户信息
router.get('/api/user-info', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取用户权限
router.get('/api/user-permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = await getUserPermissions(req.user.id);
    res.json({ permissions });
  } catch (error) {
    console.error('获取用户权限失败:', error);
    res.status(500).json({ error: '获取用户权限失败' });
  }
});

export default router;
