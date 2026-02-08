// src/pages/PotaImport.tsx
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useOnceOnMount } from '../hooks/useOnceOnMount';
import {
  Box,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Paper,
  Stack,
} from '@mui/material';
import { useAuth } from '../auth/useAuth';
import { z } from 'zod';
import {
  ImportTaskSchema,
  PotaImportLatestTaskDataSchema,
  PotaImportStatusDataSchema,
  PotaImportTriggerDataSchema,
} from '../../../shared/schemas/potaImport';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { getApiErrorMessage } from '../utils/error';
import TaskStatusAlert from './PotaImport/TaskStatusAlert';
import TaskCompleteDialog from './PotaImport/TaskCompleteDialog';

type ImportTask = z.infer<typeof ImportTaskSchema>;

function PotaImport() {
  const { user, isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [canImport, setCanImport] = useState<boolean | null>(null);
  const [task, setTask] = useState<ImportTask | null>(null);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const statusLabel = useMemo(() => {
    if (!task) return '';
    const map: Record<ImportTask['status'], string> = {
      pending: '等待执行',
      running: '执行中',
      success: '已完成',
      partial_success: '部分完成',
      failed: '失败',
    };
    return map[task.status];
  }, [task]);

  const taskAlertSeverity = useMemo(() => {
    if (!task) return 'info';
    if (task.status === 'failed') return 'error';
    if (task.status === 'partial_success') return 'warning';
    if (task.status === 'success') return 'success';
    return 'info';
  }, [task]);

  const loadStatus = useCallback(async () => {
    if (!user) return;

    try {
      setStatusLoading(true);
      setError(null);
      const payload = await requestWithSchema(
        apiClient.get('/api/pota/import-status'),
        PotaImportStatusDataSchema
      );
      setCanImport(Boolean(payload.canImport));
    } catch (e: unknown) {
      const error = e as { response?: { status: number } };
      setCanImport(false);
      if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        return;
      }
      setError(getApiErrorMessage(e, '获取导入权限状态失败'));
    } finally {
      setStatusLoading(false);
    }
  }, [user]);

  const loadLatestTask = useCallback(async () => {
    if (!user) return;

    try {
      const latestTask = await requestWithSchema(
        apiClient.get('/api/pota/import-task/latest'),
        PotaImportLatestTaskDataSchema
      );
      setTask(latestTask);
      if (
        latestTask &&
        ['success', 'partial_success', 'failed'].includes(latestTask.status) &&
        !latestTask.readAt
      ) {
        setOpenCompleteDialog(true);
      }
    } catch (e: unknown) {
      const error = e as { response?: { status: number } };
      if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        return;
      }
      const message = getApiErrorMessage(e, '');
      if (message) {
        setError(message);
      }
    }
  }, [user]);

  const handleImport = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      setInfo(null);

      const payload = await requestWithSchema(
        apiClient.post('/api/pota/import'),
        PotaImportTriggerDataSchema
      );
      setTask(payload.task ?? null);
      setInfo(payload.message || '已提交 POTA 导入任务');
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'POTA 公园导入失败'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleCloseCompleteDialog = useCallback(async () => {
    if (task?.id) {
      try {
        await requestWithSchema(
          apiClient.post(`/api/pota/import-task/${task.id}/read`),
          PotaImportMarkReadDataSchema
        );
      } catch (e) {
        console.warn('标记导入任务已读失败', e);
      }
    }
    setOpenCompleteDialog(false);
    loadLatestTask();
  }, [task, loadLatestTask]);

  useOnceOnMount(() => {
    if (!user) return;
    loadStatus();
    loadLatestTask();
  }, [user, loadStatus, loadLatestTask]);

  useEffect(() => {
    if (!user || !canImport) return;
    if (!task || (task.status !== 'pending' && task.status !== 'running')) return;

    const timer = setInterval(() => {
      loadLatestTask();
    }, 10000);
    return () => clearInterval(timer);
  }, [user, canImport, task, loadLatestTask]);

  if (!user) return null;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          POTA 公园导入
        </Typography>

        <Typography variant="body1" sx={{ mb: 3 }}>
          此功能用于从 POTA 系统导入中国地区的公园数据。系统会自动检查重复项，仅导入新公园。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {info && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        {statusLoading && <LinearProgress />}

        {!isAuthLoading && user && canImport === false && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            您没有权限执行 POTA 公园导入操作。
          </Alert>
        )}

        <TaskStatusAlert
          task={task}
          statusLabel={statusLabel}
          taskAlertSeverity={taskAlertSeverity}
        />

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!canImport || loading || isAuthLoading || !user}
            sx={{ minWidth: 120 }}
          >
            {loading ? '导入中...' : '开始导入'}
          </Button>

          <Button
            variant="outlined"
            onClick={loadStatus}
            disabled={statusLoading}
            sx={{ minWidth: 120 }}
          >
            {statusLoading ? '加载中...' : '刷新状态'}
          </Button>
        </Stack>

        {loading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
              正在从 POTA 系统获取数据并导入...
            </Typography>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          <strong>注意:</strong> 自动导入任务会在每天凌晨 4 点（UTC+8）自动执行，无需手动操作。
        </Typography>

        <TaskCompleteDialog
          open={openCompleteDialog}
          task={task}
          statusLabel={statusLabel}
          onClose={handleCloseCompleteDialog}
          loadLatestTask={loadLatestTask}
        />
      </Paper>
    </Box>
  );
}

export default PotaImport;