// src/pages/UserInfo/CallsignUpdateDialog.tsx
import { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import {
  CallsignChangeRequestCreateSchema,
  CallsignChangeRequestDataSchema,
} from '../../../../shared/schemas/callsign';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import { validateCallsignInput, validateCallsignReason } from './validateCallsign';
import CallsignForm from './CallsignForm';

interface CallsignUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  currentCallsign: string;
  onSuccess: () => void;
}

function CallsignUpdateDialog({
  open,
  onClose,
  currentCallsign,
  onSuccess,
}: CallsignUpdateDialogProps) {
  const [callsign, setCallsign] = useState('');
  const [callsignReason, setCallsignReason] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCallsignUpdate = async () => {
    const passwordValidation = validateCallsignInput(oldPassword, undefined);
    if (!passwordValidation.isValid) {
      setErrorMessage(passwordValidation.errorMessage);
      return;
    }

    const callsignValidation = validateCallsignInput(callsign, currentCallsign);
    if (!callsignValidation.isValid) {
      setErrorMessage(callsignValidation.errorMessage);
      return;
    }

    const reasonValidation = validateCallsignReason(callsignReason);
    if (!reasonValidation.isValid) {
      setErrorMessage(reasonValidation.errorMessage);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const requestBody = CallsignChangeRequestCreateSchema.parse({
        newCallsign: callsign,
        reason: callsignReason,
      });
      await requestWithSchema(
        apiClient.post('/api/callsign-change-requests', requestBody),
        CallsignChangeRequestDataSchema
      );

      onSuccess();
      setCallsign('');
      setCallsignReason('');
      setOldPassword('');
      onClose();
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, '呼号变更申请提交失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCallsign('');
    setCallsignReason('');
    setOldPassword('');
    setErrorMessage('');
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>修改呼号</DialogTitle>
      <DialogContent>
        <CallsignForm
          currentCallsign={currentCallsign}
          callsign={callsign}
          callsignReason={callsignReason}
          oldPassword={oldPassword}
          showPassword={showPassword}
          loading={loading}
          errorMessage={errorMessage}
          onCallsignChange={setCallsign}
          onCallsignReasonChange={setCallsignReason}
          onOldPasswordChange={setOldPassword}
          onTogglePassword={handleClickShowPassword}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button onClick={handleCallsignUpdate} disabled={loading} variant="contained">
          提交申请
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CallsignUpdateDialog;
