import { useState, useRef, useEffect } from 'react';
import { useOnceOnMount } from '../hooks/useOnceOnMount';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import { z } from 'zod';
import { PotaAuthInitDataSchema, PotaAuthResultDataSchema, PotaStatusSchema } from '../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import { getApiErrorMessage } from '../utils/error';
import PotaStatusCard from '../components/PotaAuthDialog/PotaStatusCard';

type PotaStatus = z.infer<typeof PotaStatusSchema>;

function PotaAuthDialog({
  authLoading,
  authError,
  onClose,
}: {
  authLoading: boolean;
  authError: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>连接 POTA</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {authLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Stack spacing={2} alignItems="center">
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  正在打开 POTA 登录页面...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  请在弹出的登录页面中完成登录
                </Typography>
              </Stack>
            </Box>
          )}
          {authError && (
            <Alert severity="error" onClose={() => onClose()}>
              {authError}
            </Alert>
          )}
          {!authLoading && !authError && <Alert severity="info">认证流程已完成</Alert>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function PotaAuth() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  const { hasPermission } = usePermission('pota_import');
  const isPotaRepresentative = hasPermission === true && user != null;

  const loadStatus = async () => {
    try {
      setError(null);
      const statusPayload = await requestWithSchema(apiClient.get('/api/pota/status'), PotaStatusSchema);
      setStatus(statusPayload);
    } catch (e: unknown) {
      const errMsg = getApiErrorMessage(e, '获取 POTA 连接状态失败');
      setError(errMsg);
      if (errMsg.includes('未找到')) {
        setStatus({ connected: false, expiresAt: null });
        setError(null);
      }
    }
  };

  useOnceOnMount(() => {
    if (isPotaRepresentative) {
      loadStatus();
    }
  }, [isPotaRepresentative]);

  const disconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await requestWithSchema(apiClient.delete('/api/pota/token'), z.null());
      await loadStatus();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '断开连接失败'));
    } finally {
      setLoading(false);
    }
  };

  const startAuth = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      setAuthDialogOpen(true);

      const { authUrl, state } = await requestWithSchema(
        apiClient.post('/api/pota/init-auth'),
        PotaAuthInitDataSchema
      );

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = authUrl;
      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      return new Promise<void>((resolve, reject) => {
        let resolved = false;

        const checkInterval = setInterval(() => {
          if (resolved) {
            clearInterval(checkInterval);
            return;
          }

          try {
            const iframeUrl = iframe.contentWindow?.location.href;
            if (!iframeUrl) return;

            const url = new URL(iframeUrl);
            const code = url.searchParams.get('code');
            const returnedState = url.searchParams.get('state');

            if (code && returnedState === state) {
              resolved = true;
              clearInterval(checkInterval);
              checkIntervalRef.current = null;

              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              iframeRef.current = null;

              requestWithSchema(
                apiClient.post('/api/pota/callback', { code, state }),
                PotaAuthResultDataSchema
              )
                .then(() => {
                  setAuthDialogOpen(false);
                  setAuthLoading(false);
                  loadStatus();
                  resolve();
                })
                .catch((err) => {
                  setAuthError(getApiErrorMessage(err, 'POTA 认证失败'));
                  setAuthLoading(false);
                  reject(err);
                });
            }
          } catch (e) {
            console.error('Error checking iframe URL:', e);
          }
        }, 500);

        checkIntervalRef.current = checkInterval as unknown as number;

        setTimeout(() => {
          clearInterval(checkInterval);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          iframeRef.current = null;
          setAuthError('认证超时，请重试');
          setAuthLoading(false);
          reject(new Error('认证超时'));
        }, 300000);
      });
    } catch (e: unknown) {
      setAuthError(getApiErrorMessage(e, '初始化认证失败'));
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (iframeRef.current && document.body.contains(iframeRef.current)) {
        document.body.removeChild(iframeRef.current);
      }
    };
  }, []);

  if (!isPotaRepresentative) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="warning">只有 POTA 地图代表可以访问此功能</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h5">POTA 认证</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              连接您的 POTA 呼号，以便同步公园数据到 POTA 系统
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {status && (
          <PotaStatusCard
            status={status}
            loading={loading}
            onDisconnect={disconnect}
            onConnect={startAuth}
          />
        )}
      </Box>
      <PotaAuthDialog
        authLoading={authLoading}
        authError={authError}
        onClose={() => {
          if (!authLoading) {
            setAuthDialogOpen(false);
            setAuthError(null);
            if (iframeRef.current && document.body.contains(iframeRef.current)) {
              document.body.removeChild(iframeRef.current);
            }
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
          }
        }}
      />
    </Paper>
  );
}

export default PotaAuth;
