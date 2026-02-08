// src/pages/Register/RegisterForm.tsx
import { Button } from '@mui/material';

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
  onClearCallsign,
}: RegisterFormData) {
  const canSubmit = callsign.trim().length > 0 && email.trim().length > 0 && password.trim().length >= 8 && verificationCode.length === 6 && captchaCode.length > 0;

  const stripBlankChars = (v: string) => v.replace(/\s+/g, '');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') e.preventDefault();
  };

  return (
    <>
      <FormFields
        callsign={callsign}
        email={email}
        password={password}
        showPassword={showPassword}
        verificationCode={verificationCode}
        captchaCode={captchaCode}
        captchaSvg={captchaSvg}
        sendingCode={sendingCode}
        submitting={submitting}
        onKeyDown={handleKeyDown}
        onCallsignChange={(value) => onCallsignChange(stripBlankChars(value))}
        onEmailChange={onEmailChange}
        onPasswordChange={(value) => {
          const next = stripBlankChars(value);
          onPasswordChange(next);
          if (next.length === 0) onTogglePassword();
        }}
        onTogglePassword={onTogglePassword}
        onVerificationCodeChange={onVerificationCodeChange}
        onCaptchaCodeChange={onCaptchaCodeChange}
        onClearCallsign={onClearCallsign}
      />
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