import {
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadNotifications } from '../hooks/useNotifications';
import { fetchApi } from '../services/apiClient';
import { truncateMarkdown } from '../utils/markdown';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown = ({ onClose }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const { notifications, loading, refetch } = useNotifications({ pageSize: 10 });
  const { refetch: refetchUnreadCount } = useUnreadNotifications();

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      try {
        await fetchApi(`/api/notifications/${notification.id}/read`, {
          method: 'PUT',
        });
        refetch();
        refetchUnreadCount();
      } catch (err: any) {
        console.error('标记已读失败:', err);
      }
    }

    navigate(`/notifications/${notification.id}`);
    onClose();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchApi('/api/notifications/read-all', {
        method: 'PUT',
      });
      refetch();
      refetchUnreadCount();
    } catch (err: any) {
      console.error('全部标记已读失败:', err);
    }
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <Box
      sx={{
        width: 400,
        maxHeight: 500,
        overflow: 'auto',
        bgcolor: 'background.paper',
        boxShadow: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          通知
        </Typography>
        <Button size="small" onClick={handleMarkAllAsRead}>
          全部标记已读
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无通知</Typography>
        </Box>
      ) : (
        <Box>
          {notifications.map((notification, index) => (
            <Box
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                p: 2,
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                bgcolor: notification.is_read ? 'transparent' : 'action.selected',
                borderBottom: index !== notifications.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ pr: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="text.primary"
                  sx={{ mb: 0.5 }}
                >
                  {notification.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: '0.875rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                  }}
                >
                  {truncateMarkdown(notification.description, 100)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  {formatTime(notification.created_at)}
                </Typography>
              </Box>
              {!notification.is_read && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    position: 'absolute',
                    top: 16,
                    right: 16,
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
