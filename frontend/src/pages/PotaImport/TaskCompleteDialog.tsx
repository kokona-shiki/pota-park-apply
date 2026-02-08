// src/pages/PotaImport/TaskCompleteDialog.tsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { requestWithSchema } from '../../services/apiClient';
import { PotaImportMarkReadDataSchema } from '../../../shared/schemas/potaImport';
import type { ImportTask } from '../PotaImport';

interface TaskCompleteDialogProps {
  open: boolean;
  task: ImportTask | null;
  statusLabel: string;
  onClose: () => void;
  loadLatestTask: () => void;
}

function TaskCompleteDialog({ open, task, statusLabel, onClose, loadLatestTask }: TaskCompleteDialogProps) {
  const navigate = useNavigate();

  const handleClose = async () => {
    if (task?.id) {
      try {
        await requestWithSchema(
          apiClient.post(`/api/pota/import-task/${task.id}/read`),
          PotaImportMarkReadDataSchema
        );
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
            <>
              <Typography>总计处理: {task.result.total} 个公园</Typography>
              <Typography>成功导入: {task.result.imported} 个</Typography>
              <Typography>跳过已存在: {task.result.skipped} 个</Typography>
              <Typography>导入错误: {task.result.errors} 个</Typography>
              <Typography>待处理公园: {task.result.needsManual || 0} 个</Typography>
            </>
          )}
          {(task?.result?.needsManual || 0) > 0 && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Link
                href=""
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/pota-unprocessed');
                  handleClose();
                }}
              >
                前往未处理公园页面进行手动确认
              </Link>
            </Typography>
          )}
          {task.error && (
            <Typography color="error.main" variant="body2">
              {task.error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>我知道了</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskCompleteDialog;