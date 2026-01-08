// src/pages/ApplicationsList.tsx
import { useState, useEffect, useContext, useRef } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider
} from '@mui/material';
import axios from 'axios';
import { AuthContext } from '../App';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'pota_synced';

type ParkApplication = {
  id: number;
  dx_entity: string;
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

function ApplicationsList() {
  const { user, isAuthLoading } = useContext(AuthContext);

  const [applications, setApplications] = useState<ParkApplication[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'detail' | 'review'>('detail');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ParkApplicationDetail | null>(null);

  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviewRequestRef = useRef<Record<number, boolean>>({});

  const hasRequestedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

  const isReviewer =
    user?.role === 'park_reviewer' || user?.role === 'pota_representative';

  // 只在用户 ID 真正变化时才重置请求标志
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (currentUserId !== userIdRef.current) {
      userIdRef.current = currentUserId;
      hasRequestedRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    // 等待认证加载完成，且用户已登录时才发起请求
    if (isAuthLoading || !user) return;

    // 使用 ref 确保组件挂载时只请求一次
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get('/api/park-applications');
        setApplications(res.data?.applications || []);
      } catch (e: any) {
        setError(e?.response?.data?.error || '获取申请列表失败');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthLoading, user]);

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return app.status === 'pending';
    if (filter === 'approved') return app.status === 'approved';
    if (filter === 'rejected') return app.status === 'rejected';
    if (filter === 'uploaded') return app.status === 'pota_synced';
    return true;
  });

  const getRowBackgroundColor = (app: ParkApplication) => {
    if (app.status === 'pota_synced') return '#c8e6c9'; // 绿色 - 已上传
    if (app.status === 'rejected') return '#ffcdd2'; // 红色 - 未通过
    if (app.status === 'pending') return '#fff9c4'; // 黄色 - 待审核
    if (app.status === 'approved') return '#ffe0b2'; // 橙色 - 已通过待上传
    return '';
  };

  const openDialog = async (app: ParkApplication, mode: 'detail' | 'review') => {
    setDetailOpen(true);
    setDialogMode(mode);
    setSelected(null);
    setDetailError(null);
    setReviewNotes('');
    setRejectionReason('');

    try {
      setDetailLoading(true);
      const res = await axios.get(`/api/park-applications/${app.id}`);
      setSelected(res.data?.application || null);
    } catch (e: any) {
      setDetailError(e?.response?.data?.error || '获取申请详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (app: ParkApplication) => openDialog(app, 'detail');
  const openReview = (app: ParkApplication) => openDialog(app, 'review');

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

      const res = await axios.put(`/api/park-applications/${selected.id}/review`, {
        status,
        reviewNotes: reviewNotes.trim(),
        rejectionReason: status === 'rejected' ? rejectionReason.trim() : null
      });

      const updated = res.data?.application;
      if (updated) {
        setApplications((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
        setSelected((prev) => (prev ? { ...prev, ...updated } : prev));
      }

      setDetailOpen(false);
    } catch (e: any) {
      setDetailError(e?.response?.data?.error || '审核失败');
    } finally {
      setReviewSubmitting(false);
      reviewRequestRef.current[selected.id] = false;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        申请列表
      </Typography>

      {loading && <Typography sx={{ mb: 2, color: 'text.secondary' }}>加载中...</Typography>}
      {error && (
        <Typography sx={{ mb: 2 }} color="error">
          {error}
        </Typography>
      )}

      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>筛选状态</InputLabel>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as string)}>
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="pending">待审核</MenuItem>
            <MenuItem value="approved">已通过</MenuItem>
            <MenuItem value="rejected">未通过</MenuItem>
            <MenuItem value="uploaded">已上传POTA</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>申请者呼号</TableCell>
              <TableCell>申请时间</TableCell>
              <TableCell>POTA编号</TableCell>
              <TableCell>省份</TableCell>
              <TableCell>公园名称</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>是否上传POTA</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApps.map((app) => (
              <TableRow key={app.id} sx={{ backgroundColor: getRowBackgroundColor(app) }}>
                <TableCell>{app.applicant_callsign}</TableCell>
                <TableCell>{new Date(app.created_at).toLocaleString()}</TableCell>
                <TableCell>{app.dx_entity}</TableCell>
                <TableCell>{app.province_name}</TableCell>
                <TableCell>{app.park_name}</TableCell>
                <TableCell>
                  {app.status === 'pending' && '待审核'}
                  {app.status === 'approved' && '已通过（待上传）'}
                  {app.status === 'pota_synced' && '已上传 POTA'}
                  {app.status === 'rejected' && '未通过'}
                </TableCell>
                <TableCell>{app.status === 'pota_synced' ? '是' : '否'}</TableCell>
                <TableCell>{app.rejection_reason || app.pota_notes || '-'}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => openDetail(app)}>
                    详情
                  </Button>
                  {isReviewer && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => openReview(app)}
                      disabled={app.status !== 'pending'}
                    >
                      审核
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && filteredApps.length === 0 && (
        <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>暂无符合条件的申请</Typography>
      )}

      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="md">
        <DialogTitle>{dialogMode === 'review' ? '审核申请' : '申请详情'}</DialogTitle>
        <DialogContent>
          {detailLoading && <Typography sx={{ color: 'text.secondary' }}>加载中...</Typography>}
          {detailError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {detailError}
            </Alert>
          )}

          {selected && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {selected.park_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                申请者：{selected.applicant_callsign}　|　申请时间：{new Date(selected.created_at).toLocaleString()}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="DX 实体" value={selected.dx_entity} InputProps={{ readOnly: true }} />
                <TextField label="省份" value={selected.province_name} InputProps={{ readOnly: true }} />
                <TextField
                  label="省份代码"
                  value={selected.province_iso_code || ''}
                  InputProps={{ readOnly: true }}
                />
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

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                当前状态：
                {selected.status === 'pending' && '待审核'}
                {selected.status === 'approved' && '已通过（待上传）'}
                {selected.status === 'pota_synced' && '已上传 POTA'}
                {selected.status === 'rejected' && '未通过'}
              </Typography>

              {dialogMode === 'review' && isReviewer && selected.status === 'pending' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="审核备注（必填）"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    multiline
                    minRows={2}
                    sx={{ gridColumn: { xs: '1 / -1' } }}
                  />
                  <TextField
                    label="拒绝原因（拒绝时必填）"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    multiline
                    minRows={2}
                    sx={{ gridColumn: { xs: '1 / -1' } }}
                  />
                </Box>
              )}

              {dialogMode === 'review' && !isReviewer && (
                <Typography variant="body2" color="text.secondary">
                  你的角色没有审核权限。
                </Typography>
              )}
            </Box>
          )}
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
