import { Button, Box, CircularProgress, Tooltip, Chip, Snackbar, Alert } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import type { ParkApplication } from '../../types/parkApplication';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../auth/useAuth';
import { useState, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import PotaAuthDialog from '../PotaAuthDialog';

interface ActionButtonsProps {
  onDetailClick: (app: ParkApplication) => void;
  onFlowClick?: (app: ParkApplication) => void;
  onReviewClick?: (app: ParkApplication) => void;
  onUploadSuccess?: (app: ParkApplication) => void;
  app: ParkApplication;
}

function usePotaAuthCheck(accessToken: string | null) {
  return useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/api/pota/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data?.data?.connected === true;
    } catch {
      return false;
    }
  }, [accessToken]);
}

function useUploadActions(
  app: ParkApplication,
  accessToken: string | null,
  onUploadSuccess?: (app: ParkApplication) => void
) {
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);
  const [showPotaAuth, setShowPotaAuth] = useState(false);

  const checkPotaAuth = usePotaAuthCheck(accessToken);

  const handleUpload = useCallback(async () => {
    const isConnected = await checkPotaAuth();
    if (!isConnected) {
      setShowPotaAuth(true);
      return;
    }

    try {
      setUploading(true);
      await apiClient.post(
        `/api/park-applications/${app.id}/upload`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSnackbar({ message: '已加入上传队列', severity: 'success' });
      if (onUploadSuccess) {
        onUploadSuccess({ ...app, status: 'pota_pending_upload' });
      }
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '加入队列失败'), severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, [app, accessToken, checkPotaAuth, onUploadSuccess]);

  const handleRetry = useCallback(async () => {
    const isConnected = await checkPotaAuth();
    if (!isConnected) {
      setShowPotaAuth(true);
      return;
    }

    try {
      setUploading(true);
      await apiClient.post(
        '/api/park-applications/batch-retry',
        { parkIds: [app.id] },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSnackbar({ message: '已重新加入上传队列', severity: 'success' });
      if (onUploadSuccess) {
        onUploadSuccess({ ...app, status: 'pota_pending_upload' });
      }
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '重试失败'), severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, [app, accessToken, checkPotaAuth, onUploadSuccess]);

  const handlePotaAuthSuccess = useCallback(() => {
    setShowPotaAuth(false);
    handleUpload();
  }, [handleUpload]);

  return {
    uploading,
    snackbar,
    showPotaAuth,
    setShowPotaAuth,
    setSnackbar,
    handleUpload,
    handleRetry,
    handlePotaAuthSuccess,
  };
}

function UploadButton({
  uploading,
  onClick,
}: {
  uploading: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title="加入上传队列">
      <Button
        variant="contained"
        size="small"
        color="primary"
        startIcon={uploading ? <CircularProgress size={14} /> : <PlayArrowIcon />}
        onClick={onClick}
        disabled={uploading}
      >
        上传
      </Button>
    </Tooltip>
  );
}

function RetryButton({
  uploading,
  onClick,
}: {
  uploading: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title="重试上传">
      <Button
        variant="contained"
        size="small"
        color="primary"
        startIcon={uploading ? <CircularProgress size={14} /> : <ReplayIcon />}
        onClick={onClick}
        disabled={uploading}
      >
        重试
      </Button>
    </Tooltip>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'pota_pending_upload') {
    return <Chip label="队列中" color="warning" size="small" />;
  }
  if (status === 'pota_uploading') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <CircularProgress size={14} />
        <span>上传中</span>
      </Box>
    );
  }
  return null;
}

function ActionButtons({
  onDetailClick,
  onFlowClick,
  onReviewClick,
  onUploadSuccess,
  app,
}: ActionButtonsProps) {
  const { hasPermission: canSyncToPota } = usePermission('sync_to_pota');
  const { accessToken } = useAuth();

  const {
    uploading,
    snackbar,
    showPotaAuth,
    setShowPotaAuth,
    setSnackbar,
    handleUpload,
    handleRetry,
    handlePotaAuthSuccess,
  } = useUploadActions(app, accessToken, onUploadSuccess);

  const canUpload = app.status === 'approved' && canSyncToPota;
  const canRetry = app.status === 'pota_upload_failed' && canSyncToPota;

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onDetailClick(app)}
        >
          详情
        </Button>
        {onFlowClick && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => onFlowClick(app)}
          >
            流程
          </Button>
        )}
        {onReviewClick && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => onReviewClick(app)}
          >
            审核
          </Button>
        )}
        {canUpload && <UploadButton uploading={uploading} onClick={handleUpload} />}
        {canRetry && <RetryButton uploading={uploading} onClick={handleRetry} />}
        <StatusChip status={app.status} />
      </Box>

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
        onClose={() => setShowPotaAuth(false)}
        onSuccess={handlePotaAuthSuccess}
      />
    </>
  );
}

export default ActionButtons;
