// src/pages/Register/RegisterForm.tsx
import { Button } from '@mui/material';
import FormFields from './FormFields';

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
  const stripBlankChars = (v: string) => v.replace(/\s+/g, '');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') e.preventDefault();
  };

  const handleCallsignChange = (value: string) => {
    onCallsignChange(stripBlankChars(value));
  };

  const handlePasswordChange = (value: string) => {
    const next = stripBlankChars(value);
    onPasswordChange(next);
    if (next.length === 0) onTogglePassword();
  };

  const canSubmit = () => {
    return callsign.trim().length > 0 && 
           email.trim().length > 0 && 
           password.trim().length >= 8 && 
           verificationCode.length === 6 && 
           captchaCode.length > 0;
  };

  const canSendCode = () => {
    return !sendingCode && email && captchaCode && cooldown === 0;
  };

  const getSendCodeButtonText = () => {
    return sendingCode ? '发送中...' : `发送验证码${cooldown > 0 ? ` (${cooldown}s)` : ''}`;
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
        onCallsignChange={handleCallsignChange}
        onEmailChange={onEmailChange}
        onPasswordChange={handlePasswordChange}
        onTogglePassword={onTogglePassword}
        onVerificationCodeChange={onVerificationCodeChange}
        onCaptchaCodeChange={onCaptchaCodeChange}
        onClearCallsign={onClearCallsign}
      />
      <Button
        variant="outlined"
        fullWidth
        onClick={onSendCode}
        disabled={!canSendCode()}
        sx={{ mt: 2 }}
      >
        {getSendCodeButtonText()}
      </Button>
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={!canSubmit() || submitting}
        sx={{ mt: 2 }}
      >
        {submitting ? '注册中...' : '注册'}
      </Button>
    </>
  );
}

export default RegisterFormData;