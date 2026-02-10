import express from 'express';
import { PrismaClient } from '@db';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import { authenticateToken } from '../middleware/authenticateToken.js';
import { sendOk, sendError } from '../utils/response.js';

const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pota_park',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
