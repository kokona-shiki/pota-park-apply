// src/pages/UserInfo.jsx
import React, { useState, useContext } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { AuthContext } from '../App';
import axios from 'axios';

function UserInfo() {
  const { user, setUser } = useContext(AuthContext);
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');

  const handleUpdate = () => {
    axios.patch('/api/user', { username, password })
      .then(res => setUser(res.data))
      .catch(err => console.error(err));
  };

  return (
    <Box>
      <Typography>用户组: {user.user_group}</Typography>
      <Typography>呼号: {user.callsign}</Typography>
      <Typography>名称: {user.username}</Typography>
      <Typography>注册时间: {user.registration_time}</Typography>
      <Typography>邮箱: {user.email}</Typography>
      <TextField label="新用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
      <TextField label="新密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button onClick={handleUpdate}>更新</Button>
    </Box>
  );
}

export default UserInfo;