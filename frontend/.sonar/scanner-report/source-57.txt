// src/pages/MyUploads.tsx
import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { ApplicationDetailDataSchema, ApplicationsDataSchema } from '../../../shared/schemas/parkApplication';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { useAuth } from '../auth/useAuth';
import { useOnceOnMount } from '../hooks/useOnceOnMount';
import { getApiErrorMessage } from '../utils/error';
import type { ParkApplication, ParkApplicationDetail } from '../types/parkApplication';
import { ParkApplicationTable } from '../components/ParkApplicationTable';
import { ParkApplicationDetailDialog } from '../components/ParkApplicationDetailDialog';
import { ParkApplicationFlowDialog } from '../components/ParkApplicationFlowDialog';
import { stableSort } from '../utils/parkApplication';

type Order = 'asc' | 'desc';
type OrderBy = 'created_at' | 'park_name' | 'province_name' | 'status';

function MyUploads() {
  const { user, isAuthLoading } = useAuth();

  const [uploads, setUploads] = useState<ParkApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('created_at');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ParkApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [flowTarget, setFlowTarget] = useState<ParkApplication | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await requestWithSchema(
        apiClient.get('/api/my-applications'),
        ApplicationsDataSchema
      );
      const next = payload.applications ?? [];
      setUploads(next);
      setPage(0);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '获取我的上传失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useOnceOnMount(() => {
    // 等待认证加载完成，且用户已登录时才发起请求
    if (isAuthLoading || !user) return;
    load();
  }, [isAuthLoading, user, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uploads;
    return uploads.filter((u) =>
      String(u.park_name || '')
        .toLowerCase()
        .includes(q)
    );
  }, [query, uploads]);

  const sorted = useMemo(() => stableSort(filtered, order, orderBy), [filtered, order, orderBy]);

  const pendingCount = filtered.filter((u) => u.status === 'pending').length;

  const handleRequestSort = (_: MouseEvent<unknown>, property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Number.parseInt(e.target.value, 10);
    setRowsPerPage(next);
    setPage(0);
  };

  const handleDetailClick = useCallback(async (app: ParkApplication) => {
    setSelected(null);
    setDetailError(null);
    try {
      setDetailLoading(true);
      const payload = await requestWithSchema(
        apiClient.get(`/api/park-applications/${app.id}`),
        ApplicationDetailDataSchema
      );
      setSelected(payload.application ?? null);
    } catch (e: unknown) {
      setDetailError(getApiErrorMessage(e, '获取申请详情失败'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleFlowClick = useCallback((app: ParkApplication) => {
    setFlowTarget(app);
  }, []);

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          gap={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5">我的上传</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
              <Chip size="small" label={`显示 ${filtered.length} / ${uploads.length} 条`} />
              <Chip
                size="small"
                color={pendingCount > 0 ? 'warning' : 'default'}
                label={`待审核 ${pendingCount} 条`}
              />
            </Stack>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <TextField
              size="small"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="按公园名称搜索"
              sx={{ minWidth: { xs: '100%', sm: 260 } }}
              slotProps={{
                input: {
                  'aria-label': '按公园名称搜索',
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="清空搜索"
                        size="small"
                        onClick={() => {
                          setQuery('');
                          setPage(0);
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />

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
        applications={sorted}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        order={order}
        orderBy={orderBy}
        onRequestSort={handleRequestSort}
        columnConfig={{
          showApplicantCallsign: false, // 普通用户查看自己的申请，不显示申请者呼号列
          showActions: true,
          showReviewButton: false, // 普通用户没有审核权限
        }}
        onDetailClick={handleDetailClick}
        onFlowClick={handleFlowClick}
        emptyMessage={query.trim() ? '未找到匹配的公园' : '暂无上传记录'}
        searchQuery={query.trim() || undefined}
      />

      <ParkApplicationDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        application={selected}
        loading={detailLoading}
        error={detailError}
        mode="detail"
      />

      <ParkApplicationFlowDialog
        open={!!flowTarget}
        onClose={() => setFlowTarget(null)}
        application={flowTarget}
      />
    </Paper>
  );
}

export default MyUploads;
