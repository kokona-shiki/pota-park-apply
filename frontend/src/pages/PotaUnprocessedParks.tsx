import React, { useState, useMemo } from 'react';
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
  Tooltip,
  Snackbar,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import parkTypeMapping from '../../../shared/park_type_mapping.json';
import regionMapping from '../../../shared/region.json';
import { useAuth } from '../auth/useAuth';
import { z } from 'zod';
import {
  PotaUnprocessedParkBulkProcessRequestSchema,
  PotaUnprocessedParkBulkProcessResultSchema,
  PotaUnprocessedParksDataSchema,
  PotaUnprocessedParkSchema,
} from '../../../shared/schemas/pota';
import { apiClient, requestWithSchema } from '../services/apiClient';
import { getApiErrorMessage } from '../utils/error';

type UnprocessedPark = z.infer<typeof PotaUnprocessedParkSchema>;

// 提取公园类型相关的工具函数
const useParkTypes = () => {
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
    registerType(defaultPotaType.id, defaultPotaType.chineseName, defaultPotaType.englishName);

    return Array.from(typeMap.values());
  }, []);

  const parkTypeById = useMemo(
    () => new Map(allParkTypes.map((option) => [option.id, option])),
    [allParkTypes]
  );

  const parkTypeIdsByEnglish = useMemo(() => {
    const map = new Map<string, string[]>();
    allParkTypes.forEach((option) => {
      const ids = map.get(option.en) ?? [];
      ids.push(option.id);
      map.set(option.en, ids);
    });
    return map;
  }, [allParkTypes]);

  const parkTypeIdByChinese = useMemo(() => {
    const map = new Map<string, string>();
    allParkTypes.forEach((option) => {
      map.set(option.zh, option.id);
    });
    return map;
  }, [allParkTypes]);

  const chineseNamesByEnglish = useMemo(() => {
    const map = new Map<string, string[]>();

    (parkTypeMapping.english_to_chinese || []).forEach(
      (item: { englishName: string; chineseNames: string[] }) => {
        map.set(item.englishName, item.chineseNames);
      }
    );

    parkTypeMapping.chinese_to_english.forEach(
      (item: { chineseName: string; englishName: string }) => {
        if (!map.has(item.englishName)) {
          map.set(item.englishName, [item.chineseName]);
        }
      }
    );

    (parkTypeMapping.pota_only_types || []).forEach(
      (item: { chineseName: string; englishName: string }) => {
        if (!map.has(item.englishName)) {
          map.set(item.englishName, [item.chineseName]);
        }
      }
    );

    return map;
  }, []);

  const resolveTypeId = (value: string) => {
    if (parkTypeById.has(value)) {
      return value;
    }
    return parkTypeIdByChinese.get(value) || parkTypeIdsByEnglish.get(value)?.[0] || '';
  };

  const getChineseTypeLabel = (englishName: string) => {
    const chineseNames = chineseNamesByEnglish.get(englishName);
    return chineseNames?.length ? chineseNames.join(' / ') : englishName;
  };

  return {
    allParkTypes,
    parkTypeById,
    resolveTypeId,
    getChineseTypeLabel,
  };
};

// 提取省份相关的工具函数
const useProvinceMapping = () => {
  const provinceByCode = useMemo(() => {
    return new Map<string, string>(
      regionMapping.map((item: { name: string; code: string }) => [item.code, item.name])
    );
  }, []);

  return { provinceByCode };
};

