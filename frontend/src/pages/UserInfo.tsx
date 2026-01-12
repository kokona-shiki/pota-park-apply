// src/pages/UserInfo.tsx
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormHelperText,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';
import { getRoleDisplayName } from '../utils/roleDisplay';

function UserInfo() {
  const { user, refreshSession } = useAuth();

  // 状态管理 - 必须在条件渲染之前声明
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailOldPassword, setEmailOldPassword] = useState('');
  const [showEmailOldPassword, setShowEmailOldPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);

  // 如果用户未登录，不显示任何内容
  if (!user) return null;

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
    if (!emailOldPassword) {
      setErrorMessage('请输入原密码');
      return;
    }

    if (!email) {
      setErrorMessage('邮箱不能为空');
      return;
    }

    if (email === user.email) {
      setErrorMessage('新邮箱不能与当前邮箱相同');
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
      const response = await axios.put(`/api/users/${user.id}`, {
        field: 'email',
        value: email,
        reason: '用户自行修改邮箱',
        oldPassword: emailOldPassword,
      });

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data.bizMessage || '更新邮箱失败');
      }

      // 更新成功后刷新用户信息
      await refreshSession();
      setEmailOldPassword('');
      setSuccessMessage('邮箱更新成功');
      handleCloseEmailDialog(); // 关闭对话框
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, '更新邮箱失败'));
    } finally {
      setLoading(false);
    }
  };

  // 处理密码更新
  const handlePasswordUpdate = async () => {
    if (!oldPassword) {
      setErrorMessage('请输入原密码');
      return;
    }

    if (!newPassword) {
      setErrorMessage('请输入新密码');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('密码长度至少为6位');
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage('新密码不能与原密码相同');
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
      const response = await axios.put(`/api/users/${user.id}/change-password`, {
        oldPassword: oldPassword,
        newPassword: newPassword,
        reason: '用户自行修改密码',
      });

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data.bizMessage || '更新密码失败');
      }

      // 更新成功后刷新用户信息
      await refreshSession();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('密码更新成功');
      handleClosePasswordDialog(); // 关闭对话框
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

  // 切换原密码可见性
  const handleClickShowOldPassword = () => setShowOldPassword(!showOldPassword);

  // 切换邮箱原密码可见性
  const handleClickShowEmailOldPassword = () => setShowEmailOldPassword(!showEmailOldPassword);

  // 打开/关闭邮箱对话框
  const handleOpenEmailDialog = () => {
    setOpenEmailDialog(true);
    setEmail(''); // 初始化对话框中的邮箱值为空
  };

  const handleCloseEmailDialog = () => {
    setOpenEmailDialog(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 打开/关闭密码对话框
  const handleOpenPasswordDialog = () => {
    setOpenPasswordDialog(true);
  };

  const handleClosePasswordDialog = () => {
    setOpenPasswordDialog(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card>
        <CardHeader title="用户信息" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <List>
              <ListItem>
                <ListItemText
                  primary="用户ID"
                  secondary={user.id?.toString() || ''}
                  sx={{ flex: 1 }}
                />
                <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                <ListItemText
                  primary="呼号"
                  secondary={`${user.callsign || ''} (呼号不可更改)`}
                  sx={{ flex: 1 }}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="邮箱" secondary={user.email || ''} sx={{ flex: 1 }} />
                <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                <ListItemText
                  primary="角色"
                  secondary={getRoleDisplayName(user.role || '')}
                  sx={{ flex: 1 }}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="状态" secondary={user.is_active ? '启用' : '禁用'} />
              </ListItem>
            </List>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleOpenEmailDialog}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                修改邮箱
              </Button>
              <Button
                variant="contained"
                onClick={handleOpenPasswordDialog}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                修改密码
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

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 修改邮箱对话框 */}
      <Dialog open={openEmailDialog} onClose={handleCloseEmailDialog} maxWidth="sm" fullWidth>
        <DialogTitle>修改邮箱</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
              当前邮箱: {user.email || ''}
            </Typography>
            <FormControl fullWidth variant="outlined" disabled={loading} sx={{ mb: 2 }}>
              <InputLabel htmlFor="email-new-email">新邮箱</InputLabel>
              <OutlinedInput
                id="email-new-email"
                label="新邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={
                  email !== '' && email !== user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                }
              />
              {email !== '' &&
                email !== user.email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                  <FormHelperText error>请输入有效的邮箱地址</FormHelperText>
                )}
            </FormControl>
            <FormControl fullWidth variant="outlined" disabled={loading}>
              <InputLabel htmlFor="email-old-password">原密码</InputLabel>
              <OutlinedInput
                id="email-old-password"
                type={showEmailOldPassword ? 'text' : 'password'}
                value={emailOldPassword}
                onChange={(e) => setEmailOldPassword(e.target.value)}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle email old password visibility"
                      onClick={handleClickShowEmailOldPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showEmailOldPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="原密码"
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleEmailUpdate} disabled={loading} variant="contained">
            确认修改
          </Button>
        </DialogActions>
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>修改密码</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth variant="outlined" disabled={loading} sx={{ mb: 2 }}>
              <InputLabel htmlFor="dialog-old-password">原密码</InputLabel>
              <OutlinedInput
                id="dialog-old-password"
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle old password visibility"
                      onClick={handleClickShowOldPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showOldPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="原密码"
              />
            </FormControl>
            <FormControl fullWidth variant="outlined" disabled={loading} sx={{ mb: 2 }}>
              <InputLabel htmlFor="dialog-new-password">新密码</InputLabel>
              <OutlinedInput
                id="dialog-new-password"
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
              <InputLabel htmlFor="dialog-confirm-password">确认密码</InputLabel>
              <OutlinedInput
                id="dialog-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleClickShowConfirmPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="确认密码"
              />
            </FormControl>
            {errorMessage && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errorMessage}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} disabled={loading}>
            取消
          </Button>
          <Button onClick={handlePasswordUpdate} disabled={loading} variant="contained">
            确认修改
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserInfo;
