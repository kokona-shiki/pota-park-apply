// src/pages/Register/FormFields.tsx
import { TextField, InputAdornment, IconButton, Box } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface FormFieldsProps {
  callsign: string;
  email: string;
  password: string;
  showPassword: boolean;
  verificationCode: string;
  captchaCode: string;
  captchaSvg: string;
  sendingCode: boolean;
  submitting: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCallsignChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onVerificationCodeChange: (value: string) => void;
  onCaptchaCodeChange: (value: string) => void;
  onClearCallsign: () => void;
}

function FormFields({
  callsign,
  email,
  password,
  showPassword,
  verificationCode,
  captchaCode,
  captchaSvg,
  sendingCode,
  submitting,
  onKeyDown,
  onCallsignChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onVerificationCodeChange,
  onCaptchaCodeChange,
  onClearCallsign,
}: FormFieldsProps) {
  return (
    <>
      <TextField
        fullWidth
        label="呼号"
        value={callsign}
        onKeyDown={onKeyDown}
        onChange={(e) => onCallsignChange(e.target.value)}
        autoComplete="username"
        InputProps={
          callsign.length > 0
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="清空"
                      onClick={onClearCallsign}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            : undefined
        }
      />
      <TextField
        fullWidth
        label="邮箱地址"
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        autoComplete="email"
      />
      <TextField
        fullWidth
        label="密码"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onKeyDown={onKeyDown}
        onChange={(e) => onPasswordChange(e.target.value)}
        sx={{ mt: 2 }}
        autoComplete="new-password"
        InputProps={
          password.length > 0
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      onClick={onTogglePassword}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            : undefined
        }
      />
      <TextField
        fullWidth
        label="邮箱验证码"
        value={verificationCode}
        onChange={(e) => onVerificationCodeChange(e.target.value)}
        autoComplete="one-time-code"
        disabled={sendingCode}
      />
      <Box sx={{ position: 'relative', mt: 2 }}>
        <TextField
          fullWidth
          label="图形验证码"
          value={captchaCode}
          onChange={(e) => onCaptchaCodeChange(e.target.value)}
          disabled={sendingCode || submitting}
        />
        {captchaSvg && (
          <Box
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              width: 100,
              height: 50,
            }}
          />
        )}
      </Box>
    </>
  );
}

export default FormFields;