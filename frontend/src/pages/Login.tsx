// src/pages/Login.tsx
import { useState, useContext } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { setUser, setAccessToken, setRefreshToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation() as any;

  const redirectTo = (() => {
    const from = location?.state?.from;
    const pathname = from?.pathname;
    const search = from?.search || '';
    if (pathname && typeof pathname === 'string') return `${pathname}${search}`;
    return '/';
  })();

  const reason = location?.state?.reason as string | undefined;

  const handleSubmit = async () => {
    try {
      const res = await axios.post('/api/login', { identifier, password });
      setAccessToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setUser(res.data.user);
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.error || '登录失败');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      {reason && (
        <Typography sx={{ mb: 2 }} color="text.secondary">
          {reason}
        </Typography>
      )}
      <TextField fullWidth label="呼号或邮箱" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      <TextField
        fullWidth
        label="密码"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mt: 2 }}
      />
      <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>
        登录
      </Button>
    </Box>
  );
}

export default Login;
