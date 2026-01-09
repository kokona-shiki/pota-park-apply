import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as parkApplicationService from '../services/parkApplicationService.js';
import { sendBizError, sendError, sendOk } from '../utils/response.js';

const router = express.Router();

// 提交公园申请
router.post('/api/park-applications', authenticateToken, async (req, res) => {
  try {
    const applicationData = req.body;

    const requiredFields = ['park_name', 'province_iso_code', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter((field) => !applicationData[field]);

    if (missingFields.length > 0) {
      // 业务错误：HTTP 200 + {code,message,data}
      return sendBizError(res, 'MISSING_FIELDS', '缺少必填字段', { missingFields });
    }

    const application = await parkApplicationService.submitParkApplication(req.user.id, applicationData);

    return sendOk(res, { application }, '公园申请提交成功');
  } catch (error) {
    console.error('提交公园申请失败:', error);
    return sendError(res, error, { bizMessage: '提交失败' });
  }
});

// 获取我的公园申请列表（普通用户）
router.get('/api/my-applications', authenticateToken, async (req, res) => {
  try {
    const { status, province } = req.query;

    const applications = await parkApplicationService.getMyApplications(req.user.id, status, province);

    return sendOk(res, { applications }, 'ok');
  } catch (error) {
    console.error('获取我的公园申请列表失败:', error);
    return sendError(res, error, { httpMessage: '获取我的公园申请列表失败', bizMessage: '获取我的公园申请列表失败' });
  }
});

// 获取公园申请列表（审核员/管理员）
router.get('/api/park-applications', authenticateToken, async (req, res) => {
  try {
    const { status, province, applicantId } = req.query;

    const applications = await parkApplicationService.getApplications(
      req.user.id,
      status,
      province,
      applicantId ? parseInt(applicantId, 10) : null
    );

    return sendOk(res, { applications }, 'ok');
  } catch (error) {
    console.error('获取公园申请列表失败:', error);
    return sendError(res, error, { httpMessage: '获取公园申请列表失败', bizMessage: '获取公园申请列表失败' });
  }
});

// 获取公园申请详情
router.get('/api/park-applications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await parkApplicationService.getApplicationById(req.user.id, parseInt(id, 10));

    return sendOk(res, { application }, 'ok');
  } catch (error) {
    console.error('获取公园申请详情失败:', error);
    return sendError(res, error, { bizMessage: '获取公园申请详情失败' });
  }
});

// 审核公园申请
router.put(
  '/api/park-applications/:id/review',
  authenticateToken,
  requirePermission('review_application'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reviewNotes, rejectionReason } = req.body;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的审核状态', null);
      }

      const application = await parkApplicationService.reviewApplication(
        req.user.id,
        parseInt(id, 10),
        status,
        reviewNotes,
        rejectionReason
      );

      return sendOk(res, { application }, `申请${status === 'approved' ? '通过' : '拒绝'}`);
    } catch (error) {
      console.error('审核公园申请失败:', error);
      return sendError(res, error, { bizMessage: '审核公园申请失败' });
    }
  }
);

// 重新审核公园申请
router.put('/api/park-applications/:id/re-review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return sendBizError(res, 'VALIDATION_ERROR', '无效的状态', null);
    }

    const application = await parkApplicationService.reReviewApplication(
      req.user.id,
      parseInt(id, 10),
      status,
      reviewNotes
    );

    return sendOk(res, { application }, '重新审核成功');
  } catch (error) {
    console.error('重新审核公园申请失败:', error);
    return sendError(res, error, { bizMessage: '重新审核公园申请失败' });
  }
});

// 录入POTA系统
router.put(
  '/api/park-applications/:id/sync-pota',
  authenticateToken,
  requirePermission('sync_to_pota'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { potaNotes } = req.body;

      const application = await parkApplicationService.syncToPOTA(req.user.id, parseInt(id, 10), potaNotes);

      return sendOk(res, { application }, 'POTA系统录入成功');
    } catch (error) {
      console.error('POTA系统录入失败:', error);
      return sendError(res, error, { bizMessage: 'POTA系统录入失败' });
    }
  }
);

// 获取申请审核记录
router.get('/api/park-applications/:id/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await parkApplicationService.getAuditLogs(req.user.id, parseInt(id, 10));

    return sendOk(res, { logs }, 'ok');
  } catch (error) {
    console.error('获取审核记录失败:', error);
    return sendError(res, error, { bizMessage: '获取审核记录失败' });
  }
});

// 创建审核提醒
router.post(
  '/api/park-applications/:id/reminders',
  authenticateToken,
  requirePermission('remind_review'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reminderType, notes, remindedTo } = req.body;

      if (!reminderType || !['general', 'urgent', 'escalated'].includes(reminderType)) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的提醒类型', null);
      }

      const reminder = await parkApplicationService.createReviewReminder(
        req.user.id,
        parseInt(id, 10),
        reminderType,
        notes,
        remindedTo ? parseInt(remindedTo, 10) : null
      );

      return sendOk(res, { reminder }, '审核提醒创建成功');
    } catch (error) {
      console.error('创建审核提醒失败:', error);
      return sendError(res, error, { bizMessage: '创建审核提醒失败' });
    }
  }
);

// 获取审核提醒列表
router.get('/api/review-reminders', authenticateToken, async (req, res) => {
  try {
    const { applicationId, acknowledged } = req.query;

    const reminders = await parkApplicationService.getReviewReminders(
      req.user.id,
      applicationId ? parseInt(applicationId, 10) : null,
      acknowledged !== null ? acknowledged === 'true' : null
    );

    return sendOk(res, { reminders }, 'ok');
  } catch (error) {
    console.error('获取审核提醒失败:', error);
    return sendError(res, error, { httpMessage: '获取审核提醒失败', bizMessage: '获取审核提醒失败' });
  }
});

export default router;
