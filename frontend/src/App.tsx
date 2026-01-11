// src/App.tsx
import { useState, useEffect, useCallback, useContext, useRef } from 'react';
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
import { AuthContext, AUTH_DATA_KEY, LOGOUT_BROADCAST_KEY, REDIRECT_KEY } from './auth/context';
import type { AuthUser } from './auth/context';

const TOKEN_EXP_SKEW_MS = 60 * 1000; // exp 提前 60 秒视为“即将过期”
const REFRESH_LOCK_KEY = 'pota_is_refreshing';
const REFRESH_LOCK_TTL_MS = 30 * 1000;
const REFRESH_WAIT_TIMEOUT_MS = 35 * 1000;
const TAB_ID_KEY = 'pota_tab_id';

type AuthData = {
  accessToken: string;
  user: unknown;
};

type RefreshLock = {
  owner: string;
  ts: number;
};

type TokenWaiter = {
  resolve: (token: string | null) => void;
  reject: (err: any) => void;
  timeoutId: number;
};

function getOrCreateTabId() {
  const existing = sessionStorage.getItem(TAB_ID_KEY);
  if (existing) return existing;
  const tabId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(TAB_ID_KEY, tabId);
  return tabId;
}

function base64UrlToBase64(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padLen);
}

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(base64UrlToBase64(payload));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getJwtExpMs(token: string) {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return null;
  return exp * 1000;
}

function getJwtIatMs(token: string) {
  const payload = decodeJwtPayload(token);
  const iat = payload?.iat;
  if (typeof iat !== 'number') return null;
  return iat * 1000;
}

function isTokenFresh(token: string) {
  const expMs = getJwtExpMs(token);
  if (!expMs) return false;
  return Date.now() < expMs - TOKEN_EXP_SKEW_MS;
}

function readAuthData() {
  const raw = localStorage.getItem(AUTH_DATA_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthData;
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAuthData(data: AuthData) {
  localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(data));
}

function readRefreshLock(): RefreshLock | null {
  const raw = localStorage.getItem(REFRESH_LOCK_KEY);
  if (!raw) return null;
  try {
    const lock = JSON.parse(raw) as RefreshLock;
    if (!lock?.owner || typeof lock.ts !== 'number') return null;
    return lock;
  } catch {
    return null;
  }
}

function isLockExpired(lock: RefreshLock) {
  return Date.now() - lock.ts > REFRESH_LOCK_TTL_MS;
}

function useAuthRequired() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext not provided');
  return ctx;
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, isAuthLoading } = useAuthRequired();
  const location = useLocation();

  // 如果正在加载认证状态,显示加载提示
  if (isAuthLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
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
    return (
      <Navigate to="/login" replace state={{ from: location, reason: '未登录或登录已失效' }} />
    );
  }

  return children;
}

