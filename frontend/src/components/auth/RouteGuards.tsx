import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

interface RequireAuthProps {
  children: React.ReactNode;
}

interface RequirePermissionProps {
  children: React.ReactNode;
  requiredPermissions: string[];
}

interface RequireNotSysAdminProps {
  children: React.ReactNode;
}

interface RequirePotaPermissionProps {
  children: React.ReactNode;
}

interface RequireSysAdminProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isAuthLoading, isTokenReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !isTokenReady && !user) {
      // 保存当前路径，登录后重定向
      localStorage.setItem('pota_redirect_after_login', location.pathname);
      navigate('/login');
    }
  }, [user, isAuthLoading, isTokenReady, navigate, location.pathname]);

  if (isAuthLoading || (!isTokenReady && !user)) {
    return null; // 或者返回加载指示器
  }

  return <>{children}</>;
}

export function RequirePermission({ children, requiredPermissions }: RequirePermissionProps) {
  const { user, isAuthLoading, isTokenReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !isTokenReady && !user) {
      // 保存当前路径，登录后重定向
      localStorage.setItem('pota_redirect_after_login', location.pathname);
      navigate('/login');
      return;
    }

    if (user && !user.permissions?.some(permission => requiredPermissions.includes(permission))) {
      // 没有权限，重定向到首页
      navigate('/');
    }
  }, [user, isAuthLoading, isTokenReady, requiredPermissions, navigate, location.pathname]);

  if (isAuthLoading || (!isTokenReady && !user)) {
    return null; // 或者返回加载指示器
  }

  if (!user?.permissions?.some(permission => requiredPermissions.includes(permission))) {
    return null; // 或者返回权限不足提示
  }

  return <>{children}</>;
}

export function RequireNotSysAdmin({ children }: RequireNotSysAdminProps) {
  const { user, isAuthLoading, isTokenReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !isTokenReady && !user) {
      // 保存当前路径，登录后重定向
      localStorage.setItem('pota_redirect_after_login', location.pathname);
      navigate('/login');
      return;
    }

    if (user && user.permissions?.includes('view_all_users')) {
      // 系统管理员，重定向到管理员面板
      navigate('/admin-panel');
    }
  }, [user, isAuthLoading, isTokenReady, navigate, location.pathname]);

  if (isAuthLoading || (!isTokenReady && !user)) {
    return null; // 或者返回加载指示器
  }

  if (user?.permissions?.includes('view_all_users')) {
    return null; // 或者返回权限不足提示
  }

  return <>{children}</>;
}

export function RequirePotaPermission({ children }: RequirePotaPermissionProps) {
  const { user, isAuthLoading, isTokenReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !isTokenReady && !user) {
      // 保存当前路径，登录后重定向
      localStorage.setItem('pota_redirect_after_login', location.pathname);
      navigate('/login');
      return;
    }

    if (user && !user.permissions?.includes('pota_import')) {
      // 没有 POTA 权限，重定向到首页
      navigate('/');
    }
  }, [user, isAuthLoading, isTokenReady, navigate, location.pathname]);

  if (isAuthLoading || (!isTokenReady && !user)) {
    return null; // 或者返回加载指示器
  }

  if (!user?.permissions?.includes('pota_import')) {
    return null; // 或者返回权限不足提示
  }

  return <>{children}</>;
}

export function RequireSysAdmin({ children }: RequireSysAdminProps) {
  const { user, isAuthLoading, isTokenReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !isTokenReady && !user) {
      // 保存当前路径，登录后重定向
      localStorage.setItem('pota_redirect_after_login', location.pathname);
      navigate('/login');
      return;
    }

    if (user && !user.permissions?.includes('view_all_users')) {
      // 不是系统管理员，重定向到首页
      navigate('/');
    }
  }, [user, isAuthLoading, isTokenReady, navigate, location.pathname]);

  if (isAuthLoading || (!isTokenReady && !user)) {
    return null; // 或者返回加载指示器
  }

  if (!user?.permissions?.includes('view_all_users')) {
    return null; // 或者返回权限不足提示
  }

  return <>{children}</>;
}
