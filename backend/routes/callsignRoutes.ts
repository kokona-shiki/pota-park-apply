import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as userService from '../services/userService.js';
import { sendBizError, sendError, sendOk } from '../utils/response.js';
import { CallsignChangeRequestCreateSchema, CallsignChangeReviewSchema } from '../../shared/schemas/callsign.js';

const router = express.Router();

// 申请呼号变更
router.post('/api/callsign-change-requests', authenticateToken, async (req, res) => {
  try {
    const parsed = CallsignChangeRequestCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', '新呼号和申请原因不能为空', null);
    }
    const { newCallsign, reason } = parsed.data;

    const request = await userService.requestCallsignChange(req.user?.id, newCallsign, reason);

    return sendOk(res, { request }, '呼号变更申请提交成功');
  } catch (error) {
    console.error('呼号变更申请失败:', error);
    return sendError(res, error, { bizMessage: '呼号变更申请失败' });
  }
});

// 获取呼号变更申请列表
router.get(
  '/api/callsign-change-requests',
  authenticateToken,
  requirePermission('approve_callsign_change'),
  async (req, res) => {
    try {
      const { status } = req.query;
      const requests = await userService.getCallsignChangeRequests(status);

      return sendOk(res, { requests }, 'ok');
    } catch (error) {
      console.error('获取呼号变更申请失败:', error);
      return sendError(res, error, {
        httpMessage: '获取呼号变更申请失败',
        bizMessage: '获取呼号变更申请失败',
      });
    }
  }
);

// 审核呼号变更
router.put(
  '/api/callsign-change-requests/:requestId/review',
  authenticateToken,
  requirePermission('approve_callsign_change'),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const parsed = CallsignChangeReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的审核状态', null);
      }
      const { status, reviewNotes } = parsed.data;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的审核状态', null);
      }

      const result = await userService.reviewCallsignChange(
        req.user?.id,
        parseInt(requestId, 10),
        status,
        reviewNotes
      );

      return sendOk(res, result, `呼号变更${status === 'approved' ? '通过' : '拒绝'}`);
    } catch (error) {
      console.error('审核呼号变更失败:', error);
      return sendError(res, error, { bizMessage: '审核呼号变更失败' });
    }
  }
);

export default router;
