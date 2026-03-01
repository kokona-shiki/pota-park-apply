import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../services/apiClient';
import { usePermission } from '../hooks/usePermission';

interface GlobalNotification {
  id: number;
  title: string;
  notification_mode: string;
  status: string;
  published_at?: string;
  published_by_email?: string;
}

export const GlobalNotificationManager = () => {
  const { hasPermission } = usePermission('view_global_notifications');
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawDialog, setWithdrawDialog] = useState<{
    open: boolean;
    notification: GlobalNotification | null;
  }>({
    open: false,
    notification: null,
  });
  const [withdrawReason, setWithdrawReason] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (hasPermission !== true) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchApi('/api/notifications/global');
      if (response.data && typeof response.data === 'object' && 'notifications' in response.data) {
        setNotifications((response.data as { notifications: GlobalNotification[] }).notifications);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取通知列表失败');
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  if (hasPermission === null) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (hasPermission === false) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">您没有权限访问此页面</Typography>
      </Box>
    );
  }

  const handleWithdraw = async () => {
    if (!withdrawDialog.notification) return;

    try {
      await fetchApi(`/api/notifications/${withdrawDialog.notification.id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason: withdrawReason }),
      });
      setWithdrawDialog({ open: false, notification: null });
      setWithdrawReason('');
      fetchNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤回通知失败');
    }
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: 'default' | 'success' | 'error' }> = {
      draft: { label: '草稿', color: 'default' },
      published: { label: '已发布', color: 'success' },
      withdrawn: { label: '已撤回', color: 'error' },
    };
    return statusMap[status] || { label: status, color: 'default' };
  };

  const getModeLabel = (mode: string) => {
    const modeMap: Record<string, string> = {
      normal: '站内信',
      popup: '弹窗通知',
    };
    return modeMap[mode] || mode;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        已发布全局通知管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography color="text.secondary">暂无全局通知</Typography>
        </Box>
      ) : (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>标题</TableCell>
                    <TableCell>模式</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>发布时间</TableCell>
                    <TableCell>发布者</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>{notification.id}</TableCell>
                      <TableCell>{notification.title}</TableCell>
                      <TableCell>
                        <Chip
                          label={getModeLabel(notification.notification_mode)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(notification.status).label}
                          size="small"
                          color={getStatusLabel(notification.status).color}
                        />
                      </TableCell>
                      <TableCell>
                        {notification.published_at
                          ? formatTime(notification.published_at)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {notification.published_by_email || '-'}
                      </TableCell>
                      <TableCell>
                        {notification.status === 'published' && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() =>
                              setWithdrawDialog({
                                open: true,
                                notification,
                              })
                            }
                          >
                            撤回
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={withdrawDialog.open}
        onClose={() => setWithdrawDialog({ open: false, notification: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>撤回通知</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            确定要撤回通知&quot;{withdrawDialog.notification?.title}&quot;吗？
          </Typography>
          <TextField
            fullWidth
            label="撤回原因（可选）"
            multiline
            rows={3}
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setWithdrawDialog({ open: false, notification: null })}
          >
            取消
          </Button>
          <Button onClick={handleWithdraw} color="error" variant="contained">
            确认撤回
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
