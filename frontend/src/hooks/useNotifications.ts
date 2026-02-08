import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import type { AuthUser } from '../auth/context';
import { fetchApi } from '../services/apiClient';

interface Notification {
  id: number;
  type: string;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
  link_url?: string | null;
  metadata?: Record<string, unknown>;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const useNotifications = (filters: {
  type?: string;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
} = {}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
        if (filters.page) params.append('page', String(filters.page));
        if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

        const response = await fetchApi<{ notifications: Notification[]; pagination: Pagination }>(
          `/api/notifications?${params.toString()}`
        );
        if (response.data?.notifications) {
          setNotifications(response.data.notifications);
          if (response.data.pagination) {
            setPagination(response.data.pagination);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取通知列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, JSON.stringify(filters)]);

  return { notifications, loading, error, pagination, refetch: () => {} };
};

export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const userRef = useRef<AuthUser | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetchApi<{ unread_count: number }>('/api/notifications/unread-count');
      
      // 检查响应结构，处理不同的返回格式
      let unreadCountValue: number | undefined;
      if ('unread_count' in response) {
        // API 直接返回了 {unread_count: number}
        unreadCountValue = Number(response.unread_count);
      } else if (response.data && typeof response.data === 'object' && 'unread_count' in response.data) {
        // API 返回了标准格式 {code, message, data: {unread_count: number}}
        unreadCountValue = Number(response.data.unread_count);
      }
      
      if (unreadCountValue !== undefined) {
        setUnreadCount(unreadCountValue);
      }
    } catch (err) {
      console.error('获取未读数量失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // 当 user 从 null 变为非 null 或者 user 对象的 id 发生变化时，重新获取未读数量
    if (user) {
      if (!userRef.current || user.id !== userRef.current.id) {
        fetchUnreadCount();
        userRef.current = user;
      }
    }
    // 无论 user 是否变化，都设置定期轮询
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  return { unreadCount, loading, refetch: fetchUnreadCount };
};

export const usePopupNotification = () => {
  const { user } = useAuth();
  const [popupNotification, setPopupNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPopupNotification = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await fetchApi<{ notification: Notification }>('/api/notifications/popup');
        if (response.data?.notification) {
          setPopupNotification(response.data.notification);
        }
      } catch (err) {
        console.error('获取弹窗通知失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPopupNotification();
  }, [user]);

  const dismissPopup = async () => {
    if (!popupNotification) return;

    try {
      await fetchApi(`/api/notifications/${popupNotification.id}/dismiss-popup`, {
        method: 'PUT',
      });
      setPopupNotification(null);
    } catch (err) {
      console.error('关闭弹窗失败:', err);
    }
  };

  return { popupNotification, loading, dismissPopup };
};
