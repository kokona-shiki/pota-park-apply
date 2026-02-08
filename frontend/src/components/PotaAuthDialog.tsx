// src/components/PotaAuthDialog.tsx
import { useState, useEffect } from 'react';
import { useOnceOnMount } from '../hooks/useOnceOnMount';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Stack,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { PotaStatusSchema } from '../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import { getApiErrorMessage } from '../utils/error';
import PotaStatusCard from './PotaAuthDialog/PotaStatusCard';
import PotaAuthForm from './PotaAuthDialog/PotaAuthForm';

type PotaStatus = z.infer<typeof PotaStatusSchema>;

interface PotaAuthDialogProps {
  open: boolean;
  onClose: () => void;
}

function PotaAuthDialog({ open, onClose }: PotaAuthDialogProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { hasPermission } = usePermission('pota_import');

  const isPotaRepresentative = hasPermission === true && user != null;

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusPayload = await requestWithSchema(apiClient.get('/api/pota/status'), PotaStatusSchema);
      setStatus(statusPayload);
    } catch (e: unknown) {
      const errMsg = getApiErrorMessage(e, '获取 POTA 连接状态失败');
      setError(errMsg);
      setStatus({ connected: false, expiresAt: null });
      if (
        errMsg.includes('未找到') ||
        errMsg.includes('404') ||
        errMsg.includes('权限') ||
        errMsg.includes('FORBIDDEN')
      ) {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.delete('/api/pota/token');
      await loadStatus();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '断开连接失败'));
    } finally {
      setLoading(false);
    }
  };

  useOnceOnMount(() => {
    if (open && isPotaRepresentative) {
      loadStatus();
    }
  }, [open, isPotaRepresentative]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setAuthDialogOpen(false);
      setStatus(null);
      setLoading(false);
    }
  }, [open]);

  if (!isPotaRepresentative) {
    return null;
  }

  const handleAuthSuccess = () => {
    setAuthDialogOpen(false);
    loadStatus();
  };

  const handleAuthError = (error: string) => {
    setAuthError(error);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>POTA 认证</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {loading && <Box sx={{ height: 40 }} />}
            <PotaStatusCard
              status={status}
              loading={loading}
              onDisconnect={disconnect}
              onConnect={() => setAuthDialogOpen(true)}
              onDisconnect={() => setAuthDialogOpen(false)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={authDialogOpen}
        onClose={() => {
          if (!loading) {
            setAuthDialogOpen(false);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>连接 POTA</DialogTitle>
        <DialogContent>
          <PotaAuthForm onAuthSuccess={handleAuthSuccess} onAuthError={handleAuthError} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PotaAuthDialog;