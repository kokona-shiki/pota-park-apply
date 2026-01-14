// src/components/PotaAuthDialog.tsx
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
  Stack,
  Typography,
  Alert,
  Chip,
  Divider,
  DialogActions,
  TextField,
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

interface PotaAuthDialogProps {
  open: boolean;
  onClose: () => void;
}

function PotaAuthDialog({ open, onClose }: PotaAuthDialogProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const hasLoadedRef = useRef(false); // 防止 React Strict Mode 重复调用
  const { hasPermission } = usePermission('pota_import');

  // 检查用户权限而非角色
  const isPotaRepresentative = hasPermission === true && user != null;

  // 加载状态
  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      // axios interceptor 已经提取了 data，所以 res.data 直接就是状态对象
      const res = await axios.get<{
        connected: boolean;
        expiresAt: string | null;
        willExpireSoon?: boolean;
      }>('/api/pota/status');

      if (res.data) {
        setStatus({
          connected: res.data.connected,
          expiresAt: res.data.expiresAt,
          willExpireSoon: res.data.willExpireSoon,
        });
      } else {
        // 如果返回格式异常，设置默认状态
        setStatus({ connected: false, expiresAt: null });
      }
    } catch (e: unknown) {
      const errMsg = getApiErrorMessage(e, '获取 POTA 连接状态失败');
      setError(errMsg);
      // 任何错误都设置默认状态，避免一直显示加载中
      setStatus({ connected: false, expiresAt: null });
      // 如果是未找到或权限错误，不显示错误信息
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

  // 修复 React Strict Mode 导致的重复调用
  useEffect(() => {
    if (!open || !isPotaRepresentative) {
      return;
    }

    // 如果已经加载过且弹窗仍然打开，不重复加载
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    loadStatus();

    // 清理函数：当弹窗关闭时重置标志
    return () => {
      hasLoadedRef.current = false;
    };
  }, [open, isPotaRepresentative]);

  // 当弹窗关闭时重置状态
  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      setError(null);
      setAuthError(null);
      setAuthLoading(false);
      setStatus(null);
      setLoading(false);
      setSuccess(null);
    }
  }, [open]);

  // 开始认证流程（使用账号密码）
  const startAuth = async () => {
    if (!username || !password) {
      setAuthError('请输入 POTA 账号和密码');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError(null);
      setSuccess(null);

      // 发送账号密码到后端进行登录
      await axios.post('/api/pota/login', { username, password });

      // 登录成功
      setAuthDialogOpen(false);
      setAuthLoading(false);
      setUsername('');
      setPassword('');
      setSuccess('POTA 登录成功！');
      setError(null);

      // 刷新状态（添加小延迟确保后端已保存 token）
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadStatus();

      // 3 秒后自动清除成功消息
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (e: unknown) {
      setAuthError(getApiErrorMessage(e, 'POTA 登录失败'));
      setAuthLoading(false);
      setSuccess(null);
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
    return null;
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>POTA 认证</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {success && (
              <Alert severity="success" onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {loading && <LinearProgress />}

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
                          fullWidth
                        >
                          登出 POTA
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          startIcon={<LinkIcon />}
                          onClick={() => setAuthDialogOpen(true)}
                          disabled={loading || authLoading}
                          fullWidth
                        >
                          连接 POTA
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {!status && !loading && <Alert severity="info">正在加载连接状态...</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 登录对话框 */}
      <Dialog
        open={authDialogOpen}
        onClose={() => {
          if (!authLoading) {
            setAuthDialogOpen(false);
            setAuthError(null);
            setUsername('');
            setPassword('');
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
                    正在登录 POTA...
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    这可能需要几秒钟时间
                  </Typography>
                </Stack>
              </Box>
            )}

            {!authLoading && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  请输入您的 POTA 账号和密码。密码将仅用于登录，不会被存储。
                </Alert>

                <TextField
                  label="POTA 账号（邮箱）"
                  type="email"
                  fullWidth
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={authLoading}
                  autoFocus
                />

                <TextField
                  label="POTA 密码"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !authLoading) {
                      startAuth();
                    }
                  }}
                />

                {authError && (
                  <Alert severity="error" onClose={() => setAuthError(null)}>
                    {authError}
                  </Alert>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAuthDialogOpen(false);
              setAuthError(null);
              setUsername('');
              setPassword('');
            }}
            disabled={authLoading}
          >
            取消
          </Button>
          <Button
            onClick={startAuth}
            variant="contained"
            disabled={authLoading || !username || !password}
          >
            {authLoading ? '登录中...' : '登录'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PotaAuthDialog;
