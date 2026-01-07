// src/pages/Register.tsx
import { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      await axios.post('/api/register', { callsign, email, password });
      alert('注册成功，请登录');
      navigate('/login');
    } catch (e: any) {
      alert(e?.response?.data?.error || '注册失败');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      <TextField fullWidth label="呼号" value={callsign} onChange={(e) => setCallsign(e.target.value)} />
      <TextField fullWidth label="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mt: 2 }} />
      <TextField
        fullWidth
        label="密码"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mt: 2 }}
      />
      <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>
        注册
      </Button>
    </Box>
  );
}

export default Register;
