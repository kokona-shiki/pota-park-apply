// src/pages/ApplicationsList.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';
import type { ParkApplication, ParkApplicationDetail } from '../types/parkApplication';
import { ParkApplicationTable } from '../components/ParkApplicationTable';
import { ParkApplicationDetailDialog } from '../components/ParkApplicationDetailDialog';
import { ParkApplicationFlowDialog } from '../components/ParkApplicationFlowDialog';
import { stableSort } from '../utils/parkApplication';

type FilterValue = 'all' | 'pending' | 'approved' | 'rejected' | 'uploaded';

type DialogMode = 'detail' | 'review';

function ApplicationsList() {
  const { user, isAuthLoading } = useAuth();

  const [applications, setApplications] = useState<ParkApplication[]>([]);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [detailOpen, setDetailOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('detail');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ParkApplicationDetail | null>(null);
  const [flowTarget, setFlowTarget] = useState<ParkApplication | null>(null);

  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviewRequestRef = useRef<Record<number, boolean>>({});

  const hasRequestedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

  const isReviewer = user?.role === 'park_reviewer' || user?.role === 'pota_representative';

  // 只在用户 ID 真正变化时才重置请求标志
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (currentUserId !== userIdRef.current) {
      userIdRef.current = currentUserId;
      hasRequestedRef.current = false;
    }
  }, [user]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<{ applications?: ParkApplication[] }>('/api/park-applications');
      setApplications(res.data?.applications ?? []);
      setPage(0);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '获取申请列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    load();
  }, [isAuthLoading, user, load]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (filter === 'all') return true;
      if (filter === 'pending') return app.status === 'pending';
      if (filter === 'approved') return app.status === 'approved';
      if (filter === 'rejected') return app.status === 'rejected';
      if (filter === 'uploaded') return app.status === 'pota_synced';
      return true;
    });
  }, [applications, filter]);

  const sortedApps = useMemo(() => stableSort(filteredApps, 'desc', 'created_at'), [filteredApps]);

  const handleDetailClick = useCallback(
    async (app: ParkApplication) => {
      setDetailOpen(true);
      setDialogMode('detail');
      setSelected(null);
      setDetailError(null);
      setReviewNotes('');
      setRejectionReason('');

      try {
        setDetailLoading(true);
        const res = await axios.get<{ application?: ParkApplicationDetail | null }>(`/api/park-applications/${app.id}`);
        setSelected(res.data?.application ?? null);
      } catch (e: unknown) {
        setDetailError(getApiErrorMessage(e, '获取申请详情失败'));
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const handleReviewClick = useCallback(
    async (app: ParkApplication) => {
      setDetailOpen(true);
      setDialogMode('review');
      setSelected(null);
      setDetailError(null);
      setReviewNotes('');
      setRejectionReason('');

      try {
        setDetailLoading(true);
        const res = await axios.get<{ application?: ParkApplicationDetail | null }>(`/api/park-applications/${app.id}`);
        setSelected(res.data?.application ?? null);
      } catch (e: unknown) {
        setDetailError(getApiErrorMessage(e, '获取申请详情失败'));
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const handleFlowClick = useCallback((app: ParkApplication) => {
    setFlowTarget(app);
  }, []);

  const closeDetail = () => {
    if (reviewSubmitting) return;
    setDetailOpen(false);
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selected) return;

    if (!isReviewer) {
      setDetailError('你没有审核权限');
      return;
    }

    if (selected.status !== 'pending') {
      setDetailError('该申请不处于待审核状态');
      return;
    }

    if (!reviewNotes.trim()) {
      setDetailError('请填写审核备注');
      return;
    }

    if (status === 'rejected' && !rejectionReason.trim()) {
      setDetailError('拒绝时必须填写拒绝原因');
      return;
    }

    if (reviewRequestRef.current[selected.id]) return;
    reviewRequestRef.current[selected.id] = true;

    try {
      setReviewSubmitting(true);
      setDetailError(null);

      const res = await axios.put<{ application?: Partial<ParkApplicationDetail> }>(
        `/api/park-applications/${selected.id}/review`,
        {
          status,
          reviewNotes: reviewNotes.trim(),
          rejectionReason: status === 'rejected' ? rejectionReason.trim() : null
        }
      );

      const updated = res.data?.application;
      if (updated) {
        setApplications((prev) => prev.map((a) => (a.id === selected.id ? { ...a, ...updated } : a)));
        setSelected((prev) => (prev ? { ...prev, ...updated } : prev));
      }

      setDetailOpen(false);
    } catch (e: unknown) {
      setDetailError(getApiErrorMessage(e, '审核失败'));
    } finally {
      setReviewSubmitting(false);
      reviewRequestRef.current[selected.id] = false;
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Number.parseInt(e.target.value, 10);
    setRowsPerPage(next);
    setPage(0);
  };

  const pendingCount = filteredApps.filter((a) => a.status === 'pending').length;

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5">申请列表</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
              <Chip size="small" label={`显示 ${filteredApps.length} / ${applications.length} 条`} />
              <Chip size="small" color={pendingCount > 0 ? 'warning' : 'default'} label={`待审核 ${pendingCount} 条`} />
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>筛选状态</InputLabel>
              <Select
                value={filter}
                label="筛选状态"
                onChange={(e) => {
                  setFilter(e.target.value as FilterValue);
                  setPage(0);
                }}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="pending">待审核</MenuItem>
                <MenuItem value="approved">已通过</MenuItem>
                <MenuItem value="rejected">未通过</MenuItem>
                <MenuItem value="uploaded">已上传 POTA</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={load}
              disabled={loading || isAuthLoading || !user}
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              刷新
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      {loading && <LinearProgress />}
      <Divider />

      <ParkApplicationTable
        applications={sortedApps}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        columnConfig={{
          showApplicantCallsign: true, // 审核员可以看到申请者呼号
          showActions: true,
          showReviewButton: isReviewer // 审核员和POTA代表显示审核按钮
        }}
        onDetailClick={handleDetailClick}
        onFlowClick={handleFlowClick}
        onReviewClick={handleReviewClick}
        emptyMessage="暂无符合条件的申请"
      />

      <ParkApplicationDetailDialog
        open={detailOpen}
        onClose={closeDetail}
        application={selected}
        loading={detailLoading}
        error={detailError}
        mode={dialogMode}
        showReviewForm={dialogMode === 'review' && isReviewer && selected?.status === 'pending'}
        reviewNotes={reviewNotes}
        reviewRejectionReason={rejectionReason}
        onReviewNotesChange={setReviewNotes}
        onReviewRejectionReasonChange={setRejectionReason}
        onApprove={() => handleReview('approved')}
        onReject={() => handleReview('rejected')}
        reviewSubmitting={reviewSubmitting}
      />

      <ParkApplicationFlowDialog
        open={!!flowTarget}
        onClose={() => setFlowTarget(null)}
        application={flowTarget}
      />
    </Paper>
  );
}

export default ApplicationsList;
