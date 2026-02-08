import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { useState, useRef } from 'react';
import { fetchApi } from '../services/apiClient';
import { usePermission } from '../hooks/usePermission';

export const GlobalNotificationEditor = () => {
  const { hasPermission } = usePermission('create_global_notification');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [notificationMode, setNotificationMode] = useState<'normal' | 'popup'>('normal');
  const [publishType, setPublishType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const scheduledAtInputRef = useRef<HTMLInputElement>(null);

  if (!hasPermission) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">您没有权限访问此页面</Typography>
      </Box>
    );
  }

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!title.trim() || !description.trim()) {
      setError('标题和描述不能为空');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (isDraft) {
        await fetchApi('/api/notifications/drafts', {
          method: 'POST',
          body: {
            title,
            description,
            link_url: linkUrl || '',
            notification_mode: notificationMode,
            scheduled_at: publishType === 'scheduled' ? scheduledAt : undefined,
          },
        });
      } else {
        await fetchApi('/api/notifications', {
          method: 'POST',
          body: {
            type: 'global_notification',
            title,
            description,
            link_url: linkUrl || '',
            notification_mode: notificationMode,
            scheduled_at: publishType === 'scheduled' ? scheduledAt : undefined,
          },
        });
      }
      setSuccess(true);
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setScheduledAt('');
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        创建全局通知
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          操作成功
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="通知标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <TextField
              fullWidth
              label="通知描述（支持 Markdown）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={6}
              required
              helperText="支持 Markdown 语法，可以使用 **粗体**、*斜体*、[链接](url) 等"
            />

            <TextField
              fullWidth
              label="跳转链接（可选）"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              helperText="用户点击通知后跳转的页面"
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>通知模式</InputLabel>
              <Select
                value={notificationMode}
                onChange={(e) => setNotificationMode(e.target.value as 'normal' | 'popup')}
                label="通知模式"
              >
                <MenuItem value="normal">站内信</MenuItem>
                <MenuItem value="popup">弹窗通知</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>发布方式</Typography>
              <RadioGroup
                row
                aria-label="publish-type"
                name="publish-type"
                value={publishType}
                onChange={(e) => setPublishType(e.target.value as 'immediate' | 'scheduled')}
              >
                <FormControlLabel value="immediate" control={<Radio />} label="立即发布" />
                <FormControlLabel value="scheduled" control={<Radio />} label="定时发布" />
              </RadioGroup>
            </FormControl>

            {publishType === 'scheduled' && (
              <TextField
                fullWidth
                label="发布时间"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                inputRef={scheduledAtInputRef}
                onClick={() => scheduledAtInputRef.current?.showPicker?.()}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                保存为草稿
              </Button>
              <Button
                variant="contained"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                发布
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
