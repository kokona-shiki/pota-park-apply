// src/pages/CallsignChangeRequests.tsx
import { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider,
} from '@mui/material';
import axios from 'axios';
import { CallsignChangeRequestsDataSchema, CallsignReviewDataSchema } from '../../../shared/schemas/callsign';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { useAuth } from '../auth/useAuth';
import { useOnceOnMountWithAbort } from '../hooks/useOnceOnMount';
import { getApiErrorMessage } from '../utils/error';

interface CallsignChangeRequest {
  id: number;
  user_id: number;
  current_callsign: string;
  requested_callsign: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: number | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  applicant_email?: string;
  applicant_callsign?: string;
  reviewer_email?: string;
  reviewer_callsign?: string;
}

function CallsignChangeRequests() {
  const { user: currentUser, isAuthLoading } = useAuth();
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState<CallsignChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // 根据标签页确定要加载的状态
  const getStatusForTab = (): 'pending' | 'approved' | 'rejected' | null => {
    if (tab === 0) return 'pending';
    if (tab === 1) return 'approved';
    if (tab === 2) return 'rejected';
    return null; // 所有状态
  };

  // 加载申请数据
  const loadRequests = async (statusFilter: 'pending' | 'approved' | 'rejected' | null = null) => {
    if (isAuthLoading || !currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const params: { status?: string } = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const payload = await requestWithSchema(
        apiClient.get('/api/callsign-change-requests', {
          params,
        }),
        CallsignChangeRequestsDataSchema
      );

      setRequests((payload.requests || []).map(req => ({
        ...req,
        applicant_email: req.applicant_email || undefined,
        applicant_callsign: req.applicant_callsign || undefined,
        reviewer_email: req.reviewer_email || undefined,
        reviewer_callsign: req.reviewer_callsign || undefined
      })));
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '获取呼号变更申请失败'));
    } finally {
      setLoading(false);
    }
  };

  useOnceOnMountWithAbort(async (signal) => {
    if (isAuthLoading || !currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const status = getStatusForTab();
      const params: { status?: string } = {};
      if (status) {
        params.status = status;
      }
      const payload = await requestWithSchema(
        apiClient.get('/api/callsign-change-requests', {
          params,
          signal,
        }),
        CallsignChangeRequestsDataSchema
      );

      // 只有当请求未被取消时才更新状态
      if (!signal.aborted) {
        setRequests((payload.requests || []).map(req => ({
          ...req,
          applicant_email: req.applicant_email || undefined,
          applicant_callsign: req.applicant_callsign || undefined,
          reviewer_email: req.reviewer_email || undefined,
          reviewer_callsign: req.reviewer_callsign || undefined
        })));
      }
    } catch (e: unknown) {
      // 忽略被取消的请求错误
      if (axios.isCancel(e) || (e instanceof Error && (e.name === 'CanceledError' || e.name === 'AbortError'))) {
        console.debug('请求被取消:', (e as Error).message);
      } else {
        setError(getApiErrorMessage(e, '获取呼号变更申请失败'));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [tab, isAuthLoading, currentUser]);

  const handleReviewClick = (request: CallsignChangeRequest, status: 'approved' | 'rejected') => {
    setReviewRequestId(request.id);
    setReviewStatus(status);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!reviewRequestId) return;

    setReviewLoading(true);
    try {
      const payload = await requestWithSchema(
        apiClient.put(`/api/callsign-change-requests/${reviewRequestId}/review`, {
          status: reviewStatus,
          reviewNotes: reviewNotes,
        }),
        CallsignReviewDataSchema
      );

      // 更新本地状态
      setRequests((prev) =>
        prev.map((req) => {
          if (req.id === reviewRequestId) {
            // 检查响应结构并更新相应字段
            const requestData = payload.request;
            if (requestData) {
              return { 
                ...req, 
                ...requestData,
                applicant_email: requestData.applicant_email || undefined,
                applicant_callsign: requestData.applicant_callsign || undefined,
                reviewer_email: requestData.reviewer_email || undefined,
                reviewer_callsign: requestData.reviewer_callsign || undefined
              };
            }
            // 如果响应结构不符合预期，至少更新状态和审核信息
            return {
              ...req,
              status: reviewStatus,
              reviewer_id: currentUser?.id,
              review_notes: reviewNotes,
              reviewed_at: new Date().toISOString(),
            };
          }
          return req;
        })
      );

      setReviewDialogOpen(false);
      setReviewRequestId(null);
    } catch (e: unknown) {
      setError(
        getApiErrorMessage(e, `${reviewStatus === 'approved' ? '批准' : '拒绝'}呼号变更申请失败`)
      );
    } finally {
      setReviewLoading(false);
    }
  };

  // 根据标签页确定要显示的申请状态
  const getDisplayRequests = () => {
    if (tab === 0) return requests.filter((r) => r.status === 'pending');
    if (tab === 1) return requests.filter((r) => r.status === 'approved');
    if (tab === 2) return requests.filter((r) => r.status === 'rejected');
    // tab === 3 (全部) 或其他情况，返回所有请求
    return requests;
  };

  const displayRequests = getDisplayRequests();

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip label="待审核" color="warning" size="small" />;
      case 'approved':
        return <Chip label="已批准" color="success" size="small" />;
      case 'rejected':
        return <Chip label="已拒绝" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        呼号变更申请管理
      </Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mt: 1 }}>
        <Tab label="待审核" />
        <Tab label="已批准" />
        <Tab label="已拒绝" />
        <Tab label="全部" />
      </Tabs>

      <Divider sx={{ my: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {tab === 0 && '待审核申请'}
            {tab === 1 && '已批准申请'}
            {tab === 2 && '已拒绝申请'}
            {tab === 3 && '全部申请'}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              if (tab === 0) loadRequests('pending');
              else if (tab === 1) loadRequests('approved');
              else if (tab === 2) loadRequests('rejected');
              else loadRequests(null);
            }}
            disabled={loading}
          >
            刷新
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>申请人</TableCell>
                <TableCell>当前呼号</TableCell>
                <TableCell>申请呼号</TableCell>
                <TableCell>申请原因</TableCell>
                <TableCell>申请时间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : displayRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>
                    暂无申请
                  </TableCell>
                </TableRow>
              ) : (
                displayRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.applicant_callsign || request.applicant_email || '-'}
                    </TableCell>
                    <TableCell>{request.current_callsign}</TableCell>
                    <TableCell>{request.requested_callsign}</TableCell>
                    <TableCell>{request.reason}</TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleString()}</TableCell>
                    <TableCell>{getStatusChip(request.status)}</TableCell>
                    <TableCell>
                      {request.status === 'pending' && currentUser && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            sx={{ mr: 1 }}
                            onClick={() => handleReviewClick(request, 'approved')}
                          >
                            批准
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleReviewClick(request, 'rejected')}
                          >
                            拒绝
                          </Button>
                        </>
                      )}
                      {request.status !== 'pending' && (
                        <Typography variant="body2" color="text.secondary">
                          {request.reviewer_callsign || request.reviewer_email
                            ? `审核人: ${request.reviewer_callsign || request.reviewer_email}`
                            : '系统管理员'}
                          <br />
                          {request.reviewed_at
                            ? `审核时间: ${new Date(request.reviewed_at).toLocaleString()}`
                            : ''}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 审核对话框 */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewStatus === 'approved' ? '批准呼号变更申请' : '拒绝呼号变更申请'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {reviewRequestId && (
              <>
                {requests
                  .filter((r) => r.id === reviewRequestId)
                  .map((request) => (
                    <Box key={request.id} sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        申请人: {request.applicant_callsign || request.applicant_email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        当前呼号: {request.current_callsign} → 申请呼号:{' '}
                        {request.requested_callsign}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        申请原因: {request.reason}
                      </Typography>
                    </Box>
                  ))}
                <TextField
                  fullWidth
                  label="审核备注"
                  multiline
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewStatus === 'approved' ? '可选：批准原因或说明' : '必填：拒绝原因'
                  }
                  required={reviewStatus === 'rejected'}
                  margin="normal"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)} disabled={reviewLoading}>
            取消
          </Button>
          <Button
            onClick={handleReviewSubmit}
            disabled={reviewLoading || (reviewStatus === 'rejected' && !reviewNotes.trim())}
            variant="contained"
            color={reviewStatus === 'approved' ? 'success' : 'error'}
          >
            {reviewStatus === 'approved' ? '批准' : '拒绝'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CallsignChangeRequests;
