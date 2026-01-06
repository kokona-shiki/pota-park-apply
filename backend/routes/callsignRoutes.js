import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as userService from '../services/userService.js';

const router = express.Router();

// 申请呼号变更
router.post('/api/callsign-change-requests', authenticateToken, async (req, res) => {
  try {
    const { newCallsign, reason } = req.body;

    if (!newCallsign || !reason) {
      return res.status(400).json({ error: '新呼号和申请原因不能为空' });
    }

    const request = await userService.requestCallsignChange(req.user.id, newCallsign, reason);

    res.json({
      success: true,
      message: '呼号变更申请提交成功',
      request
    });
  } catch (error) {
    console.error('呼号变更申请失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取呼号变更申请列表
router.get('/api/callsign-change-requests', authenticateToken, requirePermission('approve_callsign_change'), async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await userService.getCallsignChangeRequests(status);

    res.json({ requests });
  } catch (error) {
    console.error('获取呼号变更申请失败:', error);
    res.status(500).json({ error: '获取呼号变更申请失败' });
  }
});

// 审核呼号变更
router.put('/api/callsign-change-requests/:requestId/review', authenticateToken, requirePermission('approve_callsign_change'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '无效的审核状态' });
    }

    const result = await userService.reviewCallsignChange(
      req.user.id,
      parseInt(requestId),
      status,
      reviewNotes
    );

    res.json({
      success: true,
      message: `呼号变更${status === 'approved' ? '通过' : '拒绝'}`,
      ...result
    });
  } catch (error) {
    console.error('审核呼号变更失败:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
