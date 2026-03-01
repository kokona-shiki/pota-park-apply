import { apiClient, requestWithSchema } from './apiClient';
import { z } from 'zod';
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  AuthUserSchema,
} from '../../../shared/schemas/auth';

const authService = {
  /**
   * 用户登录
   */
  login: async (data: z.infer<typeof LoginRequestSchema>) => {
    return requestWithSchema(apiClient.post('/api/login', data), AuthUserSchema);
  },

  /**
   * 用户注册
   */
  register: async (data: z.infer<typeof RegisterRequestSchema>) => {
    return requestWithSchema(apiClient.post('/api/register', data), AuthUserSchema);
  },

  /**
   * 获取用户信息
   */
  getUserInfo: async () => {
    return requestWithSchema(apiClient.get('/api/user-info'), AuthUserSchema);
  },

  /**
   * 刷新 token
   */
  refreshToken: async () => {
    return requestWithSchema(
      apiClient.post('/api/refresh-token', {}),
      z.object({
        accessToken: z.string(),
        user: AuthUserSchema
      })
    );
  },

  /**
   * 获取用户权限
   */
  getUserPermissions: async () => {
    return requestWithSchema(apiClient.get('/api/user-permissions'), z.array(z.string()));
  },

  /**
   * 登出
   */
  logout: async () => {
    return requestWithSchema(apiClient.post('/api/logout'), z.object({ success: z.boolean() }));
  },
};

export default authService;
