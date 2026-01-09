// src/App.tsx
import { useState, createContext, useEffect, useCallback, useContext, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Box, Toolbar, Typography } from '@mui/material';
import TopBar from './components/TopBar';
import SideBar from './components/SideBar';
import Home from './pages/Home';
import AddPark from './pages/AddPark';
import ApplicationsList from './pages/ApplicationsList';
import MyUploads from './pages/MyUploads';
import ExportPage from './pages/ExportPage';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import UserInfo from './pages/UserInfo';
import AdminPanel from './pages/AdminPanel';
import axios from 'axios';

export const AuthContext = createContext<any>(null);

export const LOGOUT_BROADCAST_KEY = 'pota_logout';
export const REDIRECT_KEY = 'pota_redirect_after_login';

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, isAuthLoading } = useContext(AuthContext);
  const location = useLocation();

  // 如果正在加载认证状态,显示加载提示
  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  // 认证加载完成,检查用户是否登录
  if (!user) {
    // 保存目标路径到 localStorage,以便登录后跳转
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      localStorage.setItem(REDIRECT_KEY, location.pathname + location.search);
    }
    return <Navigate to="/login" replace state={{ from: location, reason: '未登录或登录已失效' }} />;
  }

  return children;
}

function RequireAdmin({ children }: { children: ReactElement }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const isAdmin =
    user?.role === 'park_reviewer' || user?.role === 'pota_representative';

  if (!user) {
    // 保存目标路径到 localStorage,以便登录后跳转
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      localStorage.setItem(REDIRECT_KEY, location.pathname + location.search);
    }
    return <Navigate to="/login" replace state={{ from: location, reason: '未登录或登录已失效' }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireSysAdmin({ children }: { children: ReactElement }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    // 保存目标路径到 localStorage,以便登录后跳转
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      localStorage.setItem(REDIRECT_KEY, location.pathname + location.search);
    }
    return <Navigate to="/login" replace state={{ from: location, reason: '未登录或登录已失效' }} />;
  }

  if (user?.role !== 'system_admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

type AuthData = {
  accessToken: string;
  user: any;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // 添加认证加载状态

  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  // refresh-token 请求去重：多个请求同时 401 时，只发一次刷新
  const refreshInFlightRef = useRef<Promise<any> | null>(null);
  const isTokenReadyRef = useRef(false);
  const interceptorRegisteredRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const AUTH_DATA_KEY = 'pota_auth_data'; // 改为 localStorage

  // axios 在需要时携带 cookie（同源下也会自动携带，这里显式开启以兼容未来配置）
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // token -> axios 默认 Authorization
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      isTokenReadyRef.current = true;
      console.log('[App] Authorization header 已设置:', axios.defaults.headers.common.Authorization.substring(0, 50) + '...');
    }
    // 不要在 accessToken 为 null 时清除 header，避免初始加载时的竞态条件
  }, [accessToken]);

  // 刷新 session（refreshToken 由后端通过 HttpOnly Cookie 持有，前端 JS 不可读）
  const refreshSession = useCallback(() => {
    return axios.post('/api/refresh-token', {}).then((res) => {
      const { accessToken: newAccessToken, user: newUser } = res.data;
      setAccessToken(newAccessToken);
      setUser(newUser);
      return res.data;
    });
  }, []);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // 尝试静默刷新以恢复登录态（新开标签页/刷新页面不会丢登录）
  // 但：直接进入登录/注册页时不需要请求 refresh-token，减少无意义请求
  useEffect(() => {
    if (isAuthPage) {
      // 使用 setTimeout 将 setState 调用推迟到 effect 返回后
      const timeout = setTimeout(() => setIsAuthLoading(false), 0);
      return () => clearTimeout(timeout);
    }

    // 防止在同一个组件挂载周期内多次调用 (React Strict Mode 会触发两次)
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // 尝试从 localStorage 恢复认证数据
    const storedAuth = localStorage.getItem(AUTH_DATA_KEY);
    if (storedAuth) {
      try {
        const authData: AuthData = JSON.parse(storedAuth);
        console.log('[App] localStorage 中的认证数据:', {
          accessToken: authData.accessToken.substring(0, 50) + '...',
          user: authData.user
        });

        // 解析 JWT 查看过期时间
        const tokenParts = authData.accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiresInMinutes = Math.floor((payload.exp * 1000 - Date.now()) / 1000 / 60);
          console.log('[App] Token 过期时间:', new Date(payload.exp * 1000));
          console.log('[App] Token 还剩', expiresInMinutes, '分钟过期');
        }

        // 直接使用 localStorage 中的 token,不管是否即将过期
        // 如果 token 过期,后续请求会返回 401,由拦截器自动刷新
        console.log('[App] 从 localStorage 恢复登录态');

        // 同步设置 axios header,避免后续请求在 effect 执行前就发出
        axios.defaults.headers.common.Authorization = `Bearer ${authData.accessToken}`;
        isTokenReadyRef.current = true;

        setAccessToken(authData.accessToken);
        setUser(authData.user);
        setIsAuthLoading(false);
        return;
      } catch (e) {
        console.error('[App] 解析 localStorage 失败:', e);
        // 解析失败，清除无效数据
        localStorage.removeItem(AUTH_DATA_KEY);
      }
    }

    // localStorage 无有效数据,尝试使用 refresh-token
    console.log('[App] localStorage 无有效数据,开始尝试刷新 token...');

    // 尝试使用 refresh-token 恢复登录态
    refreshSession()
      .then((data) => {
        console.log('[App] 刷新 token 成功:', data);

        // 保存到 localStorage (包含过期时间信息)
        const authData: AuthData = {
          accessToken: data.accessToken,
          user: data.user
        };
        localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData));
      })
      .catch((err) => {
        console.error('[App] 刷新 token 失败:', err?.response?.status, err?.response?.data);
        // 刷新失败时，清除用户状态、token 和 localStorage
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(AUTH_DATA_KEY);
      })
      .finally(() => {
        // 无论成功与否,都结束加载状态
        setIsAuthLoading(false);
      });
  }, [isAuthPage, refreshSession]);

  // 多标签页同步：退出登录广播 + token 更新同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // 处理登出广播
      if (e.key === LOGOUT_BROADCAST_KEY) {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(AUTH_DATA_KEY);
        return;
      }

      // 处理 token 更新 (其他标签页刷新了 token)
      if (e.key === AUTH_DATA_KEY && e.newValue) {
        try {
          const authData: AuthData = JSON.parse(e.newValue);
          // 更新当前标签页的 token 和用户信息
          setAccessToken(authData.accessToken);
          setUser(authData.user);
          console.log('[App] 从其他标签页同步 token');
        } catch (err) {
          console.error('[App] 解析 localStorage 失败:', err);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [AUTH_DATA_KEY]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);

    // 清除 localStorage 中的认证数据
    localStorage.removeItem(AUTH_DATA_KEY);

    // 通知其他标签页同步登出
    localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));

    // 通知后端清除 refresh cookie（失败也不影响前端登出）
    axios.post('/api/logout').catch((e) => {
      console.warn('退出登录请求失败（忽略）:', e?.message || e);
    });
  }, [AUTH_DATA_KEY]);

  // 全局拦截：
  // 1) accessToken 过期：自动用 HttpOnly Cookie 刷新并重试一次原请求
  // 2) 刷新失败：统一跳转登录页
  useEffect(() => {
    // 确保拦截器只注册一次
    if (interceptorRegisteredRef.current) return;

    interceptorRegisteredRef.current = true;

    axios.interceptors.response.use(
      (res) => {
        // 统一后端返回：{ code, message, data }
        const payload = res?.data as any;
        if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
          // success
          if (payload.code === 0) {
            return { ...res, data: payload.data };
          }

          // business error: HTTP 200，但用 code/message 表达
          const bizRes = { ...res, data: { ...payload, error: payload.message } };
          const bizErr: any = new Error(payload?.message || '业务错误');
          bizErr.isBusinessError = true;
          bizErr.code = payload.code;
          bizErr.response = bizRes;
          return Promise.reject(bizErr);
        }

        return res;
      },
      (err) => {
        const status = err?.response?.status;
        const url = String(err?.config?.url || '');

        // 避免登录/注册/刷新本身请求造成循环
        const isAuthRequest = url.includes('/api/login') || url.includes('/api/register');
        const isRefreshRequest = url.includes('/api/refresh-token');

        if (status !== 401 || isAuthRequest || isRefreshRequest) {
          return Promise.reject(err);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const originalRequest: any = err?.config || {};
        if (originalRequest.__retried) {
          const from = locationRef.current;
          // 保存目标路径到 localStorage
          if (from.pathname !== '/login' && from.pathname !== '/register') {
            localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
          }
          logout();
          navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } });
          return Promise.reject(err);
        }


        originalRequest.__retried = true;

        if (!refreshInFlightRef.current) {
          refreshInFlightRef.current = refreshSession().finally(() => {
            refreshInFlightRef.current = null;
          });
        }

        return refreshInFlightRef.current
          .then((data: any) => {
            // 更新 localStorage 中的认证数据
            const authData: AuthData = {
              accessToken: data.accessToken,
              user: data.user
            };
            localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData));

            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${data.accessToken}`
            };
            return axios(originalRequest);
          })
          .catch((refreshErr) => {
            const from = locationRef.current;
            // 保存目标路径到 localStorage
            if (from.pathname !== '/login' && from.pathname !== '/register') {
              localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
            }
            logout();
            navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } });
            return Promise.reject(refreshErr);
          });
      }
    );

    // 不需要清理,因为拦截器应该在整个应用生命周期内保持
    return () => {
      // 只在组件卸载时清理(理论上不会发生)
    };
  }, [logout, navigate, refreshSession]);

  const isAdmin =
    user?.role === 'park_reviewer' || user?.role === 'pota_representative';
  const isSysAdmin = user?.role === 'system_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        refreshSession,
        logout,
        isAuthLoading,
        isTokenReady: isTokenReadyRef.current
      }}
    >
      <Box sx={{ display: 'flex' }}>
        {!isAuthPage && <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}
        {!isAuthPage && <SideBar isOpen={isSidebarOpen} isAdmin={isAdmin} isSysAdmin={isSysAdmin} />}
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          {!isAuthPage && <Toolbar />}
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              }
            />
            <Route
              path="/add-park"
              element={
                <RequireAuth>
                  <AddPark />
                </RequireAuth>
              }
            />
            <Route
              path="/applications"
              element={
                <RequireAuth>
                  <ApplicationsList />
                </RequireAuth>
              }
            />
            <Route
              path="/my-uploads"
              element={
                <RequireAuth>
                  <MyUploads />
                </RequireAuth>
              }
            />
            <Route
              path="/export"
              element={
                <RequireAuth>
                  <ExportPage />
                </RequireAuth>
              }
            />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
            <Route
              path="/user-info"
              element={
                <RequireAuth>
                  <UserInfo />
                </RequireAuth>
              }
            />
            <Route
              path="/admin-panel"
              element={
                <RequireSysAdmin>
                  <AdminPanel />
                </RequireSysAdmin>
              }
            />
          </Routes>
        </Box>
      </Box>
    </AuthContext.Provider>
  );
}

export default App;
