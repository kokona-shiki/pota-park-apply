import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { sendOk, sendError } from '../utils/response.js';

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 获取省份列表（仅登录用户可用）
router.get('/api/provinces', authenticateToken, async (req, res) => {
  try {
    const provinces = await prisma.province.findMany({
      where: {
        is_active: true,
      },
      select: {
        iso_code: true,
        zh_name: true,
        en_name: true,
        sort_order: true,
      },
      orderBy: {
        sort_order: 'asc',
      },
    });

    return sendOk(res, { provinces }, 'ok');
  } catch (error) {
    console.error('获取省份列表失败:', error);
    return sendError(res, error, {
      httpMessage: '获取省份列表失败',
      bizMessage: '获取省份列表失败',
    });
  }
});

export default router;
