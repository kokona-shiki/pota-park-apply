// src/pages/Register.jsx
import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const [username, setUsername] = useState('');
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    axios.post('/api/register', { username, callsign, email, password })
      .then(() => navigate('/login'))
      .catch(err => alert('注册失败'));
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      <TextField fullWidth label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
      <TextField fullWidth label="呼号" value={callsign} onChange={(e) => setCallsign(e.target.value)} sx={{ mt: 2 }} />
      <TextField fullWidth label="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mt: 2 }} />
      <TextField fullWidth label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mt: 2 }} />
      <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>注册</Button>
    </Box>
  );
}

export default Register;