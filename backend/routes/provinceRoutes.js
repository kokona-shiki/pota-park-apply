import express from 'express';
import { getMany } from '../config/database.js';

const router = express.Router();

// 获取省份列表
router.get('/api/provinces', async (_req, res) => {
  try {
    const provinces = await getMany(`
      SELECT iso_code, zh_name, en_name, sort_order
      FROM provinces
      WHERE is_active = true
      ORDER BY sort_order ASC
    `);

    res.json({ provinces });
  } catch (error) {
    console.error('获取省份列表失败:', error);
    res.status(500).json({ error: '获取省份列表失败' });
  }
});

export default router;
