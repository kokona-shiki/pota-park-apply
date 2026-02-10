// src/pages/Login/LoginForm.tsx
import { TextField, InputAdornment, IconButton, Button } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface LoginFormData {
  identifier: string;
  password: string;
  showPassword: boolean;
  submitting: boolean;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onClearIdentifier: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}

function LoginFormData({
  identifier,
  password,
  showPassword,
  submitting,
  onIdentifierChange,
  onPasswordChange,
  onTogglePassword,
  onClearIdentifier,
  onSubmit,
}: LoginFormData) {
  const canSubmit = identifier.trim().length > 0 && password.trim().length > 0;

  const stripBlankChars = (v: string) => v.replace(/\s+/g, '');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') e.preventDefault();
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = stripBlankChars(e.target.value);
    onIdentifierChange(next);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = stripBlankChars(e.target.value);
    onPasswordChange(next);
    if (next.length === 0) onTogglePassword();
  };

  return (
    <form onSubmit={onSubmit}>
      <TextField
        fullWidth
        label="呼号或邮箱"
        value={identifier}
        onKeyDown={handleKeyDown}
        onChange={handleIdentifierChange}
        autoComplete="username"
        InputProps={
          identifier.length > 0
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="清空"
                      onClick={onClearIdentifier}
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
        label="密码"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onKeyDown={handleKeyDown}
        onChange={handlePasswordChange}
        sx={{ mt: 2 }}
        autoComplete="current-password"
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
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={!canSubmit || submitting}
        sx={{ mt: 3 }}
      >
        {submitting ? '登录中...' : '登录'}
      </Button>
    </form>
  );
}

export default LoginFormData;