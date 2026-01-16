import React, { useState, useMemo, useCallback } from 'react';
import { useOnceOnMount } from '../hooks/useOnceOnMount';
import {
  Container,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import parkTypeMapping from '../../../shared/park_type_mapping.json';
import { useAuth } from '../auth/useAuth';
import { z } from 'zod';
import {
  ParkTypeMismatchesDataSchema,
  BulkUpdateParkTypeRequestSchema,
  BulkUpdateParkTypeResponseSchema,
  ParkTypeMismatchSchema,
} from '../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { getApiErrorMessage } from '../utils/error';

type ParkTypeMismatch = z.infer<typeof ParkTypeMismatchSchema>;

const ParkTypeAlignment: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [mismatches, setMismatches] = useState<ParkTypeMismatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedParkTypes, setSelectedParkTypes] = useState<{ [key: number]: string }>({});
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);

  // 获取所有可用的公园类型
  const allParkTypes = useMemo(() => {
    const typeMap = new Map<string, { id: string; zh: string; en: string }>();

    const registerType = (id: string, zh: string, en: string) => {
      if (!typeMap.has(id)) {
        typeMap.set(id, { id, zh, en });
      }
    };

    parkTypeMapping.chinese_to_english.forEach(
      (item: { id: string; chineseName: string; englishName: string }) => {
        registerType(item.id, item.chineseName, item.englishName);
      }
    );

    (parkTypeMapping.pota_only_types || []).forEach(
      (item: { id: string; chineseName: string; englishName: string }) => {
        registerType(item.id, item.chineseName, item.englishName);
      }
    );

    const defaultPotaType = parkTypeMapping.default_pota_type;
    if (defaultPotaType) {
      registerType(defaultPotaType.id, defaultPotaType.chineseName, defaultPotaType.englishName);
    }

    return Array.from(typeMap.values());
  }, []);


  useOnceOnMount(() => {
    if (user) {
      fetchMismatches();
    }
  }, [user]);

  const fetchMismatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await requestWithSchema(
        apiClient.get('/api/pota/park-type-mismatches', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        ParkTypeMismatchesDataSchema
      );
      setMismatches(data);
      setHasPermission(true);

      // 初始化选中的类型（默认使用系统当前类型）
      const initialSelected: { [key: number]: string } = {};
      data.forEach((park: ParkTypeMismatch) => {
        initialSelected[park.id] = park.system_park_type_id;
      });
      setSelectedParkTypes(initialSelected);
    } catch (err) {
      const error = err as { response?: { status: number } };
      if (error.response?.status === 401 || error.response?.status === 403) {
        setHasPermission(false);
      } else {
        setError(getApiErrorMessage(err, '获取公园类型不一致列表失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleParkTypeChange = useCallback((parkId: number, typeId: string) => {
    setSelectedParkTypes((prev) => ({
      ...prev,
      [parkId]: typeId,
    }));
  }, []);

  const handleBulkUpdate = useCallback(async () => {
    const updates = selectedRows
      .map((rowId) => {
        const parkId = typeof rowId === 'number' ? rowId : Number.parseInt(String(rowId), 10);
        const selectedTypeId = selectedParkTypes[parkId];
        if (!selectedTypeId) {
          return null;
        }
        return {
          parkId,
          newParkTypeId: selectedTypeId,
        };
      })
      .filter((update) => update !== null) as Array<{ parkId: number; newParkTypeId: string }>;

    if (updates.length === 0) {
      setSnackbar({ message: '请至少选择一个公园并为其指定类型', severity: 'info' });
      return;
    }

    setOpenConfirmDialog(true);
  }, [selectedRows, selectedParkTypes]);

  const confirmBulkUpdate = useCallback(async () => {
    setOpenConfirmDialog(false);

    const updates = selectedRows
      .map((rowId) => {
        const parkId = typeof rowId === 'number' ? rowId : Number.parseInt(String(rowId), 10);
        const selectedTypeId = selectedParkTypes[parkId];
        if (!selectedTypeId) {
          return null;
        }
        return {
          parkId,
          newParkTypeId: selectedTypeId,
        };
      })
      .filter((update) => update !== null) as Array<{ parkId: number; newParkTypeId: string }>;

    if (updates.length === 0) {
      setSnackbar({ message: '请至少选择一个公园并为其指定类型', severity: 'info' });
      return;
    }

    try {
      setProcessing(true);

      const requestBody = BulkUpdateParkTypeRequestSchema.parse({ updates });
      const result = await requestWithSchema(
        apiClient.put('/api/pota/bulk-update-park-types', requestBody, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        BulkUpdateParkTypeResponseSchema
      );

      // 成功后刷新列表
      await fetchMismatches();
      setSelectedRows([]);
      setSnackbar({
        message: `批量更新完成，成功: ${result.data.successCount}，失败: ${result.data.failCount}`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '批量更新失败'), severity: 'error' });
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, [selectedRows, selectedParkTypes, accessToken, fetchMismatches, setSnackbar, setSelectedRows]);

  const cancelBulkUpdate = useCallback(() => {
    setOpenConfirmDialog(false);
  }, [setOpenConfirmDialog]);

  // 定义列
  const columns: GridColDef<ParkTypeMismatch>[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        width: 80,
      },
      {
        field: 'park_name',
        headerName: '公园名称',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'system_park_type_chinese',
        headerName: '系统类型（中文）',
        width: 150,
      },
      {
        field: 'system_park_type_english',
        headerName: '系统类型（英文）',
        width: 200,
      },
      {
        field: 'pota_park_type',
        headerName: 'POTA 类型',
        width: 200,
      },
      {
        field: 'new_park_type',
        headerName: '选择新类型',
        width: 250,
        renderCell: (params: GridRenderCellParams<ParkTypeMismatch, unknown>) => (
          <FormControl fullWidth size="small">
            <Select
              value={selectedParkTypes[params.row.id] || params.row.system_park_type_id}
              onChange={(e) => handleParkTypeChange(params.row.id, String(e.target.value))}
              MenuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                PaperProps: {
                  sx: {
                    maxHeight: 320,
                  },
                },
              }}
            >
              {allParkTypes.map((option: { id: string; zh: string; en: string }) => (
                <MenuItem key={option.id} value={option.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {option.zh}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {option.en}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ),
      },
    ],
    [allParkTypes, selectedParkTypes, handleParkTypeChange]
  );

  if (loading || hasPermission === null) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          公园类型对齐
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (hasPermission === false) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          公园类型对齐
        </Typography>
        <Alert severity="error">您没有权限访问此页面。</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom>
        公园类型对齐
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">不一致的公园数量: {mismatches.length}</Typography>
        <Box>
          <Button
            variant="contained"
            onClick={handleBulkUpdate}
            disabled={processing || selectedRows.length === 0}
            sx={{ mr: 1 }}
          >
            {processing ? <CircularProgress size={24} /> : '批量更新'}
          </Button>
          <Button
            variant="outlined"
            onClick={fetchMismatches}
            disabled={processing}
          >
            刷新
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={mismatches}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 10, 20, 50]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            checkboxSelection
            rowSelectionModel={selectedRows}
            onRowSelectionModelChange={setSelectedRows}
            disableRowSelectionOnClick
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
              },
            }}
          />
        </Box>
      )}

      {/* 确认对话框 */}
      <Dialog open={openConfirmDialog} onClose={cancelBulkUpdate}>
        <DialogTitle>确认批量更新</DialogTitle>
        <DialogContent>
          <Typography>
            您确定要批量更新 {selectedRows.length} 个公园的类型吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelBulkUpdate}>取消</Button>
          <Button variant="contained" onClick={confirmBulkUpdate} disabled={processing}>
            {processing ? <CircularProgress size={24} /> : '确认更新'}
          </Button>
        </DialogActions>
      </Dialog>

      {snackbar && (
        <Snackbar
          open={Boolean(snackbar)}
          autoHideDuration={3000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
};

export default ParkTypeAlignment;
