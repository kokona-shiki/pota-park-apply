import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { CheckPermissionResponseSchema } from '../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../services/apiClient';

export const usePermission = (permissionCode: string) => {
  const { user, isAuthLoading, accessToken } = useAuth();
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
        const payload = await requestWithSchema(
          apiClient.get(`/api/check-permission/${permissionCode}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
          CheckPermissionResponseSchema
        );
        setHasPermission(payload.hasPermission);
      } catch (error) {
        console.error(`权限检查失败: ${permissionCode}`, error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionCode, user, isAuthLoading, accessToken]);

  return { hasPermission, loading };
};