function RequireSysAdmin({ children }: { children: ReactElement }) {
  const { user } = useAuthRequired();
  const location = useLocation();

  if (!user) {
    // 保存目标路径到 localStorage,以便登录后跳转
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      localStorage.setItem(REDIRECT_KEY, location.pathname + location.search);
    }
    return (
      <Navigate to="/login" replace state={{ from: location, reason: '未登录或登录已失效' }} />
    );
  }

  if (user?.role !== 'system_admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  // Tab identity
  const tabIdRef = useRef<string>(getOrCreateTabId());

  // refresh-token 去重（本 Tab）+ 跨 Tab 锁/队列
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const waitersRef = useRef<TokenWaiter[]>([]);

  const isTokenReadyRef = useRef(false);
  const interceptorRegisteredRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // axios 在需要时携带 cookie（同源下也会自动携带，这里显式开启以兼容未来配置）
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // token -> axios 默认 Authorization
  useEffect(() => {
    accessTokenRef.current = accessToken;

    if (accessToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      isTokenReadyRef.current = true;
      console.log(
        '[App] Authorization header 已设置:',
        axios.defaults.headers.common.Authorization.substring(0, 50) + '...'
      );
    }
    // 不要在 accessToken 为 null 时清除 header，避免初始加载时的竞态条件
  }, [accessToken]);

  const rejectAllWaiters = useCallback((err: any) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const w of waiters) {
      window.clearTimeout(w.timeoutId);
      w.reject(err);
    }
  }, []);

  const resolveAllWaiters = useCallback((token: string | null) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const w of waiters) {
      window.clearTimeout(w.timeoutId);
      w.resolve(token);
    }
  }, []);

  const waitForTokenFromOtherTab = useCallback(() => {
    return new Promise<string | null>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('等待刷新超时'));
      }, REFRESH_WAIT_TIMEOUT_MS);

      waitersRef.current.push({ resolve, reject, timeoutId });
    });
  }, []);

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

    rejectAllWaiters(new Error('已登出'));
  }, [rejectAllWaiters]);

  const getCurrentAccessToken = useCallback(() => {
    // 注意：这里必须优先读 localStorage。
    // 因为本项目支持“跨标签页/iframe”同步，当其他文档上下文更新了 `AUTH_DATA_KEY` 时，
    // 本文档的 React state 可能还没来得及同步（或错过 storage 事件），但 localStorage 已经是最新。
    const stored = readAuthData()?.accessToken || null;
    return stored || accessTokenRef.current || null;
  }, []);

  const performRefreshAsLeader = useCallback(async () => {
    const res = await axios.post(
      '/api/refresh-token',
      {},
      { headers: { 'X-Tab-Id': tabIdRef.current } }
    );
    const { accessToken: newAccessToken, user: newUser } = res.data as any;

    if (!newAccessToken || !newUser) {
      throw new Error('刷新 token 返回数据不完整');
    }

    setAccessToken(newAccessToken);
    setUser(newUser as AuthUser);

    writeAuthData({ accessToken: newAccessToken, user: newUser });
    return newAccessToken as string;
  }, []);

  const ensureValidAccessToken = useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      const current = getCurrentAccessToken();
      if (current && !forceRefresh && isTokenFresh(current)) {
        return current;
      }

      // 本 Tab 内去重
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      // 优先使用浏览器原生跨文档互斥锁（同源 tab/iframe 共享），可稳定避免并发双刷。
      const navAny: any = navigator as any;
      if (navAny?.locks?.request) {
        refreshPromiseRef.current = navAny.locks
          .request('pota_refresh_token_v1', { mode: 'exclusive' }, async () => {
            const latest = getCurrentAccessToken();

            // 关键：锁内二次检查。
            // - 对“普通请求”：如果已经有新鲜 token（可能是别的 iframe/tab 刷新的），直接复用。
            // - 对“强制刷新”：如果 token 刚刚由别的上下文刷新（iat 很新），也复用，避免并发双刷。
            if (latest && isTokenFresh(latest)) {
              if (!forceRefresh) return latest;

              const iatMs = getJwtIatMs(latest);
              if (iatMs && Date.now() - iatMs < 3000) return latest;
            }

            return await performRefreshAsLeader();
          })
          .finally(() => {
            refreshPromiseRef.current = null;
          });

        return refreshPromiseRef.current;
      }

      // 降级：localStorage 锁（非原子，仍可能在极端竞态下出现双刷）
      const tabId = tabIdRef.current;
      const lock = readRefreshLock();

      const canLead = !lock || lock.owner === tabId || isLockExpired(lock);

      if (canLead) {
        // 抢锁（非原子，但足以避免绝大多数并发）
        localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ owner: tabId, ts: Date.now() }));

        refreshPromiseRef.current = performRefreshAsLeader()
          .then((token) => {
            resolveAllWaiters(token);
            return token;
          })
          .catch((err) => {
            // 失败时释放锁并广播登出（避免其他标签页一直等待）
            localStorage.removeItem(REFRESH_LOCK_KEY);
            localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
            rejectAllWaiters(err);
            throw err;
          })
          .finally(() => {
            refreshPromiseRef.current = null;
            // 领头羊释放锁
            const latest = readRefreshLock();
            if (latest?.owner === tabId) {
              localStorage.removeItem(REFRESH_LOCK_KEY);
            }
          });

        return refreshPromiseRef.current;
      }

      // 其他标签页正在刷新：挂起等待 storage 事件通知
      const token = await waitForTokenFromOtherTab();
      if (token && isTokenFresh(token)) return token;

      const latestToken = getCurrentAccessToken();
      if (latestToken && isTokenFresh(latestToken)) return latestToken;

      throw new Error('等待刷新完成后仍无有效 token');
    },
    [
      getCurrentAccessToken,
      performRefreshAsLeader,
      rejectAllWaiters,
      resolveAllWaiters,
      waitForTokenFromOtherTab,
    ]
  );

  const refreshSession = useCallback(() => {
    // 对外暴露：强制刷新一次（会走跨标签页锁）
    return ensureValidAccessToken({ forceRefresh: true }).then(() => {
      const stored = readAuthData();
      return stored;
    });
  }, [ensureValidAccessToken]);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // 尝试静默恢复登录态：
  // - token 未过期：直接恢复（0 额外负载）
  // - token 过期：使用跨标签页锁刷新，避免并发打爆 refresh-token
  useEffect(() => {
    if (isAuthPage) {
      const timeout = setTimeout(() => setIsAuthLoading(false), 0);
      return () => clearTimeout(timeout);
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const stored = readAuthData();
    if (stored?.accessToken && isTokenFresh(stored.accessToken)) {
      console.log('[App] 从 localStorage 恢复登录态（token 有效）');
      axios.defaults.headers.common.Authorization = `Bearer ${stored.accessToken}`;
      isTokenReadyRef.current = true;
      setAccessToken(stored.accessToken);
      setUser(stored.user as AuthUser);
      setIsAuthLoading(false);
      return;
    }

    // localStorage 无有效 token（或即将过期）：走 refresh-token
    console.log('[App] localStorage 无有效 token，尝试 refresh-token（带跨标签页锁）');

    ensureValidAccessToken()
      .then(() => {
        const latest = readAuthData();
        if (latest?.accessToken) {
          setAccessToken(latest.accessToken);
          setUser(latest.user as AuthUser);
        }
      })
      .catch((err) => {
        console.error('[App] 刷新 token 失败:', err?.response?.status, err?.response?.data);
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(AUTH_DATA_KEY);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, [ensureValidAccessToken, isAuthPage]);

  // 多标签页同步：退出登录广播 + token 更新同步 + refresh 锁队列
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_BROADCAST_KEY) {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(AUTH_DATA_KEY);
        rejectAllWaiters(new Error('已登出'));
        return;
      }

      // token 更新（领头羊刷新成功后写入 AUTH_DATA_KEY）
      if (e.key === AUTH_DATA_KEY) {
        if (!e.newValue) {
          // 被清空
          setUser(null);
          setAccessToken(null);
          rejectAllWaiters(new Error('认证信息被清除'));
          return;
        }

        try {
          const authData: AuthData = JSON.parse(e.newValue);
          setAccessToken(authData.accessToken);
          setUser(authData.user as AuthUser);
          console.log('[App] 从其他标签页同步 token');
          resolveAllWaiters(authData.accessToken || null);
        } catch (err) {
          console.error('[App] 解析 localStorage 失败:', err);
        }
      }

      // 刷新锁变化：锁释放但没有 token 更新时，避免等待队列一直挂起
      if (e.key === REFRESH_LOCK_KEY && e.newValue === null) {
        const latest = readAuthData();
        if (latest?.accessToken && isTokenFresh(latest.accessToken)) {
          resolveAllWaiters(latest.accessToken);
        } else {
          rejectAllWaiters(new Error('刷新锁已释放但无有效 token'));
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [rejectAllWaiters, resolveAllWaiters]);

  // axios 全局拦截：
  // - request：解析 exp，token 有效直接发；过期则跨标签页锁刷新
  // - response：兜底处理 401（比如 token 被服务端提前失效）
  useEffect(() => {
    if (interceptorRegisteredRef.current) return;
    interceptorRegisteredRef.current = true;

    // request interceptor
    axios.interceptors.request.use(async (config) => {
      const url = String((config as any)?.url || '');
      const isAuthRequest = url.includes('/api/login') || url.includes('/api/register');
      const isRefreshRequest = url.includes('/api/refresh-token');
      const isLogoutRequest = url.includes('/api/logout');

      if (isAuthRequest || isRefreshRequest || isLogoutRequest) {
        return config;
      }

      const token = getCurrentAccessToken();
      if (token && isTokenFresh(token)) {
        (config.headers as any) = { ...(config.headers as any), Authorization: `Bearer ${token}` };
        return config;
      }

      try {
        // 这里不要强制刷新。
        // 否则在“跨 iframe 并发”场景下，第二个拿到锁的上下文会被 forceRefresh 逼着再刷一次。
        const newToken = await ensureValidAccessToken();
        if (newToken) {
          (config.headers as any) = {
            ...(config.headers as any),
            Authorization: `Bearer ${newToken}`,
          };
        }
      } catch {
        // 不在这里强制跳转，交给 response 401 兜底
      }

      return config;
    });

    // response interceptor
    axios.interceptors.response.use(
      (res) => {
        // 统一后端返回：{ code, message, data }
        const payload = res?.data as any;
        if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
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

        const isAuthRequest = url.includes('/api/login') || url.includes('/api/register');
        const isRefreshRequest = url.includes('/api/refresh-token');

        if (status !== 401 || isAuthRequest || isRefreshRequest) {
          return Promise.reject(err);
        }

        const originalRequest: any = err?.config || {};
        if (originalRequest.__retried) {
          const from = locationRef.current;
          if (from.pathname !== '/login' && from.pathname !== '/register') {
            localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
          }
          logout();
          navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } });
          return Promise.reject(err);
        }

        originalRequest.__retried = true;

        return ensureValidAccessToken({ forceRefresh: true })
          .then((token) => {
            if (token) {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${token}`,
              };
            }
            return axios(originalRequest);
          })
          .catch((refreshErr) => {
            const from = locationRef.current;
            if (from.pathname !== '/login' && from.pathname !== '/register') {
              localStorage.setItem(REDIRECT_KEY, from.pathname + from.search);
            }
            logout();
            navigate('/login', { replace: true, state: { from, reason: '未登录或登录已失效' } });
            return Promise.reject(refreshErr);
          });
      }
    );

    return () => {
      // 拦截器保持整个应用生命周期
    };
  }, [ensureValidAccessToken, getCurrentAccessToken, logout, navigate]);

  const isAdmin = user?.role === 'park_reviewer' || user?.role === 'pota_representative';
  const isSysAdmin = user?.role === 'system_admin';
  const isPotaRepresentative = user?.role === 'pota_representative';

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
        isTokenReady: isTokenReadyRef.current,
      }}
    >
      <Box sx={{ display: 'flex' }}>
        {!isAuthPage && (
          <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        )}
        {!isAuthPage && (
          <SideBar
            isOpen={isSidebarOpen}
            isAdmin={isAdmin}
            isSysAdmin={isSysAdmin}
            isPotaRepresentative={isPotaRepresentative}
          />
        )}
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
