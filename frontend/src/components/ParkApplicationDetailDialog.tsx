import {
  Button,
  Dialog,
  DialogActions,
  DialogContent as MuiDialogContent,
  DialogTitle,
  Box,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import type { ParkApplicationDetail, ApplicationStatus } from '../types/parkApplication';
import DialogContent from './ParkApplicationDetailDialog/DialogContent';
import ReviewForm from './ParkApplicationDetailDialog/ReviewForm';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../auth/useAuth';
import { useState, useCallback, useMemo, Fragment } from 'react';
import { apiClient } from '../services/apiClient';
import { getApiErrorMessage } from '../utils/error';
import PotaAuthDialog from './PotaAuthDialog';
import { getStatusMeta } from '../utils/parkApplication';

interface ParkApplicationDetailDialogProps {
  open: boolean;
  onClose: () => void;
  application: ParkApplicationDetail | null;
  loading?: boolean;
  error?: string | null;
  mode?: 'detail' | 'review';
  showReviewForm?: boolean;
  reviewNotes?: string;
  reviewRejectionReason?: string;
  onReviewNotesChange?: (value: string) => void;
  onReviewRejectionReasonChange?: (value: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  reviewSubmitting?: boolean;
  onApplicationUpdate?: (application: ParkApplicationDetail) => void;
}

function getDialogTitle(mode: 'detail' | 'review') {
  return mode === 'review' ? '审核申请' : '申请详情';
}

function shouldShowReviewForm(showReviewForm: boolean, mode: 'detail' | 'review') {
  return showReviewForm && mode === 'review';
}

function ReviewActions({
  onApprove,
  onReject,
  reviewSubmitting,
}: {
  onApprove?: () => void;
  onReject?: () => void;
  reviewSubmitting?: boolean;
}) {
  return (
    <>
      <Button onClick={onReject} color="error" disabled={reviewSubmitting}>
        拒绝
      </Button>
      <Button onClick={onApprove} variant="contained" disabled={reviewSubmitting}>
        通过
      </Button>
    </>
  );
}

function ReviewDialogContent({
  showForm,
  reviewNotes,
  reviewRejectionReason,
  reviewSubmitting,
  onReviewNotesChange,
  onReviewRejectionReasonChange,
}: {
  showForm: boolean;
  reviewNotes: string;
  reviewRejectionReason: string;
  reviewSubmitting: boolean;
  onReviewNotesChange?: (value: string) => void;
  onReviewRejectionReasonChange?: (value: string) => void;
}) {
  if (!showForm) return null;
  
  return (
    <ReviewForm
      reviewNotes={reviewNotes}
      reviewRejectionReason={reviewRejectionReason}
      reviewSubmitting={reviewSubmitting}
      onReviewNotesChange={(value) => onReviewNotesChange?.(value)}
      onReviewRejectionReasonChange={(value) => onReviewRejectionReasonChange?.(value)}
    />
  );
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

function UploadButton({
  application,
  accessToken,
  onApplicationUpdate,
  onShowPotaAuth,
}: {
  application: ParkApplicationDetail;
  accessToken: string | null;
  onApplicationUpdate?: (application: ParkApplicationDetail) => void;
  onShowPotaAuth: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const checkPotaAuth = usePotaAuthCheck(accessToken);

  const handleUpload = useCallback(async () => {
    const isConnected = await checkPotaAuth();
    if (!isConnected) {
      onShowPotaAuth();
      return;
    }

    try {
      setUploading(true);
      await apiClient.post(
        `/api/park-applications/${application.id}/upload`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSnackbar({ message: '已加入上传队列', severity: 'success' });
      onApplicationUpdate?.({ ...application, status: 'pota_pending_upload' });
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '加入队列失败'), severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, [application, accessToken, checkPotaAuth, onApplicationUpdate, onShowPotaAuth]);

  return (
    <Fragment>
      <Tooltip title="将公园加入 POTA 上传队列">
        <Button
          variant="contained"
          color="primary"
          startIcon={uploading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
          onClick={handleUpload}
          disabled={uploading}
        >
          上传到 POTA
        </Button>
      </Tooltip>
      {snackbar && (
        <Snackbar
          open
          autoHideDuration={3000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Fragment>
  );
}

function RetryButton({
  application,
  accessToken,
  onApplicationUpdate,
  onShowPotaAuth,
}: {
  application: ParkApplicationDetail;
  accessToken: string | null;
  onApplicationUpdate?: (application: ParkApplicationDetail) => void;
  onShowPotaAuth: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const checkPotaAuth = usePotaAuthCheck(accessToken);

  const handleRetry = useCallback(async () => {
    const isConnected = await checkPotaAuth();
    if (!isConnected) {
      onShowPotaAuth();
      return;
    }

    try {
      setUploading(true);
      await apiClient.post(
        '/api/park-applications/batch-retry',
        { parkIds: [application.id] },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSnackbar({ message: '已重新加入上传队列', severity: 'success' });
      onApplicationUpdate?.({ ...application, status: 'pota_pending_upload' });
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '重试失败'), severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, [application, accessToken, checkPotaAuth, onApplicationUpdate, onShowPotaAuth]);

  return (
    <Fragment>
      <Tooltip title="重新加入上传队列">
        <Button
          variant="contained"
          color="primary"
          startIcon={uploading ? <CircularProgress size={16} /> : <ReplayIcon />}
          onClick={handleRetry}
          disabled={uploading}
        >
          重试上传
        </Button>
      </Tooltip>
      {snackbar && (
        <Snackbar
          open
          autoHideDuration={3000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Fragment>
  );
}

function StatusIndicator({ application }: { application: ParkApplicationDetail }) {
  switch (application.status) {
    case 'pota_pending_upload':
      return <Chip label="等待上传中..." color="warning" size="small" />;
    case 'pota_uploading':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <span>上传中...</span>
        </Box>
      );
    case 'pota_uploaded':
      return application.pota_id ? (
        <Chip label={`POTA ID: ${application.pota_id}`} color="success" size="small" />
      ) : null;
    default:
      return null;
  }
}

function DialogHeader({ title, status }: { title: string; status: ApplicationStatus }) {
  const statusMeta = getStatusMeta(status);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {title}
      <Chip label={statusMeta.label} color={statusMeta.color} size="small" />
    </Box>
  );
}

function DialogActionButtons({
  application,
  canSyncToPota,
  accessToken,
  reviewSubmitting,
  onClose,
  onApplicationUpdate,
  setShowPotaAuth,
  showForm,
  onApprove,
  onReject,
}: {
  application: ParkApplicationDetail;
  canSyncToPota: boolean | null;
  accessToken: string | null;
  reviewSubmitting: boolean;
  onClose: () => void;
  onApplicationUpdate?: (application: ParkApplicationDetail) => void;
  setShowPotaAuth: (show: boolean) => void;
  showForm: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const canUpload = application.status === 'approved' && canSyncToPota === true;
  const canRetry = application.status === 'pota_upload_failed' && canSyncToPota === true;

  return (
    <DialogActions>
      <Button onClick={onClose} disabled={reviewSubmitting}>
        关闭
      </Button>
      {canUpload && (
        <UploadButton
          application={application}
          accessToken={accessToken}
          onApplicationUpdate={onApplicationUpdate}
          onShowPotaAuth={() => setShowPotaAuth(true)}
        />
      )}
      {canRetry && (
        <RetryButton
          application={application}
          accessToken={accessToken}
          onApplicationUpdate={onApplicationUpdate}
          onShowPotaAuth={() => setShowPotaAuth(true)}
        />
      )}
      <StatusIndicator application={application} />
      {showForm && (
        <ReviewActions
          onApprove={onApprove}
          onReject={onReject}
          reviewSubmitting={reviewSubmitting}
        />
      )}
    </DialogActions>
  );
}

export function ParkApplicationDetailDialog({
  open,
  onClose,
  application,
  loading = false,
  error = null,
  mode = 'detail',
  showReviewForm = false,
  reviewNotes = '',
  reviewRejectionReason = '',
  onReviewNotesChange,
  onReviewRejectionReasonChange,
  onApprove,
  onReject,
  reviewSubmitting = false,
  onApplicationUpdate,
}: ParkApplicationDetailDialogProps) {
  const { hasPermission: canSyncToPota } = usePermission('sync_to_pota');
  const { accessToken } = useAuth();
  const [showPotaAuth, setShowPotaAuth] = useState(false);

  const title = getDialogTitle(mode);
  const showForm = shouldShowReviewForm(showReviewForm, mode);

  const dialogContent = useMemo(() => {
    if (!application) return null;
    
    return (
      <>
        <MuiDialogContent dividers>
          <DialogContent
            application={application}
            mode={mode}
            loading={loading}
            error={error}
          />
          <ReviewDialogContent
            showForm={showForm}
            reviewNotes={reviewNotes}
            reviewRejectionReason={reviewRejectionReason}
            reviewSubmitting={reviewSubmitting}
            onReviewNotesChange={onReviewNotesChange}
            onReviewRejectionReasonChange={onReviewRejectionReasonChange}
          />
        </MuiDialogContent>
        <DialogActionButtons
          application={application}
          canSyncToPota={canSyncToPota}
          accessToken={accessToken}
          reviewSubmitting={reviewSubmitting}
          onClose={onClose}
          onApplicationUpdate={onApplicationUpdate}
          setShowPotaAuth={setShowPotaAuth}
          showForm={showForm}
          onApprove={onApprove}
          onReject={onReject}
        />
      </>
    );
  }, [
    application,
    mode,
    loading,
    error,
    showForm,
    reviewNotes,
    reviewRejectionReason,
    reviewSubmitting,
    onReviewNotesChange,
    onReviewRejectionReasonChange,
    canSyncToPota,
    accessToken,
    onClose,
    onApplicationUpdate,
    onApprove,
    onReject,
  ]);

  if (!application) return null;

  return (
    <Fragment>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          <DialogHeader title={title} status={application.status} />
        </DialogTitle>
        {dialogContent}
      </Dialog>
      <PotaAuthDialog
        open={showPotaAuth}
        onClose={() => setShowPotaAuth(false)}
        onSuccess={() => setShowPotaAuth(false)}
      />
    </Fragment>
  );
}

export default ParkApplicationDetailDialog;
