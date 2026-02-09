// src/pages/Register.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Avatar,
  Container,
  Divider,
  Typography,
  Paper,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { RegisterRequestSchema, UserInfoDataSchema } from '../../../shared/schemas/auth';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { getApiErrorMessage } from '../utils/error';
import RegisterFormData from './Register/RegisterForm';

function Register() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const hasFetchedCaptcha = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchCaptcha = async () => {
    try {
      const response = await fetch('/api/captcha');
      const svg = await response.text();
      setCaptchaSvg(svg);
      setSuccess(null);
      setError(null);
    } catch (err) {
      console.error('获取验证码失败:', err);
    }
  };

  useEffect(() => {
    if (!hasFetchedCaptcha.current) {
      hasFetchedCaptcha.current = true;
      fetchCaptcha();
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSuccess(null);

    if (!callsign) {
      setError('请输入呼号');
      return;
    }

    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    if (!password) {
      setError('请输入密码');
      return;
    }

    if (password.length < 8) {
      setError('密码至少需要 8 位');
      return;
    }

    if (!verificationCode) {
      setError('请输入邮箱验证码');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('邮箱验证码必须是 6 位数字');
      return;
    }

    if (!captchaCode) {
      setError('请输入图形验证码');
      return;
    }

    setSubmitting(true);

    const requestBody = RegisterRequestSchema.parse({ callsign, email, password, verificationCode });

    requestWithSchema(apiClient.post('/api/register', requestBody), UserInfoDataSchema)
      .then(() => {
        navigate('/login', { replace: true, state: { from: location?.state?.from, reason: '注册成功，请使用新账号登录' } });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, '注册失败'));
        fetchCaptcha();
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handleSendVerificationCode = async () => {
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('请先输入邮箱地址');
      return;
    }

    if (!captchaCode) {
      setError('请输入图形验证码');
      return;
    }

    setSuccess(null);
    setError(null);
    setSendingCode(true);

    try {
      await apiClient.post('/api/send-verification-email', {
        email,
        captchaId: document.querySelector('input[name="captchaId"]')?.getAttribute('value') || '',
        captchaCode,
      });
      setSuccess('验证码已发送，请查收邮件');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(getApiErrorMessage(err, '发送验证码失败'));
      fetchCaptcha();
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 6
      }}
    >
      <Paper elevation={3} sx={{ width: '100%', p: 4, borderRadius: 3 }}>
        <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>P</Avatar>
        <Typography variant="h5" align="center" sx={{ fontWeight: 700 }}>
          注册
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
          创建您的 POTA 公园申请系统账号
        </Typography>

        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <RegisterFormData
            callsign={callsign}
            email={email}
            password={password}
            showPassword={showPassword}
            verificationCode={verificationCode}
            captchaCode={captchaCode}
            captchaSvg={captchaSvg}
            sendingCode={sendingCode}
            submitting={submitting}
            cooldown={cooldown}
            onCallsignChange={setCallsign}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onTogglePassword={() => setShowPassword((v) => !v)}
            onVerificationCodeChange={setVerificationCode}
            onCaptchaCodeChange={setCaptchaCode}
            onSendCode={handleSendVerificationCode}
            onClearCallsign={() => setCallsign('')}
          />
        </form>
      </Paper>
    </Container>
  );
}

export default Register;