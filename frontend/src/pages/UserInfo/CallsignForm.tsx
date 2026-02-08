// src/pages/UserInfo/CallsignForm.tsx
import {
  Box,
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

interface CallsignFormProps {
  currentCallsign: string;
  callsign: string;
  callsignReason: string;
  oldPassword: string;
  showPassword: boolean;
  loading: boolean;
  errorMessage: string;
  onCallsignChange: (value: string) => void;
  onCallsignReasonChange: (value: string) => void;
  onOldPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
}

function CallsignForm({
  currentCallsign,
  callsign,
  callsignReason,
  oldPassword,
  showPassword,
  loading,
  errorMessage,
  onCallsignChange,
  onCallsignReasonChange,
  onOldPasswordChange,
  onTogglePassword,
}: CallsignFormProps) {
  const handleMouseDownPassword = () => {};

  return (
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
          onChange={(e) => onCallsignChange(e.target.value.toUpperCase())}
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
          onChange={(e) => onCallsignReasonChange(e.target.value)}
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
          onChange={(e) => onOldPasswordChange(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle callsign old password visibility"
                onClick={onTogglePassword}
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
  );
}

export default CallsignForm;