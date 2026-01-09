import express from 'express';
import { getMany } from '../config/database.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { sendHttpError, sendOk, sendError } from '../utils/response.js';

const router = express.Router();

// 获取省份列表（仅登录用户可用；role=banned 不允许访问）
router.get('/api/provinces', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role === 'banned') {
      return sendHttpError(res, 403, 'FORBIDDEN', '权限不足', null);
    }

    const provinces = await getMany(
      `
      SELECT iso_code, zh_name, en_name, sort_order
      FROM provinces
      WHERE is_active = true
      ORDER BY sort_order ASC
    `
    );

    return sendOk(res, { provinces }, 'ok');
  } catch (error) {
    console.error('获取省份列表失败:', error);
    return sendError(res, error, { httpMessage: '获取省份列表失败', bizMessage: '获取省份列表失败' });
  }
});

export default router;
