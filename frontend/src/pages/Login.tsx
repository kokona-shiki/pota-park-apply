// src/pages/Login.tsx
import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Container,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthPayloadSchema, LoginRequestSchema } from '../../../shared/schemas/auth';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { REDIRECT_KEY } from '../auth/constants';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';
import LoginFormData from './Login/LoginForm';

function Login() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedReason, setDismissedReason] = useState(false);

  const { setUser, setAccessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const savedRedirect = localStorage.getItem(REDIRECT_KEY);
    if (savedRedirect) {
      return savedRedirect;
    }
    const from = location?.state?.from;
    const pathname = from?.pathname;
    const search = from?.search || '';
    if (pathname && typeof pathname === 'string') return `${pathname}${search}`;
    return '/';
  }, [location?.state?.from]);

  const reason = location?.state?.reason as string | undefined;
  const shouldShowReason = Boolean(reason) && !error && !dismissedReason;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!identifier.trim() || !password.trim()) return;

    setDismissedReason(true);
    setError(null);
    setSubmitting(true);

    const requestBody = LoginRequestSchema.parse({ identifier, password });

    requestWithSchema(apiClient.post('/api/login', requestBody), AuthPayloadSchema)
      .then((payload) => {
        setAccessToken(payload.accessToken);
        setUser(payload.user);
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

        <LoginFormData
          identifier={identifier}
          password={password}
          showPassword={showPassword}
          submitting={submitting}
          onIdentifierChange={(value) => setIdentifier(value)}
          onPasswordChange={(value) => setPassword(value)}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onClearIdentifier={() => {
            setDismissedReason(true);
            setIdentifier('');
          }}
          onSubmit={handleSubmit}
        />
      </Paper>
    </Container>
  );
}

export default Login;