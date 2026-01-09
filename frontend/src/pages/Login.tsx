// src/pages/Login.tsx
import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { REDIRECT_KEY } from '../auth/context';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';

const AUTH_DATA_KEY = 'pota_auth_data'; // 与 App.tsx 保持一致

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedReason, setDismissedReason] = useState(false);

  const { setUser, setAccessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const redirectTo = useMemo(() => {
    // 优先从 localStorage 读取保存的重定向路径
    const savedRedirect = localStorage.getItem(REDIRECT_KEY);
    if (savedRedirect) {
      return savedRedirect;
    }

    // 其次从 location.state 读取
    const from = location?.state?.from;
    const pathname = from?.pathname;
    const search = from?.search || '';
    if (pathname && typeof pathname === 'string') return `${pathname}${search}`;

    // 默认返回首页
    return '/';
  }, [location?.state?.from]);

  const reason = location?.state?.reason as string | undefined;
  const shouldShowReason = Boolean(reason) && !error && !dismissedReason;

  // 禁止空格/TAB/换行等“无内容字符”（统一剔除所有 \s）
  const stripBlankChars = (v: string) => v.replace(/\s+/g, '');

  const canSubmit = identifier.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    // 避免空提交（包括用户按 Enter 触发 submit）
    if (!canSubmit || submitting) return;

    setDismissedReason(true);
    setError(null);
    setSubmitting(true);

    axios
      .post('/api/login', { identifier, password })
      .then((res) => {
        // refreshToken 由后端通过 HttpOnly Cookie 下发（前端 JS 不可读）
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);

        // 保存到 localStorage (包含过期时间信息)
        const authData = {
          accessToken: res.data.accessToken,
          user: res.data.user
        };
        localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData));

        // 清除保存的重定向路径
        localStorage.removeItem(REDIRECT_KEY);

        navigate(redirectTo, { replace: true });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, '登录失败'));
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 6
      }}
    >
      <Paper elevation={3} sx={{ width: '100%', p: 4, borderRadius: 3 }}>
        <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>P</Avatar>
        <Typography variant="h5" align="center" sx={{ fontWeight: 700 }}>
          登录
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
          使用呼号或邮箱登录 POTA 公园申请系统
        </Typography>

        <Divider sx={{ my: 3 }} />

        {shouldShowReason && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {reason}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="呼号或邮箱"
            value={identifier}
            onKeyDown={(e) => {
              // 空格（Tab 在单行输入框里不会插入字符，但空格会）
              if (e.key === ' ') e.preventDefault();
            }}
            onChange={(e) => {
              setDismissedReason(true);
              setIdentifier(stripBlankChars(e.target.value));
            }}
            autoComplete="username"
            InputProps={
              identifier.length > 0
                ? {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="清空"
                          onClick={() => {
                            setDismissedReason(true);
                            setIdentifier('');
                          }}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                : undefined
            }
          />
          <TextField
            fullWidth
            label="密码"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onKeyDown={(e) => {
              if (e.key === ' ') e.preventDefault();
            }}
            onChange={(e) => {
              setDismissedReason(true);
              const next = stripBlankChars(e.target.value);
              setPassword(next);
              if (next.length === 0) setShowPassword(false);
            }}
            sx={{ mt: 2 }}
            autoComplete="current-password"
            InputProps={
              password.length > 0
                ? {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? '隐藏密码' : '显示密码'}
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                        <IconButton
                          aria-label="清空密码"
                          onClick={() => {
                            setDismissedReason(true);
                            setPassword('');
                            setShowPassword(false);
                          }}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                : undefined
            }
          />

          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }} disabled={!canSubmit || submitting}>
            {submitting ? '登录中...' : '登录'}
          </Button>
        </form>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          还没有账号？
          <Link
            component={RouterLink}
            to="/register"
            state={{ from: location?.state?.from }}
            underline="hover"
            sx={{ ml: 1 }}
          >
            去注册
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Login;
