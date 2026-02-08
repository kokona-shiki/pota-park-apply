import {
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useNotifications } from '../hooks/useNotifications';
import { fetchApi } from '../services/apiClient';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown = ({ onClose }: NotificationDropdownProps) => {
  const { notifications, loading, refetch } = useNotifications({ pageSize: 10 });

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      try {
        await fetchApi(`/api/notifications/${notification.id}/read`, {
          method: 'PUT',
        });
        refetch();
      } catch (err: any) {
        console.error('标记已读失败:', err);
      }
    }

    if (notification.link_url) {
      window.location.href = notification.link_url;
    }
    onClose();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchApi('/api/notifications/read-all', {
        method: 'PUT',
      });
      refetch();
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
        borderRadius: 1,
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
        }}
      >
        <Typography variant="h6">通知</Typography>
        <Button size="small" onClick={handleMarkAllAsRead}>
          全部标记已读
        </Button>
      </Box>
      <Divider />
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
          {notifications.map((notification) => (
            <Box
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                p: 2,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                bgcolor: notification.is_read ? 'transparent' : 'action.selected',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: notification.is_read ? 'normal' : 'bold',
                }}
              >
                {notification.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {notification.description}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                {formatTime(notification.created_at)}
              </Typography>
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
