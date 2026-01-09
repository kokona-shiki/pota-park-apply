// src/pages/MyUploads.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
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
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'pota_synced';

type ParkApplication = {
  id: number;
  dx_entity: string;
  park_name: string;
  province_name: string;
  status: ApplicationStatus;
  created_at: string;

  rejection_reason?: string | null;
  pota_notes?: string | null;
};

type Order = 'asc' | 'desc';
type OrderBy = 'created_at' | 'park_name' | 'province_name' | 'status';

type HeadCell = {
  id: OrderBy;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center' | 'inherit' | 'justify';
  sx?: SxProps<Theme>;
};

const STATUS_RANK: Record<ApplicationStatus, number> = {
  pending: 1,
  approved: 2,
  pota_synced: 3,
  rejected: 4
};

const HEAD_CELLS: HeadCell[] = [
  { id: 'created_at', label: '上传时间', sortable: true, sx: { whiteSpace: 'nowrap' } },
  { id: 'park_name', label: '公园名称', sortable: true },
  { id: 'province_name', label: '省份', sortable: true, sx: { whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } } },
  { id: 'status', label: '状态', sortable: true, sx: { whiteSpace: 'nowrap' } }
];

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

function getComparableValue(app: ParkApplication, orderBy: OrderBy) {
  switch (orderBy) {
    case 'created_at':
      return new Date(app.created_at).getTime();
    case 'park_name':
      return app.park_name;
    case 'province_name':
      return app.province_name;
    case 'status':
      return STATUS_RANK[app.status] ?? 999;
    default:
      return '';
  }
}

function compare(a: ParkApplication, b: ParkApplication, orderBy: OrderBy) {
  const va = getComparableValue(a, orderBy);
  const vb = getComparableValue(b, orderBy);

  if (typeof va === 'number' && typeof vb === 'number') {
    return va - vb;
  }

  return String(va).localeCompare(String(vb), 'zh-CN');
}

function stableSort(items: ParkApplication[], order: Order, orderBy: OrderBy) {
  const stabilized = items.map((el, index) => [el, index] as const);
  stabilized.sort((a, b) => {
    const cmp = compare(a[0], b[0], orderBy);
    if (cmp !== 0) return order === 'asc' ? cmp : -cmp;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

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
  const [selected, setSelected] = useState<ParkApplication | null>(null);

  const hasRequestedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

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
      const res = await axios.get<{ applications?: ParkApplication[] }>('/api/my-applications');
      const next = res.data?.applications ?? [];
      setUploads(next);
      setPage(0);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '获取我的上传失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 等待认证加载完成，且用户已登录时才发起请求
    if (isAuthLoading || !user) return;

    // 使用 ref 确保组件挂载时只请求一次（兼容 StrictMode）
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    load();
  }, [isAuthLoading, user, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uploads;
    return uploads.filter((u) => String(u.park_name || '').toLowerCase().includes(q));
  }, [query, uploads]);

  const sorted = useMemo(() => stableSort(filtered, order, orderBy), [filtered, order, orderBy]);
  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, sorted]);

  const pendingCount = filtered.filter((u) => u.status === 'pending').length;

  const handleRequestSort = (_: MouseEvent, property: OrderBy) => {
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
              <Chip size="small" color={pendingCount > 0 ? 'warning' : 'default'} label={`待审核 ${pendingCount} 条`} />
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="按公园名称搜索"
              inputProps={{ 'aria-label': '按公园名称搜索' }}
              sx={{ minWidth: { xs: '100%', sm: 260 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton aria-label="清空搜索" size="small" onClick={() => {
                      setQuery('');
                      setPage(0);
                    }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
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

      <TableContainer sx={{ maxHeight: 640 }}>
        <Table stickyHeader size="small" aria-label="我的上传表格" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              {HEAD_CELLS.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  sortDirection={orderBy === headCell.id ? order : false}
                  align={headCell.align}
                  sx={headCell.sx}
                >
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={(e) => handleRequestSort(e, headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  ) : (
                    headCell.label
                  )}
                </TableCell>
              ))}

              <TableCell sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>DX 实体</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>同步到 POTA</TableCell>
              <TableCell>备注</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', pr: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', pr: 1.25 }}>操作</Box>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {!loading && paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={HEAD_CELLS.length + 4} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    {query.trim() ? '未找到匹配的公园' : '暂无上传记录'}
                  </Typography>
                  {query.trim() && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      关键词：{query.trim()}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((app) => {
                const statusMeta = getStatusMeta(app.status);
                const notes = app.rejection_reason || app.pota_notes || '';

                return (
                  <TableRow key={app.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(app.created_at)}</TableCell>
                    <TableCell>
                      <Tooltip title={app.park_name || ''} placement="top" arrow>
                        <Typography noWrap sx={{ maxWidth: 260 }}>
                          {app.park_name || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }}>{app.province_name || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>{app.dx_entity || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{app.status === 'pota_synced' ? '是' : '否'}</TableCell>
                    <TableCell>
                      {notes ? (
                        <Tooltip title={notes} placement="top" arrow>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                            <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Typography noWrap sx={{ color: 'text.secondary', maxWidth: 280 }}>
                              {notes}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      ) : (
                        <Typography color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', pr: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                        <Button
                          size="small"
                          sx={{
                            minWidth: 64,
                            px: 1.25,
                            py: 0.5,
                            justifyContent: 'flex-end'
                          }}
                          onClick={() => setSelected(app)}
                        >
                          详情
                        </Button>
                      </Box>
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
        count={sorted.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="每页行数"
      />

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>上传详情</DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" gap={2}>
                <Typography fontWeight={700} sx={{ minWidth: 0 }} noWrap title={selected.park_name}>
                  {selected.park_name || '-'}
                </Typography>
                <Chip size="small" label={getStatusMeta(selected.status).label} color={getStatusMeta(selected.status).color} />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                上传时间：{formatDateTime(selected.created_at)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                省份：{selected.province_name || '-'}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                DX 实体：{selected.dx_entity || '-'}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                同步到 POTA：{selected.status === 'pota_synced' ? '是' : '否'}
              </Typography>

              <Divider sx={{ my: 1 }} />

              {selected.rejection_reason ? (
                <Alert severity="error" variant="outlined">
                  未通过原因：{selected.rejection_reason}
                </Alert>
              ) : selected.pota_notes ? (
                <Alert severity="info" variant="outlined">
                  备注：{selected.pota_notes}
                </Alert>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  备注：-
                </Typography>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default MyUploads;
