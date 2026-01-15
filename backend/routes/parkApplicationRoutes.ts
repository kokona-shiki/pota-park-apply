import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import * as parkApplicationService from '../services/parkApplicationService.js';
import { sendBizError, sendError, sendOk } from '../utils/response.js';
import { ParkApplicationSubmitRequestSchema } from '../../shared/schemas/parkApplication.js';

const router = express.Router();

const reviewSchema = z.object({
  status: z.union([z.literal('approved'), z.literal('rejected')]),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().nullable().optional(),
});

const reReviewSchema = z.object({
  status: z.union([z.literal('approved'), z.literal('rejected')]),
  reviewNotes: z.string().optional(),
});

const syncSchema = z.object({
  potaNotes: z.string().optional(),
});

const reminderSchema = z.object({
  reminderType: z.union([z.literal('general'), z.literal('urgent'), z.literal('escalated')]),
  notes: z.string().optional(),
  remindedTo: z.union([z.string(), z.number()]).optional(),
});

// 提交公园申请
router.post('/api/park-applications', authenticateToken, async (req, res) => {
  try {
    const parsed = ParkApplicationSubmitRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'MISSING_FIELDS', '缺少必填字段', {
        missingFields: parsed.error.issues.map((issue) => issue.path.join('.')),
      });
    }

    const applicationData = parsed.data;

    // 验证省份字段（必须有省份信息）
    const hasProvinces =
      Array.isArray(applicationData.provinces) && applicationData.provinces.length > 0;

    if (!hasProvinces) {
      return sendBizError(res, 'MISSING_FIELDS', '缺少省份信息', { missingFields: ['provinces'] });
    }

    const requiredFields = ['park_name', 'latitude', 'longitude'];
    const missingFields = requiredFields.filter((field) => !applicationData[field]);

    if (missingFields.length > 0) {
      // 业务错误：HTTP 200 + {code,message,data}
      return sendBizError(res, 'MISSING_FIELDS', '缺少必填字段', { missingFields });
    }

    const application = await parkApplicationService.submitParkApplication(
      req.user?.id,
      applicationData
    );

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

    const applications = await parkApplicationService.getMyApplications(
      req.user?.id,
      status,
      province
    );

    return sendOk(res, { applications }, 'ok');
  } catch (error) {
    console.error('获取我的公园申请列表失败:', error);
    return sendError(res, error, {
      httpMessage: '获取我的公园申请列表失败',
      bizMessage: '获取我的公园申请列表失败',
    });
  }
});

// 获取公园申请列表（审核员/管理员）
router.get('/api/park-applications', authenticateToken, async (req, res) => {
  try {
    const { status, province, applicantId } = req.query;

    const applications = await parkApplicationService.getApplications(
      req.user?.id,
      status,
      province,
      applicantId ? parseInt(applicantId as string, 10) : null
    );

    return sendOk(res, { applications }, 'ok');
  } catch (error) {
    console.error('获取公园申请列表失败:', error);
    return sendError(res, error, {
      httpMessage: '获取公园申请列表失败',
      bizMessage: '获取公园申请列表失败',
    });
  }
});

// 获取公园申请详情
router.get('/api/park-applications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await parkApplicationService.getApplicationById(
      req.user?.id,
      parseInt(id, 10)
    );

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
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的审核状态', null);
      }
      const { status, reviewNotes, rejectionReason } = parsed.data;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的审核状态', null);
      }

      const application = await parkApplicationService.reviewApplication(
        req.user?.id,
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
    const parsed = reReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', '无效的状态', null);
    }
    const { status, reviewNotes } = parsed.data;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return sendBizError(res, 'VALIDATION_ERROR', '无效的状态', null);
    }

    const application = await parkApplicationService.reReviewApplication(
      req.user?.id,
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
      const parsed = syncSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的备注内容', null);
      }
      const { potaNotes } = parsed.data;

      const application = await parkApplicationService.syncToPOTA(
        req.user?.id,
        parseInt(id, 10),
        potaNotes
      );

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

    const logs = await parkApplicationService.getAuditLogs(req.user?.id, parseInt(id, 10));

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
      const parsed = reminderSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的提醒类型', null);
      }
      const { reminderType, notes, remindedTo } = parsed.data;

      if (!reminderType || !['general', 'urgent', 'escalated'].includes(reminderType)) {
        return sendBizError(res, 'VALIDATION_ERROR', '无效的提醒类型', null);
      }

      const reminder = await parkApplicationService.createReviewReminder(
        req.user?.id,
        parseInt(id, 10),
        reminderType,
        notes,
        remindedTo ? parseInt(String(remindedTo), 10) : null
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
      req.user?.id,
      applicationId ? parseInt(applicationId as string, 10) : null,
      acknowledged !== null ? acknowledged === 'true' : null
    );

    return sendOk(res, { reminders }, 'ok');
  } catch (error) {
    console.error('获取审核提醒失败:', error);
    return sendError(res, error, {
      httpMessage: '获取审核提醒失败',
      bizMessage: '获取审核提醒失败',
    });
  }
});

export default router;
