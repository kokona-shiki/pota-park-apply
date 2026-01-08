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
  const hasAttemptedRefreshRef = useRef(false);
  const interceptorRegisteredRef = useRef(false);

  // axios 在需要时携带 cookie（同源下也会自动携带，这里显式开启以兼容未来配置）
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // token -> axios 默认 Authorization
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
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
      setIsAuthLoading(false);
      return;
    }

    // 使用ref确保只尝试一次刷新,避免重复调用
    if (hasAttemptedRefreshRef.current) return;

    hasAttemptedRefreshRef.current = true;

    refreshSession()
      .catch(() => {
        // 未登录时后端会返回 401，这里不提示
      })
      .finally(() => {
        // 无论成功与否,都结束加载状态
        setIsAuthLoading(false);
      });
  }, [isAuthPage]);

  // 多标签页同步：退出登录广播（不存 token，只做“登出同步”）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOGOUT_BROADCAST_KEY) return;
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);

    // 通知其他标签页同步登出
    localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()))

    // 通知后端清除 refresh cookie（失败也不影响前端登出）
    axios.post('/api/logout').catch((e) => {
      console.warn('退出登录请求失败（忽略）:', e?.message || e);
    });
  }, []);

  // 全局拦截：
  // 1) accessToken 过期：自动用 HttpOnly Cookie 刷新并重试一次原请求
  // 2) 刷新失败：统一跳转登录页
  useEffect(() => {
    // 确保拦截器只注册一次
    if (interceptorRegisteredRef.current) return;

    interceptorRegisteredRef.current = true;

    axios.interceptors.response.use(
      (res) => res,
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
  }, []);

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
        isAuthLoading
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
