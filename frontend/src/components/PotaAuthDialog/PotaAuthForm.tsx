// src/components/PotaAuthDialog/PotaAuthForm.tsx
import { useState } from 'react';
import { Stack, TextField, Button, Alert, Typography, Box, CircularProgress } from '@mui/material';
import { PotaAuthResultDataSchema } from '../../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { getApiErrorMessage } from '../../utils/error';

interface PotaAuthFormProps {
  onAuthSuccess: () => void;
  onAuthError?: (error: string) => void;
}

function PotaAuthForm({ onAuthSuccess, onAuthError }: PotaAuthFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startAuth = async () => {
    if (!username || !password) {
      setError('请输入 POTA 账号和密码');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await requestWithSchema(
        apiClient.post('/api/pota/login', { username, password }),
        PotaAuthResultDataSchema
      );

      setSuccess('POTA 登录成功！');
      setError(null);

      await new Promise((resolve) => setTimeout(resolve, 500));
      onAuthSuccess();

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (e: unknown) {
      const errorMessage = getApiErrorMessage(e, 'POTA 登录失败');
      setError(errorMessage);
      setLoading(false);
      setSuccess(null);
      if (onAuthError) {
        onAuthError(errorMessage);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      startAuth();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setUsername('');
      setPassword('');
    }
  };

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        请输入您的 POTA 洲号和密码。密码将仅用于登录，不会被存储。
      </Alert>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              正在登录 POTA...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              这可能需要几秒钟时间
            </Typography>
          </Stack>
        </Box>
      )}

      {!loading && (
        <>
          <TextField
            label="POTA 洲号（邮箱）"
            type="email"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <TextField
            label="POTA 密码"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            onKeyPress={handleKeyPress}
          />
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </>
      )}

      <Button onClick={handleClose} disabled={loading}>
        取消
      </Button>
      <Button onClick={startAuth} variant="contained" disabled={loading || !username || !password}>
        {loading ? '登录中...' : '登录'}
      </Button>
    </Stack>
  );
}

export default PotaAuthForm;