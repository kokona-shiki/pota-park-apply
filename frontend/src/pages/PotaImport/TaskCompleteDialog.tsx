import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Link } from '@mui/material';
import { z } from 'zod';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { PotaImportMarkReadDataSchema, ImportTaskSchema } from '../../../../shared/schemas/potaImport';

type ImportTask = z.infer<typeof ImportTaskSchema>;

interface TaskCompleteDialogProps {
  open: boolean;
  task: ImportTask | null;
  statusLabel: string;
  onClose: () => void;
  loadLatestTask: () => void;
}

function markTaskAsRead(taskId: string) {
  return requestWithSchema(
    apiClient.post(`/api/pota/import-task/${taskId}/read`),
    PotaImportMarkReadDataSchema
  );
}

function TaskResultSummary({ result }: { result: ImportTask['result'] }) {
  if (!result) return null;
  return (
    <>
      <Typography>总计处理: {result.total} 个公园</Typography>
      <Typography>成功导入: {result.imported} 个</Typography>
      <Typography>跳过已存在: {result.skipped} 个</Typography>
      <Typography>导入错误: {result.errors} 个</Typography>
      <Typography>待处理公园: {result.needsManual || 0} 个</Typography>
    </>
  );
}

function TaskErrorDisplay({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Typography color="error.main" variant="body2">
      {error}
    </Typography>
  );
}

function ManualProcessLink({ task, onClose }: { task: ImportTask; onClose: () => void }) {
  if ((task.result?.needsManual || 0) <= 0) return null;

  return (
    <Typography variant="body2" sx={{ mt: 1 }}>
      <Link
        component="button"
        onClick={() => {
          window.location.href = '/pota-unprocessed';
          onClose();
        }}
      >
        前往未处理公园页面进行手动确认
      </Link>
    </Typography>
  );
}

function TaskCompleteDialog({ open, task, statusLabel, onClose, loadLatestTask }: TaskCompleteDialogProps) {
  const handleClose = async () => {
    if (task?.id) {
      try {
        await markTaskAsRead(task.id);
      } catch (e) {
        console.warn('标记导入任务已读失败', e);
      }
    }
    onClose();
    loadLatestTask();
  };

  if (!task) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>导入任务完成</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Typography>
            状态：{statusLabel || task?.status || '未知'}
          </Typography>
          {task.result && (
            <TaskResultSummary result={task.result} />
          )}
          <ManualProcessLink task={task} onClose={handleClose} />
          <TaskErrorDisplay error={task.error} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>我知道了</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskCompleteDialog;
