// src/pages/UserInfo/PasswordUpdateDialog.tsx
import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { UserUpdateDataSchema } from '../../../../shared/schemas/user';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { getApiErrorMessage } from '../../utils/error';

interface PasswordUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  onSuccess: () => void;
}

function PasswordUpdateDialog({ open, onClose, userId, onSuccess }: PasswordUpdateDialogProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

    try {
      await requestWithSchema(
        apiClient.put(`/api/users/${userId}/change-password`, {
          oldPassword: oldPassword,
          newPassword: newPassword,
          reason: '用户自行修改密码',
        }),
        UserUpdateDataSchema
      );

      onSuccess();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, '更新密码失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage('');
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);
  const handleClickShowOldPassword = () => setShowOldPassword(!showOldPassword);
  const handleMouseDownPassword = () => {};

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button onClick={handlePasswordUpdate} disabled={loading} variant="contained">
          确认修改
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PasswordUpdateDialog;