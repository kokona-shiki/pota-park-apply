// src/pages/Home.tsx
import { useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { useOnceOnMount } from '../hooks/useOnceOnMount';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Box,
  InputAdornment,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { z } from 'zod';
import { apiClient, requestWithSchema } from '../services/apiClient';
import PinyinMatch from 'pinyin-match';
import parkTypeMappingData from '../../../shared/park_type_mapping.json';
import regionData from '../../../shared/region.json';
import type { ParkTypeMapping } from '../../../shared/schemas';

// 定义系统内 POTA 公园的数据结构
const SystemPotaParkSchema = z.object({
  id: z.number(),
  pota_id: z.string().nullable(),
  park_name: z.string(),
  park_type: z.string().nullable(),
  provinces: z.array(z.string()),
  latitude: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .nullable(),
  longitude: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  pota_synced_at: z.string().nullable(),
});

type SystemPotaPark = z.infer<typeof SystemPotaParkSchema>;

// 定义响应数据结构
const PotaParksResponseSchema = z.object({
  parks: z.array(SystemPotaParkSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// 公园类型映射
const PARK_TYPE_MAPPING = parkTypeMappingData as ParkTypeMapping;

const PARK_TYPE_BY_ID = new Map(
  [
    ...PARK_TYPE_MAPPING.chinese_to_english,
    ...(PARK_TYPE_MAPPING.pota_only_types || []),
    ...(PARK_TYPE_MAPPING.default_pota_type ? [PARK_TYPE_MAPPING.default_pota_type] : []),
  ].map((item) => [item.id, { zh: item.chineseName, en: item.englishName }])
);

/**
 * 获取中英文对照的公园类型显示
 */
function getParkTypeWithEnglish(parkType: string | null | undefined): string {
  if (!parkType) return '';

  const typeById = PARK_TYPE_BY_ID.get(parkType);
  if (typeById) {
    return `${typeById.zh} (${typeById.en})`;
  }

  return parkType;
}

function Home() {
  // 状态管理
  const [parks, setParks] = useState<SystemPotaPark[]>([]);
  const [filteredParks, setFilteredParks] = useState<SystemPotaPark[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  // 防抖函数
  function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  }

  // 加载公园数据
  const loadParks = useCallback(async () => {
    try {
      const response = await requestWithSchema(
        apiClient.get('/api/pota/parks', {
          params: {
            page,
            pageSize: rowsPerPage,
            sortBy: 'pota_id',
            sortOrder: 'asc',
          },
        }),
        PotaParksResponseSchema
      );
      setParks(response.parks);
      setFilteredParks(response.parks);
      setTotal(response.total);
    } catch (err) {
      console.error('加载公园数据失败:', err);
    }
  }, [page, rowsPerPage]);

  // 初始加载和分页/每页数量变化时重新加载
  useOnceOnMount(async () => {
    // 不需要登录即可访问
    await loadParks();
  }, [page, rowsPerPage]);

  // 搜索功能
  const handleSearch = useCallback(
    (value: string) => {
      if (!value) {
        setFilteredParks(parks);
        return;
      }

      const filtered = parks.filter((park) => {
        // POTA_ID 匹配
        if (park.pota_id && park.pota_id.toLowerCase().includes(value.toLowerCase())) {
          return true;
        }

        // 中文名称匹配
        if (park.park_name.includes(value)) {
          return true;
        }

        // 拼音匹配
        try {
          if (PinyinMatch.match(park.park_name, value) !== false) {
            return true;
          }
        } catch {
          // 拼音匹配失败时忽略
        }

        return false;
      });

      setFilteredParks(filtered);
    },
    [parks]
  );

  // 创建防抖版本的搜索函数
  const debouncedHandleSearch = debounce(handleSearch, 300);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper sx={{ p: 2 }}>
      {/* 搜索框 */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <TextField
          label="搜索 POTA ID 或公园名称"
          variant="outlined"
          size="small"
          placeholder="例如: CN-0001 或 奥林匹克公园"
          onChange={(e) => debouncedHandleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 400 }}
        />
      </Box>

      {/* 表格 */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '120px' }}>编号</TableCell>
              <TableCell sx={{ width: '200px' }}>名称</TableCell>
              <TableCell sx={{ width: '180px' }}>类型</TableCell>
              <TableCell sx={{ width: '180px' }}>省份</TableCell>
              <TableCell sx={{ width: '120px' }}>经度</TableCell>
              <TableCell sx={{ width: '120px' }}>纬度</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredParks.map((park) => (
              <TableRow key={park.id}>
                <TableCell>{park.pota_id || '-'}</TableCell>
                <TableCell>{park.park_name}</TableCell>
                <TableCell>{getParkTypeWithEnglish(park.park_type) || '-'}</TableCell>
                <TableCell sx={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      overflowX: 'auto',
                      width: '100%',
                      py: 0.5,
                      '&::-webkit-scrollbar': {
                        display: 'none',
                      },
                      '-ms-overflow-style': 'none',
                      scrollbarWidth: 'none',
                    }}
                  >
                    {park.provinces.map((code: string) => {
                      const province = regionData.find(
                        (p: { code: string; name: string }) => p.code === code
                      );
                      return (
                        <Chip
                          key={code}
                          label={province ? province.name : code}
                          size="small"
                          variant="outlined"
                          sx={{ m: 0.25 }}
                        />
                      );
                    })}
                  </Box>
                </TableCell>
                <TableCell>{park.longitude?.toFixed(4) || '-'}</TableCell>
                <TableCell>{park.latitude?.toFixed(4) || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <TablePagination
        rowsPerPageOptions={[10, 30, 50, 100]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="每页条数:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Paper>
  );
}

export default Home;
