// src/pages/PotaAuth.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import { getApiErrorMessage } from '../utils/error';

type PotaStatus = {
  connected: boolean;
  expiresAt: string | null;
  willExpireSoon?: boolean;
};

function PotaAuth() {
  const { user } = useAuth(); // 保留user用于权限检查
  const [status, setStatus] = useState<PotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  // 检查用户权限而非角色
  const { hasPermission } = usePermission('pota_import');
  const isPotaRepresentative = hasPermission === true && user != null;

  // 加载状态
  const loadStatus = async () => {
    try {
      setError(null);
      const res = await axios.get<{ status: PotaStatus }>('/api/pota/status');
      setStatus(res.data.status);
    } catch (e: unknown) {
      const errMsg = getApiErrorMessage(e, '获取 POTA 连接状态失败');
      setError(errMsg);
      // 如果是未连接状态，不显示错误
      if (errMsg.includes('未找到')) {
        setStatus({ connected: false, expiresAt: null });
        setError(null);
      }
    }
  };

  useEffect(() => {
    if (isPotaRepresentative) {
      loadStatus();
    }
  }, [isPotaRepresentative]);

  // 开始认证流程
  const startAuth = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      setAuthDialogOpen(true);

      // 1. 获取授权 URL
      const initRes = await axios.post<{ authUrl: string; state: string }>('/api/pota/init-auth');
      const { authUrl, state } = initRes.data;

      // 2. 创建隐藏 iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = authUrl;
      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      // 3. 监听 iframe URL 变化，提取授权码
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

              // 4. 发送授权码到后端
              axios
                .post('/api/pota/callback', { code, state })
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
          } catch {
            // 跨域错误，继续等待（这是正常的，因为 iframe 加载时会触发跨域错误）
          }
        }, 500);

        checkIntervalRef.current = checkInterval as unknown as number;

        // 超时处理
        setTimeout(() => {
          clearInterval(checkInterval);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            iframeRef.current = null;
          }
          setAuthError('认证超时，请重试');
          setAuthLoading(false);
          reject(new Error('认证超时'));
        }, 300000); // 5分钟超时
      });
    } catch (e: unknown) {
      setAuthError(getApiErrorMessage(e, '初始化认证失败'));
      setAuthLoading(false);
    }
  };

  // 断开连接
  const disconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete('/api/pota/token');
      await loadStatus();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, '断开连接失败'));
    } finally {
      setLoading(false);
    }
  };

  // 清理
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

  // 格式化过期时间
  const formatExpiresAt = (expiresAt: string | null) => {
    if (!expiresAt) return '-';
    const date = new Date(expiresAt);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

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
              连接您的 POTA 账号，以便同步公园数据到 POTA 系统
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
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  {status.connected ? (
                    <>
                      <CheckCircleIcon color="success" />
                      <Typography variant="h6">已连接 POTA</Typography>
                      <Chip label="已连接" color="success" size="small" />
                    </>
                  ) : (
                    <>
                      <LinkOffIcon color="disabled" />
                      <Typography variant="h6">未连接 POTA</Typography>
                      <Chip label="未连接" color="default" size="small" />
                    </>
                  )}
                </Stack>

                {status.connected && status.expiresAt && (
                  <>
                    <Divider />
                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        Token 过期时间：{formatExpiresAt(status.expiresAt)}
                      </Typography>
                      {status.willExpireSoon && (
                        <Alert severity="info" variant="outlined">
                          Token 即将过期，系统会自动刷新
                        </Alert>
                      )}
                    </Stack>
                  </>
                )}

                <Divider />

                <Stack direction="row" spacing={2}>
                  {status.connected ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<LinkOffIcon />}
                      onClick={disconnect}
                      disabled={loading}
                    >
                      断开连接
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<LinkIcon />}
                      onClick={startAuth}
                      disabled={loading || authLoading}
                    >
                      连接 POTA
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* 认证对话框 */}
      <Dialog
        open={authDialogOpen}
        onClose={() => {
          if (!authLoading) {
            setAuthDialogOpen(false);
            setAuthError(null);
            // 清理 iframe
            if (iframeRef.current && document.body.contains(iframeRef.current)) {
              document.body.removeChild(iframeRef.current);
              iframeRef.current = null;
            }
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
          }
        }}
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
              <Alert severity="error" onClose={() => setAuthError(null)}>
                {authError}
              </Alert>
            )}

            {!authLoading && !authError && <Alert severity="info">认证流程已完成</Alert>}
          </Stack>
        </DialogContent>
      </Dialog>
    </Paper>
  );
}

export default PotaAuth;
