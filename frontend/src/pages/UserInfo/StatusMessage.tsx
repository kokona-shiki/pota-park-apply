// src/pages/UserInfo/StatusMessage.tsx
import { Alert } from '@mui/material';

interface StatusMessageProps {
  errorMessage?: string;
  successMessage?: string;
}

function StatusMessage({ errorMessage, successMessage }: StatusMessageProps) {
  return (
    <>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
    </>
  );
}

export default StatusMessage;