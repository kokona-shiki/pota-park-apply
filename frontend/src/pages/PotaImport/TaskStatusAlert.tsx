// src/pages/PotaImport/TaskStatusAlert.tsx
import { Alert, Typography } from '@mui/material';
import { z } from 'zod';
import { ImportTaskSchema } from '../../../../shared/schemas/potaImport';

type ImportTask = z.infer<typeof ImportTaskSchema>;

interface TaskStatusAlertProps {
  task: ImportTask | null;
  statusLabel: string;
  taskAlertSeverity: 'error' | 'warning' | 'success' | 'info';
}

function TaskStatusAlert({ task, statusLabel, taskAlertSeverity }: TaskStatusAlertProps) {
  if (!task) return null;

  return (
    <Alert severity={taskAlertSeverity} sx={{ mb: 2 }}>
      <Typography sx={{ fontWeight: 600 }}>
        导入任务状态：{statusLabel || task.status}
      </Typography>
      {task.status === 'pending' && task.queuePosition > 0 && (
        <Typography variant="body2">当前排队位置：{task.queuePosition}</Typography>
      )}
      {task.result && (
        <Typography variant="body2">
          总计: {task.result.total}，导入: {task.result.imported}，跳过: {task.result.skipped}
          ，错误: {task.result.errors}，待处理: {task.result.needsManual}
        </Typography>
      )}
      {task.error && (
        <Typography variant="body2" color="error.main">
          {task.error}
        </Typography>
      )}
    </Alert>
  );
}

export default TaskStatusAlert;