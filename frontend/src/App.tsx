// src/App.tsx
import { useState, createContext, useEffect, useCallback, useContext, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Box, Toolbar } from '@mui/material';
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

function RequireAuth({ children }: { children: ReactElement }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location, reason: '未登录或登录已失效' }} />;
  }

  return children;
}

function RequireAdmin({ children }: { children: ReactElement }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const isAdmin =
    user?.role === 'park_reviewer' || user?.role === 'pota_representative' || user?.role === 'system_admin';

  if (!user) {
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
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [accessToken]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  // 全局拦截：后端返回 401（未登录/登录失效）时，统一跳转登录页
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        const status = err?.response?.status;
        const url = String(err?.config?.url || '');

        // 避免登录/注册页自身请求造成跳转死循环
        const isAuthRequest = url.includes('/api/login') || url.includes('/api/register');

        if (status === 401 && !isAuthRequest) {
          const from = locationRef.current;
          logout();
          navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } });
        }

        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, [logout, navigate]);

  // 供“用户信息页刷新按钮”使用：刷新 token 并同步最新角色
  const refreshSession = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('缺少 refreshToken');
    }

    const res = await axios.post(
      '/api/refresh-token',
      {},
      {
        headers: {
          'X-Refresh-Token': refreshToken
        }
      }
    );

    const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser } = res.data;
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);

    return res.data;
  }, [refreshToken]);

  const isAdmin =
    user?.role === 'park_reviewer' || user?.role === 'pota_representative' || user?.role === 'system_admin';
  const isSysAdmin = user?.role === 'system_admin';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        refreshToken,
        setRefreshToken,
        refreshSession,
        logout
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
                <RequireAdmin>
                  <ApplicationsList />
                </RequireAdmin>
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
