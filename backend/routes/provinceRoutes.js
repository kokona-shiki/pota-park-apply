import express from 'express';
import { getMany } from '../config/database.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = express.Router();

// 获取省份列表（仅登录用户可用；role=banned 不允许访问）
router.get('/api/provinces', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role === 'banned') {
      return res.status(403).json({ error: '权限不足' });
    }

    const provinces = await getMany(
      `
      SELECT iso_code, zh_name, en_name, sort_order
      FROM provinces
      WHERE is_active = true
      ORDER BY sort_order ASC
    `
    );

    res.json({ provinces });
  } catch (error) {
    console.error('获取省份列表失败:', error);
    res.status(500).json({ error: '获取省份列表失败' });
  }
});

export default router;
