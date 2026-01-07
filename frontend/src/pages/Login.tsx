// src/pages/Login.tsx
import { useMemo, useState, useContext } from 'react';
import { Alert, Avatar, Button, Container, Divider, Link, Paper, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUser, setAccessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation() as any;

  const redirectTo = useMemo(() => {
    const from = location?.state?.from;
    const pathname = from?.pathname;
    const search = from?.search || '';
    if (pathname && typeof pathname === 'string') return `${pathname}${search}`;
    return '/';
  }, [location?.state?.from]);

  const reason = location?.state?.reason as string | undefined;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSubmitting(true);

    axios
      .post('/api/login', { identifier, password })
      .then((res) => {
        // refreshToken 由后端通过 HttpOnly Cookie 下发（前端 JS 不可读）
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        navigate(redirectTo, { replace: true });
      })
      .catch((err) => {
        setError(err?.response?.data?.error || '登录失败');
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

        {reason && (
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
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 2 }}
            autoComplete="current-password"
          />

          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }} disabled={submitting}>
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
