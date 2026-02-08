// src/pages/UserInfo/CallsignUpdateDialog.tsx
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
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { CallsignChangeRequestCreateSchema, CallsignChangeRequestDataSchema } from '../../../shared/schemas/callsign';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import { validateCallsignInput, validateCallsignReason } from './validateCallsign';

interface CallsignUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  currentCallsign: string;
  onSuccess: () => void;
}

function CallsignUpdateDialog({ open, onClose, currentCallsign, onSuccess }: CallsignUpdateDialogProps) {
  const [callsign, setCallsign] = useState('');
  const [callsignReason, setCallsignReason] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCallsignUpdate = async () => {
    const passwordValidation = validateCallsignInput(oldPassword, undefined);
    if (!passwordValidation.isValid) {
      setErrorMessage(passwordValidation.errorMessage);
      return;
    }

    const callsignValidation = validateCallsignInput(callsign, currentCallsign);
    if (!callsignValidation.isValid) {
      setErrorMessage(callsignValidation.errorMessage);
      return;
    }

    const reasonValidation = validateCallsignReason(callsignReason);
    if (!reasonValidation.isValid) {
      setErrorMessage(reasonValidation.errorMessage);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const requestBody = CallsignChangeRequestCreateSchema.parse({
        newCallsign: callsign,
        reason: callsignReason,
      });
      await requestWithSchema(
        apiClient.post('/api/callsign-change-requests', requestBody),
        CallsignChangeRequestDataSchema
      );

      onSuccess();
      setCallsign('');
      setCallsignReason('');
      setOldPassword('');
      onClose();
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, '呼号变更申请提交失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCallsign('');
    setCallsignReason('');
    setOldPassword('');
    setErrorMessage('');
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = () => {};

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>修改呼号</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
            当前呼号: {currentCallsign || ''}
          </Typography>
          <FormControl fullWidth variant="outlined" disabled={loading} sx={{ mb: 2 }}>
            <InputLabel htmlFor="callsign-new-callsign">新呼号</InputLabel>
            <OutlinedInput
              id="callsign-new-callsign"
              label="新呼号"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value.toUpperCase())}
              error={
                callsign !== '' &&
                callsign.toUpperCase() !== currentCallsign?.toUpperCase() &&
                !/^[A-Z0-9]{3,}$/.test(callsign.toUpperCase())
              }
            />
            {callsign !== '' &&
              callsign.toUpperCase() !== currentCallsign?.toUpperCase() &&
              !/^[A-Z0-9]{3,}$/.test(callsign.toUpperCase()) && (
                <FormHelperText error>呼号格式不正确，应为字母和数字组合，至少3位</FormHelperText>
              )}
          </FormControl>
          <FormControl fullWidth variant="outlined" disabled={loading} sx={{ mb: 2 }}>
            <InputLabel htmlFor="callsign-reason">变更原因</InputLabel>
            <OutlinedInput
              id="callsign-reason"
              label="变更原因"
              value={callsignReason}
              onChange={(e) => setCallsignReason(e.target.value)}
              multiline
              rows={3}
            />
          </FormControl>
          <FormControl fullWidth variant="outlined" disabled={loading}>
            <InputLabel htmlFor="callsign-old-password">原密码</InputLabel>
            <OutlinedInput
              id="callsign-old-password"
              type={showPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle callsign old password visibility"
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
          <Alert severity="info" sx={{ mt: 2 }}>
            注意：呼号变更需要经过系统管理员审核后才能生效。
          </Alert>
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
        <Button onClick={handleCallsignUpdate} disabled={loading} variant="contained">
          提交申请
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CallsignUpdateDialog;