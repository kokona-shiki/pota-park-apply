// src/pages/UserInfo/EmailUpdateDialog.tsx
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
  Typography,
  FormHelperText,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { UserUpdateDataSchema } from '../../../shared/schemas/user';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { getApiErrorMessage } from '../../utils/error';

interface EmailUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  currentEmail: string;
  onSuccess: () => void;
}

function EmailUpdateDialog({ open, onClose, userId, currentEmail, onSuccess }: EmailUpdateDialogProps) {
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailUpdate = async () => {
    if (!oldPassword) {
      return;
    }

    if (!email) {
      return;
    }

    if (email === currentEmail) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }

    setLoading(true);

    try {
      await requestWithSchema(
        apiClient.put(`/api/users/${userId}`, {
          field: 'email',
          value: email,
          reason: '用户自行修改邮箱',
          oldPassword: oldPassword,
        }),
        UserUpdateDataSchema
      );

      onSuccess();
      setOldPassword('');
      setEmail('');
      onClose();
    } catch (error: unknown) {
      console.error(getApiErrorMessage(error, '更新邮箱失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setEmail('');
    setOldPassword('');
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = () => {};

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>修改邮箱</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
            当前邮箱: {currentEmail || ''}
          </Typography>
          <FormControl fullWidth variant="outlined" disabled={loading} sx={{ mb: 2 }}>
            <InputLabel htmlFor="email-new-email">新邮箱</InputLabel>
            <OutlinedInput
              id="email-new-email"
              label="新邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={
                email !== '' &&
                email !== currentEmail &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
              }
            />
            {email !== '' &&
              email !== currentEmail &&
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <FormHelperText error>请输入有效的邮箱地址</FormHelperText>
              )}
          </FormControl>
          <FormControl fullWidth variant="outlined" disabled={loading}>
            <InputLabel htmlFor="email-old-password">原密码</InputLabel>
            <OutlinedInput
              id="email-old-password"
              type={showPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle email old password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="原密码"
            />
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button onClick={handleEmailUpdate} disabled={loading} variant="contained">
          确认修改
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EmailUpdateDialog;