// src/pages/ApplicationsList.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'pota_synced';

type ParkApplication = {
  id: number;
  park_name: string;
  province_name: string;
  status: ApplicationStatus;
  created_at: string;

  applicant_callsign: string;

  rejection_reason?: string | null;
  pota_notes?: string | null;
  pota_synced_at?: string | null;
};

type ParkApplicationDetail = ParkApplication & {
  province_iso_code?: string;
  park_type?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  website?: string | null;
  description?: string | null;
};

type FilterValue = 'all' | 'pending' | 'approved' | 'rejected' | 'uploaded';

type DialogMode = 'detail' | 'review';

function formatDateTime(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

function getStatusMeta(status: ApplicationStatus) {
  switch (status) {
    case 'pending':
      return { label: '待审核', color: 'warning' as const };
    case 'approved':
      return { label: '已通过（待上传）', color: 'info' as const };
    case 'pota_synced':
      return { label: '已上传 POTA', color: 'success' as const };
    case 'rejected':
      return { label: '未通过', color: 'error' as const };
    default:
      return { label: status, color: 'default' as const };
  }
}

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

  const pagedApps = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredApps.slice(start, start + rowsPerPage);
  }, [filteredApps, page, rowsPerPage]);

  const openDialog = useCallback(
    async (app: ParkApplication, mode: DialogMode) => {
      setDetailOpen(true);
      setDialogMode(mode);
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

      <TableContainer sx={{ maxHeight: 680 }}>
        <Table stickyHeader size="small" aria-label="申请列表" sx={{ minWidth: 920 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>申请时间</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>申请者呼号</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>省份</TableCell>
              <TableCell>公园名称</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>状态</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>同步到 POTA</TableCell>
              <TableCell>备注</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', pr: 2 }}>
                操作
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {!loading && pagedApps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">暂无符合条件的申请</Typography>
                </TableCell>
              </TableRow>
            ) : (
              pagedApps.map((app) => {
                const statusMeta = getStatusMeta(app.status);
                const notes = app.rejection_reason || app.pota_notes || '';

                return (
                  <TableRow key={app.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(app.created_at)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }}>{app.applicant_callsign}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{app.province_name || '-'}</TableCell>
                    <TableCell>
                      <Tooltip title={app.park_name || ''} placement="top" arrow>
                        <Typography noWrap sx={{ maxWidth: 320 }}>
                          {app.park_name || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>{app.status === 'pota_synced' ? '是' : '否'}</TableCell>
                    <TableCell>
                      {notes ? (
                        <Tooltip title={notes} placement="top" arrow>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                            <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Typography noWrap sx={{ color: 'text.secondary', maxWidth: 320 }}>
                              {notes}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      ) : (
                        <Typography color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', pr: 2 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" variant="outlined" onClick={() => openDialog(app, 'detail')}>
                          详情
                        </Button>
                        {isReviewer && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => openDialog(app, 'review')}
                            disabled={app.status !== 'pending'}
                          >
                            审核
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredApps.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="每页行数"
      />

      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="md">
        <DialogTitle>{dialogMode === 'review' ? '审核申请' : '申请详情'}</DialogTitle>
        <DialogContent dividers>
          {detailLoading && <LinearProgress sx={{ mb: 2 }} />}
          {detailError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDetailError(null)}>
              {detailError}
            </Alert>
          )}

          {selected ? (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 0 }} noWrap title={selected.park_name}>
                  {selected.park_name}
                </Typography>
                <Chip size="small" label={getStatusMeta(selected.status).label} color={getStatusMeta(selected.status).color} />
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                申请者：{selected.applicant_callsign} | 申请时间：{formatDateTime(selected.created_at)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="申请编号" value={String(selected.id)} InputProps={{ readOnly: true }} />
                <TextField label="省份" value={selected.province_name} InputProps={{ readOnly: true }} />
                <TextField label="省份代码" value={selected.province_iso_code || ''} InputProps={{ readOnly: true }} />
                <TextField label="公园类型" value={selected.park_type || ''} InputProps={{ readOnly: true }} />
                <TextField label="纬度" value={String(selected.latitude ?? '')} InputProps={{ readOnly: true }} />
                <TextField label="经度" value={String(selected.longitude ?? '')} InputProps={{ readOnly: true }} />
                <TextField
                  label="网站"
                  value={selected.website || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ gridColumn: { xs: '1 / -1' } }}
                />
                <TextField
                  label="描述"
                  value={selected.description || ''}
                  InputProps={{ readOnly: true }}
                  multiline
                  minRows={2}
                  sx={{ gridColumn: { xs: '1 / -1' } }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {dialogMode === 'review' && isReviewer && selected.status === 'pending' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                  <TextField
                    label="审核备注（必填）"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    multiline
                    minRows={2}
                  />
                  <TextField
                    label="拒绝原因（拒绝时必填）"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    multiline
                    minRows={2}
                  />
                </Box>
              )}

              {dialogMode === 'review' && !isReviewer && (
                <Typography variant="body2" color="text.secondary">
                  你的角色没有审核权限。
                </Typography>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail} disabled={reviewSubmitting}>
            关闭
          </Button>

          {dialogMode === 'review' && isReviewer && selected?.status === 'pending' && (
            <>
              <Button onClick={() => handleReview('rejected')} color="error" disabled={reviewSubmitting}>
                拒绝
              </Button>
              <Button onClick={() => handleReview('approved')} variant="contained" disabled={reviewSubmitting}>
                通过
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default ApplicationsList;
