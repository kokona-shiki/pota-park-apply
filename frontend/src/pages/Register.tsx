// src/pages/Register.tsx
import { useState } from 'react';
import { Alert, Avatar, Button, Container, Divider, Link, Paper, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation() as any;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSubmitting(true);

    axios
      .post('/api/register', { callsign, email, password })
      .then(() => {
        navigate('/login', { replace: true, state: { from: location?.state?.from, reason: '注册成功，请使用新账号登录' } });
      })
      .catch((err) => {
        setError(err?.response?.data?.error || '注册失败');
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
          注册账号
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
          注册后需登录后才能提交公园申请
        </Typography>

        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="呼号"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            helperText="建议使用大写字母 + 数字，例如：BH1ABC"
            autoComplete="nickname"
          />
          <TextField
            fullWidth
            label="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 2 }}
            autoComplete="email"
          />
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 2 }}
            helperText="至少 8 位，建议包含大小写字母、数字与符号"
            autoComplete="new-password"
          />

          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }} disabled={submitting}>
            {submitting ? '注册中...' : '注册'}
          </Button>
        </form>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          已有账号？
          <Link component={RouterLink} to="/login" underline="hover" sx={{ ml: 1 }}>
            去登录
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Register;
