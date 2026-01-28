// src/pages/Register.tsx
import { useState, useEffect } from 'react';
import { Alert, Avatar, Button, Container, Divider, Link, Paper, TextField, Typography, Box, CircularProgress } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { RegisterRequestSchema, UserInfoDataSchema } from '../../../shared/schemas/auth';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { getApiErrorMessage } from '../utils/error';

function Register() {
  const [callsign, setCallsign] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchCaptcha = async () => {
    try {
      const response = await fetch('/api/captcha');
      const svg = await response.text();
      setCaptchaSvg(svg);
      setCaptchaCode('');
      const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      setCaptchaId(newId);
    } catch (err) {
      console.error('获取验证码失败:', err);
    }
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

    setSendingCode(true);

    try {
      const response = await apiClient.post('/api/send-verification-email', {
        email,
        captchaId,
        captchaCode,
      });

      if (response.data.code === 'SUCCESS') {
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
      } else {
        setError(response.data.message || '发送验证码失败');
        fetchCaptcha();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, '发送验证码失败'));
      fetchCaptcha();
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSuccess(null);
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

  useEffect(() => {
    fetchCaptcha();
  }, []);

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
          注册账号
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
          注册后需登录后才能提交公园申请
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
          <TextField
            fullWidth
            label="呼号"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            helperText="建议使用大写字母 + 数字，例如：BH1ABC"
            autoComplete="nickname"
          />
          <TextField
            fullWidth
            label="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 2 }}
            autoComplete="email"
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              fullWidth
              label="邮箱验证码"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              helperText="请输入邮箱收到的6位验证码"
              autoComplete="one-time-code"
            />
            <Button
              variant="outlined"
              onClick={handleSendVerificationCode}
              disabled={sendingCode || cooldown > 0 || !email}
              sx={{ minWidth: 120, mt: 0.5 }}
            >
              {sendingCode ? (
                <CircularProgress size={20} />
              ) : cooldown > 0 ? (
                `${cooldown}s`
              ) : (
                '发送验证码'
              )}
            </Button>
          </Box>
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 2 }}
            helperText="至少 8 位，建议包含大小写字母、数字与符号"
            autoComplete="new-password"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Box
              sx={{
                width: 120,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #ccc',
                borderRadius: 1,
                cursor: 'pointer',
              }}
              onClick={fetchCaptcha}
              dangerouslySetInnerHTML={{ __html: captchaSvg }}
            />
            <TextField
              fullWidth
              label="图形验证码"
              value={captchaCode}
              onChange={(e) => setCaptchaCode(e.target.value)}
              helperText="点击图片刷新"
              autoComplete="off"
            />
          </Box>

          <Button fullWidth variant="contained" type="submit" sx={{ mt: 3 }} disabled={submitting}>
            {submitting ? '注册中...' : '注册'}
          </Button>
        </form>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          已有账号？
          <Link component={RouterLink} to="/login" underline="hover" sx={{ ml: 1 }}>
            去登录
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Register;
