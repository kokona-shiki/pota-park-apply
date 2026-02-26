import React, { useState, useCallback, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Box,
  Tooltip,
  Snackbar,
  Chip,
  IconButton,
  Toolbar,
  Paper,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import { useAuth } from '../auth/useAuth';
import { apiClient } from '../services/apiClient';
import { getApiErrorMessage } from '../utils/error';
import { getStatusMeta } from '../utils/parkApplication';
import PotaAuthDialog from '../components/PotaAuthDialog';

type UploadQueuePark = {
  id: number;
  park_name: string;
  province_name: string;
  provinces: string[];
  status: string;
  park_type: string | null;
  latitude: number | null;
  longitude: number | null;
  pota_id: string | null;
  upload_retry_count: number;
  upload_failure_reason: string | null;
  created_at: string;
  updated_at: string;
  applicant_callsign: string | null;
};

type QueueStatus = {
  queueLength: number;
  isProcessing: boolean;
  currentTask: {
    parkId: number;
    status: string;
    retryCount: number;
  } | null;
};

type UploadQueueResponse = {
  parks: UploadQueuePark[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queueStatus: QueueStatus;
};

const PotaUploadQueue: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [parks, setParks] = useState<UploadQueuePark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showPotaAuth, setShowPotaAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'upload' | 'retry' | 'batchRetry';
    parkId?: number;
  } | null>(null);

  const fetchUploadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<UploadQueueResponse>('/api/pota/upload-queue', {
        params: { page, pageSize },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setParks(response.data.parks || []);
      setTotal(response.data.total || 0);
      setQueueStatus(response.data.queueStatus || null);
    } catch (err) {
      setError(getApiErrorMessage(err, '获取上传队列失败'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, pageSize]);

  useEffect(() => {
    if (user) {
      fetchUploadQueue();
    }
  }, [user, fetchUploadQueue]);

  useEffect(() => {
    if (queueStatus?.isProcessing) {
      const timer = setTimeout(() => {
        fetchUploadQueue();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [queueStatus, fetchUploadQueue]);

  const checkPotaAuth = async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/api/pota/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data?.data?.connected === true;
    } catch {
      return false;
    }
  };

  const handleUpload = async (parkId: number) => {
    const isConnected = await checkPotaAuth();
    if (!isConnected) {
      setPendingAction({ type: 'upload', parkId });
      setShowPotaAuth(true);
      return;
    }
    await executeUpload(parkId);
  };

  const executeUpload = async (parkId: number) => {
    try {
      await apiClient.post(
        `/api/park-applications/${parkId}/upload`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSnackbar({ message: '已加入上传队列', severity: 'success' });
      fetchUploadQueue();
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '加入队列失败'), severity: 'error' });
    }
  };

  const handleRemoveFromQueue = async (parkId: number) => {
    try {
      await apiClient.post(
        `/api/park-applications/${parkId}/remove-from-queue`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSnackbar({ message: '已移出队列', severity: 'success' });
      fetchUploadQueue();
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '移出队列失败'), severity: 'error' });
    }
  };

  const handleRetry = async (parkId: number) => {
    const isConnected = await checkPotaAuth();
    if (!isConnected) {
      setPendingAction({ type: 'retry', parkId });
      setShowPotaAuth(true);
      return;
    }
    await executeRetry([parkId]);
  };

  const handleBatchRetry = async () => {
    if (selectedIds.length === 0) {
      setSnackbar({ message: '请选择要重试的公园', severity: 'info' });
      return;
    }

    const failedIds = parks
      .filter((p) => selectedIds.includes(p.id) && p.status === 'pota_upload_failed')
      .map((p) => p.id);

    if (failedIds.length === 0) {
      setSnackbar({ message: '请选择上传失败的公园', severity: 'info' });
      return;
    }

    const isConnected = await checkPotaAuth();
    if (!isConnected) {
      setPendingAction({ type: 'batchRetry' });
      setShowPotaAuth(true);
      return;
    }
    await executeRetry(failedIds);
  };

  const executeRetry = async (parkIds: number[]) => {
    try {
      await apiClient.post(
        '/api/park-applications/batch-retry',
        { parkIds },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSnackbar({ message: `已提交 ${parkIds.length} 个公园重试`, severity: 'success' });
      setSelectedIds([]);
      fetchUploadQueue();
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '重试失败'), severity: 'error' });
    }
  };

  const handlePotaAuthSuccess = async () => {
    setShowPotaAuth(false);
    if (pendingAction) {
      if (pendingAction.type === 'upload' && pendingAction.parkId) {
        await executeUpload(pendingAction.parkId);
      } else if (pendingAction.type === 'retry' && pendingAction.parkId) {
        await executeRetry([pendingAction.parkId]);
      } else if (pendingAction.type === 'batchRetry') {
        const failedIds = parks
          .filter((p) => selectedIds.includes(p.id) && p.status === 'pota_upload_failed')
          .map((p) => p.id);
        await executeRetry(failedIds);
      }
      setPendingAction(null);
    }
  };

  const renderStatus = (params: GridRenderCellParams<UploadQueuePark, string>) => {
    const status = params.value || '';
    const meta = getStatusMeta(status as Parameters<typeof getStatusMeta>[0]);
    return (
      <Chip
        label={meta.label}
        color={meta.color}
        size="small"
        sx={{ minWidth: 80 }}
      />
    );
  };

  const renderActions = (params: GridRenderCellParams<UploadQueuePark>) => {
    const park = params.row;
    const isUploading = park.status === 'pota_uploading';
    const isInQueue = park.status === 'pota_pending_upload';
    const isFailed = park.status === 'pota_upload_failed';
    const isApproved = park.status === 'approved';

    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {isApproved && (
          <Tooltip title="加入队列">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleUpload(park.id)}
              disabled={queueStatus?.isProcessing}
            >
              <PlayArrowIcon />
            </IconButton>
          </Tooltip>
        )}
        {isInQueue && (
          <Tooltip title="移出队列">
            <IconButton
              size="small"
              color="warning"
              onClick={() => handleRemoveFromQueue(park.id)}
            >
              <RemoveCircleOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
        {isFailed && (
          <Tooltip title="重试">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleRetry(park.id)}
              disabled={queueStatus?.isProcessing}
            >
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        )}
        {isUploading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              上传中
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const columns: GridColDef<UploadQueuePark>[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
    },
    {
      field: 'park_name',
      headerName: '公园名称',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Tooltip title={params.value ?? ''}>
          <span>{params.value ?? ''}</span>
        </Tooltip>
      ),
    },
    {
      field: 'province_name',
      headerName: '省份',
      width: 100,
    },
    {
      field: 'park_type',
      headerName: '公园类型',
      width: 120,
      valueFormatter: (params) => params.value || '-',
    },
    {
      field: 'status',
      headerName: '状态',
      width: 100,
      renderCell: renderStatus,
    },
    {
      field: 'pota_id',
      headerName: 'POTA ID',
      width: 100,
      valueFormatter: (params) => params.value || '-',
    },
    {
      field: 'upload_failure_reason',
      headerName: '失败原因',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const reason = params.value;
        if (!reason) return '-';
        return (
          <Tooltip title={reason}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {reason}
            </span>
          </Tooltip>
        );
      },
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 120,
      renderCell: renderActions,
      sortable: false,
      filterable: false,
    },
  ];

  const failedCount = parks.filter((p) => p.status === 'pota_upload_failed').length;

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom>
        POTA 上传队列
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {queueStatus && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" component="span">
                队列状态：
              </Typography>
              {queueStatus.isProcessing ? (
                <Chip label="处理中" color="info" size="small" sx={{ ml: 1 }} />
              ) : (
                <Chip label="空闲" color="default" size="small" sx={{ ml: 1 }} />
              )}
            </Box>
            <Typography variant="body1" component="span">
              等待中：<strong>{queueStatus.queueLength}</strong> 个
            </Typography>
            {queueStatus.currentTask && (
              <Typography variant="body1" component="span">
                当前处理：公园 ID {queueStatus.currentTask.parkId}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      <Toolbar sx={{ pl: 0, pr: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="h6">
            共 {total} 条记录
          </Typography>
          {failedCount > 0 && (
            <Typography variant="body2" color="error">
              （{failedCount} 个失败）
            </Typography>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ReplayIcon />}
            onClick={handleBatchRetry}
            disabled={selectedIds.length === 0 || queueStatus?.isProcessing}
          >
            批量重试 ({selectedIds.length})
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchUploadQueue}
            disabled={loading}
          >
            刷新
          </Button>
        </Box>
      </Toolbar>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      ) : (
        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={parks}
            columns={columns}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={(model: GridRowSelectionModel) => {
              if (Array.isArray(model)) {
                setSelectedIds(model as number[]);
              } else {
                setSelectedIds(Array.from(model) as number[]);
              }
            }}
            isRowSelectable={(params) => params.row.status === 'pota_upload_failed'}
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
              },
            }}
          />
        </div>
      )}

      {snackbar && (
        <Snackbar
          open={Boolean(snackbar)}
          autoHideDuration={3000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}

      <PotaAuthDialog
        open={showPotaAuth}
        onClose={() => {
          setShowPotaAuth(false);
          setPendingAction(null);
        }}
        onSuccess={handlePotaAuthSuccess}
      />
    </Container>
  );
};

export default PotaUploadQueue;
