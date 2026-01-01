// src/pages/Login.jsx
import React, { useState, useContext } from 'react';
import { TextField, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = () => {
    axios.post('/api/login', { identifier, password })
      .then(res => {
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        navigate('/');
      })
      .catch(err => alert('登录失败'));
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      <TextField fullWidth label="呼号或邮箱" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      <TextField fullWidth label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mt: 2 }} />
      <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>登录</Button>
    </Box>
  );
}

export default Login;