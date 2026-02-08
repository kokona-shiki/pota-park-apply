// src/pages/Register/RegisterForm.tsx
import { TextField, InputAdornment, IconButton, Button, Box, CircularProgress } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface RegisterFormData {
  callsign: string;
  email: string;
  password: string;
  showPassword: boolean;
  verificationCode: string;
  captchaCode: string;
  captchaSvg: string;
  sendingCode: boolean;
  submitting: boolean;
  cooldown: number;
  onCallsignChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onVerificationCodeChange: (value: string) => void;
  onCaptchaCodeChange: (value: string) => void;
  onSendCode: () => void;
  onSubmit: (e?: React.FormEvent) => void;
  onClearCallsign: () => void;
}

function RegisterFormData({
  callsign,
  email,
  password,
  showPassword,
  verificationCode,
  captchaCode,
  captchaSvg,
  sendingCode,
  submitting,
  cooldown,
  onCallsignChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onVerificationCodeChange,
  onCaptchaCodeChange,
  onSendCode,
  onSubmit,
  onClearCallsign,
}: RegisterFormData) {
  const canSubmit = callsign.trim().length > 0 && email.trim().length > 0 && password.trim().length >= 8 && verificationCode.length === 6 && captchaCode.length > 0;

  const stripBlankChars = (v: string) => v.replace(/\s+/g, '');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') e.preventDefault();
  };

  const handleCallsignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCallsignChange(stripBlankChars(e.target.value));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEmailChange(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = stripBlankChars(e.target.value);
    onPasswordChange(next);
    if (next.length === 0) onTogglePassword();
  };

  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVerificationCodeChange(e.target.value);
  };

  const handleCaptchaCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCaptchaCodeChange(e.target.value);
  };

  return (
    <>
      <TextField
        fullWidth
        label="呼号"
        value={callsign}
        onKeyDown={handleKeyDown}
        onChange={handleCallsignChange}
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
        onChange={handleEmailChange}
        autoComplete="email"
      />
      <TextField
        fullWidth
        label="密码"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onKeyDown={handleKeyDown}
        onChange={handlePasswordChange}
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
        onChange={handleVerificationCodeChange}
        autoComplete="one-time-code"
        disabled={sendingCode}
      />
      <Box sx={{ position: 'relative', mt: 2 }}>
        <TextField
          fullWidth
          label="图形验证码"
          value={captchaCode}
          onChange={handleCaptchaCodeChange}
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
      <Button
        variant="outlined"
        fullWidth
        onClick={onSendCode}
        disabled={sendingCode || !email || !captchaCode || cooldown > 0}
        sx={{ mt: 2 }}
      >
        {sendingCode ? '发送中...' : `发送验证码${cooldown > 0 ? ` (${cooldown}s)` : ''}`}
      </Button>
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={!canSubmit || submitting}
        sx={{ mt: 2 }}
      >
        {submitting ? '注册中...' : '注册'}
      </Button>
    </>
  );
}

export default RegisterFormData;