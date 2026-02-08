import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/apiClient';
import ReactMarkdown from 'react-markdown';

interface Notification {
  id: number;
  title: string;
  description: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link_url: string | null;
}

export const NotificationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotification = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        console.log('开始获取通知详情，ID:', id);
        
        const response = await fetchApi(`/api/notifications/${id}`, {
          method: 'GET',
        });

        console.log('通知详情响应:', response);

        // 尝试不同的数据结构
        const notificationData = (response as any).notification || (response as any).data?.notification;
        
        if (notificationData) {
          setNotification(notificationData);
          if (!notificationData.is_read) {
            await fetchApi(`/api/notifications/${id}/read`, {
              method: 'PUT',
            });
          }
        } else {
          console.error('响应数据结构不符合预期:', response);
          setError('响应数据结构错误');
        }
      } catch (err: unknown) {
        console.error('获取通知详情失败:', err);
        setError(err instanceof Error ? err.message : '获取通知详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();
  }, [id]);

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

  const getNotificationTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      park_application_status_change: '公园申请',
      user_management_operation: '用户管理',
      pota_data_sync: 'POTA 同步',
      callsign_change_request: '呼号变更',
      global_notification: '全局通知',
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !notification) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || '通知不存在'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/notifications')}>
          返回通知中心
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Button sx={{ mb: 2 }} onClick={() => navigate('/notifications')}>
        ← 返回通知中心
      </Button>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 'bold', flex: 1 }}>
              {notification.title}
            </Typography>
            <Chip
              label={getNotificationTypeLabel(notification.type)}
              size="medium"
              variant="outlined"
            />
            {notification.is_read ? (
              <Chip label="已读" size="medium" color="default" />
            ) : (
              <Chip label="未读" size="medium" color="error" />
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.disabled">
              发布时间：{formatTime(notification.created_at)}
            </Typography>
          </Box>

          <Box sx={{ mb: 3, color: 'text.primary' }}>
            <ReactMarkdown>{notification.description}</ReactMarkdown>
          </Box>

          {notification.link_url && (
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" href={notification.link_url} target="_blank" rel="noopener noreferrer">
                查看详情
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
