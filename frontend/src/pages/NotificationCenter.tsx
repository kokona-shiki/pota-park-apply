import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { fetchApi } from '../services/apiClient';

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isReadFilter, setIsReadFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { notifications, loading, pagination, refetch } = useNotifications({
    type: typeFilter || undefined,
    isRead: isReadFilter === '' ? undefined : isReadFilter === 'true',
    page,
    pageSize,
  });

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

    navigate(`/notifications/${notification.id}`);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">通知中心</Typography>
        <Button onClick={handleMarkAllAsRead} variant="outlined">
          全部标记已读
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
        }}
      >
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>通知类型</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            label="通知类型"
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="park_application_status_change">公园申请</MenuItem>
            <MenuItem value="user_management_operation">用户管理</MenuItem>
            <MenuItem value="pota_data_sync">POTA 同步</MenuItem>
            <MenuItem value="callsign_change_request">呼号变更</MenuItem>
            <MenuItem value="global_notification">全局通知</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>已读状态</InputLabel>
          <Select
            value={isReadFilter}
            onChange={(e) => {
              setIsReadFilter(e.target.value);
              setPage(1);
            }}
            label="已读状态"
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="false">未读</MenuItem>
            <MenuItem value="true">已读</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography color="text.secondary">暂无通知</Typography>
        </Box>
      ) : (
        <Box>
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                mb: 2,
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3,
                },
                bgcolor: notification.is_read ? 'background.paper' : 'action.selected',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {notification.title}
                      </Typography>
                      <Chip
                        label={getNotificationTypeLabel(notification.type)}
                        size="small"
                        variant="outlined"
                      />
                      {!notification.is_read && (
                        <Chip label="未读" size="small" color="error" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.disabled">
                      {formatTime(notification.created_at)}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.disabled">
                  {formatTime(notification.created_at)}
                </Typography>
              </CardContent>
            </Card>
          ))}

          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pagination.totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
