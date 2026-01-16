import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { CheckPermissionResponseSchema } from '../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../services/apiClient';

// 缓存存储
const permissionCache = new Map<string, {
  hasPermission: boolean;
  timestamp: number;
  userId: number;
}>();

// 缓存有效期（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

// 全局请求队列，确保相同的权限请求只执行一次
const pendingRequests = new Map<string, Promise<boolean>>();

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

    // 生成缓存键
    const cacheKey = `${user.id}-${permissionCode}`;
    
    // 检查缓存
    const cachedItem = permissionCache.get(cacheKey);
    const now = Date.now();
    
    // 缓存有效且用户匹配
    if (cachedItem && cachedItem.userId === user.id && (now - cachedItem.timestamp) < CACHE_TTL) {
      setHasPermission(cachedItem.hasPermission);
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        
        // 检查是否已有相同的请求在进行中
        const requestKey = `${user.id}-${permissionCode}`;
        let permissionResult: boolean;
        
        if (pendingRequests.has(requestKey)) {
          // 如果有相同的请求在进行中，等待结果
          permissionResult = await pendingRequests.get(requestKey)!;
        } else {
          // 如果没有相同的请求在进行中，发起新请求
          const requestPromise = requestWithSchema(
            apiClient.get(`/api/check-permission/${permissionCode}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }),
            CheckPermissionResponseSchema
          ).then((payload) => {
            return payload.hasPermission;
          }).catch((error) => {
            console.error(`权限检查失败: ${permissionCode}`, error);
            return false;
          }).finally(() => {
            // 请求完成后，从队列中移除
            pendingRequests.delete(requestKey);
          });
          
          // 将请求添加到队列
          pendingRequests.set(requestKey, requestPromise);
          
          // 等待请求结果
          permissionResult = await requestPromise;
        }
        
        // 更新缓存
        permissionCache.set(cacheKey, {
          hasPermission: permissionResult,
          timestamp: Date.now(),
          userId: user.id
        });
        
        setHasPermission(permissionResult);
      } catch (error) {
        console.error(`权限检查失败: ${permissionCode}`, error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionCode, user, isAuthLoading, accessToken]);

  // 监听用户登出，清除缓存和等待中的请求
  useEffect(() => {
    if (!user) {
      // 清除所有缓存
      permissionCache.clear();
      // 清除所有等待中的请求
      pendingRequests.clear();
    }
  }, [user]);

  return { hasPermission, loading };
};
