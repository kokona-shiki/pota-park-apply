// src/pages/UserInfo.tsx
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';
import { getRoleDisplayName } from '../utils/roleDisplay';

function UserInfo() {
  const { user, refreshSession } = useAuth();
  
  // 状态管理 - 必须在条件渲染之前声明
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // 如果用户未登录，不显示任何内容
  if (!user) return null;
  
  // 初始化邮箱状态
  if (email === '' && user.email) {
    setEmail(user.email);
  }
  
  // 如果用户被禁用（banned），不显示内容
  if (user.role === 'banned') {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error">您的账户已被禁用，无法修改个人信息。</Alert>
      </Box>
    );
  }

  // 处理邮箱更新
  const handleEmailUpdate = async () => {
    if (!email || email === user.email) {
      setErrorMessage('邮箱未改变或无效');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'email',
          value: email,
          reason: '用户自行修改邮箱'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.bizMessage || '更新邮箱失败');
      }
      
      // 更新成功后刷新用户信息
      await refreshSession();
      setSuccessMessage('邮箱更新成功');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, '更新邮箱失败'));
    } finally {
      setLoading(false);
    }
  };

  // 处理密码更新
  const handlePasswordUpdate = async () => {
    if (!newPassword) {
      setErrorMessage('请输入新密码');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('密码长度至少为6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      // 调用修改密码的API，后端需要特别处理密码哈希
      const response = await fetch(`/api/users/${user.id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPassword,
          reason: '用户自行修改密码'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.bizMessage || '更新密码失败');
      }
      
      // 更新成功后刷新用户信息
      await refreshSession();
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('密码更新成功');
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, '更新密码失败'));
    } finally {
      setLoading(false);
    }
  };

  // 刷新用户信息
  const handleRefreshRole = async () => {
    try {
      setLoading(true);
      await refreshSession();
      setSuccessMessage('用户信息已刷新');
    } catch (e: unknown) {
      setErrorMessage(getApiErrorMessage(e, '刷新失败'));
    } finally {
      setLoading(false);
    }
  };

  // 切换密码可见性
  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);
  const handleMouseDownPassword = () => {};

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card>
        <CardHeader title="用户信息" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              <TextField
                fullWidth
                label="用户ID"
                value={user.id || ''}
                disabled
              />
              <TextField
                fullWidth
                label="呼号"
                value={user.callsign || ''}
                disabled
                helperText="呼号不可更改"
              />
              <TextField
                fullWidth
                label="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <TextField
                fullWidth
                label="角色"
                value={getRoleDisplayName(user.role || '')}
                disabled
              />
              <FormControl fullWidth variant="outlined" disabled={loading}>
                <InputLabel htmlFor="new-password">新密码</InputLabel>
                <OutlinedInput
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="新密码"
                />
              </FormControl>
              <FormControl fullWidth variant="outlined" disabled={loading}>
                <InputLabel htmlFor="confirm-password">确认密码</InputLabel>
                <OutlinedInput
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleClickShowConfirmPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="确认密码"
                />
              </FormControl>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              状态: {user.is_active ? '启用' : '禁用'}
            </Typography>
            
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
            )}
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleEmailUpdate}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                更新邮箱
              </Button>
              <Button
                variant="contained"
                onClick={handlePasswordUpdate}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                更新密码
              </Button>
              <Button
                variant="outlined"
                onClick={handleRefreshRole}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                刷新用户信息
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default UserInfo;
