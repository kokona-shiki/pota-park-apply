import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import axios from 'axios';

export const usePermission = (permissionCode: string) => {
  const { user, isAuthLoading } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isAuthLoading || !user) {
      setHasPermission(null);
      setLoading(true);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/check-permission/${permissionCode}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setHasPermission(response.data.hasPermission);
      } catch (error) {
        console.error(`权限检查失败: ${permissionCode}`, error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionCode, user, isAuthLoading]);

  return { hasPermission, loading };
};