// 提取列定义
const useColumns = (
  allParkTypes: { id: string; zh: string; en: string }[],
  selectedType: { [key: string]: string },
  handleTypeChange: (reference: string, typeId: string) => void,
  provinceByCode: Map<string, string>
) => {
  return useMemo(() => {
    const columns: GridColDef<UnprocessedPark>[] = [
      {
        field: 'reference',
        headerName: 'POTA ID',
        width: 120,
        renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => (
          <Tooltip title={params.value ?? ''}>
            <span>{params.value ?? ''}</span>
          </Tooltip>
        ),
      },
      {
        field: 'name',
        headerName: '公园名称',
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => (
          <Tooltip title={params.value ?? ''}>
            <span>{params.value ?? ''}</span>
          </Tooltip>
        ),
      },
      {
        field: 'failureReason',
        headerName: '失败原因',
        flex: 1,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => {
          const reason = params.value ?? params.row.message ?? '';
          return (
            <Tooltip title={reason}>
              <span>{reason || '-'}</span>
            </Tooltip>
          );
        },
      },
      {
        field: 'latitude',
        headerName: '纬度',
        width: 100,
        valueFormatter: (params: { value: number }) =>
          typeof params.value === 'number' ? params.value.toFixed(4) : '-',
      },
      {
        field: 'longitude',
        headerName: '经度',
        width: 100,
        valueFormatter: (params: { value: number }) =>
          typeof params.value === 'number' ? params.value.toFixed(4) : '-',
      },
      {
        field: 'grid',
        headerName: '网格',
        width: 100,
      },
      {
        field: 'activations',
        headerName: '激活次数',
        width: 100,
      },
      {
        field: 'qsos',
        headerName: 'QSOs',
        width: 80,
      },
      {
        field: 'locationDesc',
        headerName: '省份',
        flex: 1,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<UnprocessedPark, string>) => {
          const code = params.value ?? '';
          const codes = code
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          const provinces = codes.map((item) => provinceByCode.get(item) || item);
          const province = provinces.join('、') || code;
          return (
            <Tooltip title={code}>
              <span>{province}</span>
            </Tooltip>
          );
        },
      },
      {
        field: 'manualType',
        headerName: '选择类型',
        width: 200,
        renderCell: (params: GridRenderCellParams<UnprocessedPark, string | null>) => (
          <FormControl fullWidth size="small">
            <Select
              value={selectedType[params.row.reference] || ''}
              onChange={(e) => handleTypeChange(params.row.reference, String(e.target.value))}
              displayEmpty
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
              <MenuItem value="">
                <em>请选择类型</em>
              </MenuItem>
              {allParkTypes.map((option) => (
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
    ];
    return columns;
  }, [allParkTypes, selectedType, handleTypeChange, provinceByCode]);
};

const PotaUnprocessedParks: React.FC = () => {
  const { user, accessToken, isAuthLoading, isTokenReady } = useAuth();
  const [unprocessedParks, setUnprocessedParks] = useState<UnprocessedPark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<{ [key: string]: string }>({});
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);

  // 使用自定义钩子获取公园类型
  const { allParkTypes, parkTypeById, resolveTypeId } = useParkTypes();

  // 使用自定义钩子获取省份映射
  const { provinceByCode } = useProvinceMapping();

  // 初始化选中的类型
  const initializeSelectedTypes = (parks: UnprocessedPark[]): { [key: string]: string } => {
    const initialSelected: { [key: string]: string } = {};
    parks.forEach((park: UnprocessedPark) => {
      initialSelected[park.reference] = park.manualType ? resolveTypeId(park.manualType) : '';
    });
    return initialSelected;
  };

  // 处理获取错误
  const handleFetchError = (err: unknown): void => {
    const error = err as { response?: { status: number } };
    if (error.response?.status === 401 || error.response?.status === 403) {
      setHasPermission(false);
    } else {
      setError(getApiErrorMessage(err, '获取未处理公园列表失败'));
    }
  };

  // 获取未处理公园列表
  const fetchUnprocessedParks = async () => {
    try {
      setLoading(true);
      setError(null);

      const parks = await requestWithSchema(
        apiClient.get('/api/pota/unprocessed-parks', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        PotaUnprocessedParksDataSchema
      );

      setUnprocessedParks(parks);
      setHasPermission(true);

      // 初始化选中的类型
      const initialSelected = initializeSelectedTypes(parks);
      setSelectedType(initialSelected);
    } catch (err) {
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  // 类型变更处理
  const handleTypeChange = (reference: string, typeId: string) => {
    setSelectedType((prev) => ({
      ...prev,
      [reference]: typeId,
    }));
  };

  // 准备批量处理的公园数据
  const prepareBulkParkData = () => {
    return unprocessedParks
      .filter((park) => selectedType[park.reference])
      .map((park) => {
        const selectedOption = parkTypeById.get(selectedType[park.reference]);
        return {
          ...park,
          manualType: selectedOption?.id || '',
        };
      });
  };

  // 批量处理
  const handleBulkProcess = async () => {
    const parksToProcess = prepareBulkParkData();

    if (parksToProcess.length === 0) {
      setSnackbar({ message: '请至少选择一个公园并为其指定类型', severity: 'info' });
      return;
    }

    try {
      setProcessing(true);

      const requestBody = PotaUnprocessedParkBulkProcessRequestSchema.parse({
        parksData: parksToProcess,
      });

      await requestWithSchema(
        apiClient.post('/api/pota/bulk-process-unprocessed-parks', requestBody, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        PotaUnprocessedParkBulkProcessResultSchema
      );

      // 成功后刷新列表
      await fetchUnprocessedParks();
      setSnackbar({
        message: `批量处理完成，成功处理 ${parksToProcess.length} 个公园`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({ message: getApiErrorMessage(err, '批量处理失败'), severity: 'error' });
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // 使用自定义钩子获取列定义
  const columns = useColumns(allParkTypes, selectedType, handleTypeChange, provinceByCode);

  useOnceOnMount(() => {
    if (isAuthLoading || !isTokenReady || !user) return;
    fetchUnprocessedParks();
  }, [isAuthLoading, isTokenReady, user]);

  if (loading || hasPermission === null) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          POTA 未处理公园
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
          POTA 未处理公园
        </Typography>
        <Alert severity="error">您没有权限访问此页面。</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom>
        POTA 未处理公园
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">待处理公园数量: {unprocessedParks.length}</Typography>
        <Box>
          <Button
            variant="contained"
            onClick={handleBulkProcess}
            disabled={processing || unprocessedParks.length === 0}
            sx={{ mr: 1 }}
          >
            {processing ? <CircularProgress size={24} /> : '批量导入'}
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              await fetchUnprocessedParks();
            }}
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
        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={unprocessedParks}
            columns={columns}
            getRowId={(row) => row.reference}
            pageSizeOptions={[5, 10, 20, 50]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
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
        </div>
      )}

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

export default PotaUnprocessedParks;
