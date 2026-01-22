// src/pages/add-park/useSubmit.ts
import { useState, useRef } from 'react';
import { ApplicationDetailDataSchema, ParkApplicationSubmitRequestSchema } from '../../../../shared/schemas/parkApplication';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { getApiErrorMessage, getApiErrorDetails } from '../../utils/error';
import { REVERSE_ACCESS_METHODS_MAP, REVERSE_ACTIVATION_METHODS_MAP } from '../../utils/potaMapping';
import { isValidUrl } from '../../utils/urlValidation';

interface SubmitParams {
  parkName: string;
  parkType: string;
  province: string;
  provinces: string[];
  latitude: string;
  longitude: string;
  website: string;
  accessMethods: string[];
  activationMethods: string[];
  confirmed: boolean;
  confirmedNameSimilarity?: boolean; // 名称相似度确认
  confirmedNearbyLocation?: boolean; // 地理位置确认
  confirmedRejectedPark?: boolean; // 已拒绝公园确认
}

export const useSubmit = () => {
  const [submitting, setSubmitting] = useState(false);
  const submitRequestRef = useRef(false);

  const handleSubmit = async (params: SubmitParams): Promise<SubmitResult> => {
    console.log('[useSubmit] handleSubmit 开始执行', {
      params,
      confirmedNameSimilarity: params.confirmedNameSimilarity,
      confirmedNearbyLocation: params.confirmedNearbyLocation,
      confirmedRejectedPark: params.confirmedRejectedPark
    });

    // 前端必填校验（避免无效请求）
    const name = params.parkName.trim();
    const type = params.parkType.trim();
    const prov = params.province.trim();
    const provs = params.provinces || [];
    const latNum = Number.parseFloat(params.latitude.trim());
    const lonNum = Number.parseFloat(params.longitude.trim());
    const access = params.accessMethods.map((s) => String(s).trim()).filter(Boolean);
    const activation = params.activationMethods.map((s) => String(s).trim()).filter(Boolean);

    if (!name) {
      throw new Error('请填写公园名称');
    }
    if (!type) {
      throw new Error('请选择公园类型');
    }
    if (!prov) {
      throw new Error('请选择省份');
    }
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      throw new Error('请填写有效的经纬度');
    }
    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      throw new Error('经纬度超出范围（纬度 -90～90，经度 -180～180）');
    }
    if (access.length === 0) {
      throw new Error('请选择至少一个访问方法');
    }
    if (activation.length === 0) {
      throw new Error('请选择至少一个激活方法');
    }
    if (!params.confirmed) {
      throw new Error('请勾选确认公园真实性');
    }

    // 验证网站URL格式
    if (params.website && params.website.trim() !== '' && !isValidUrl(params.website.trim())) {
      throw new Error('公园网址格式不对');
    }

    if (submitRequestRef.current) {
      console.log('[useSubmit] 提交请求已在处理中，直接返回');
      return { success: false, error: '提交请求已在处理中' };
    }

    submitRequestRef.current = true;
    setSubmitting(true);

    console.log('[useSubmit] 准备发送 API 请求');

    try {
      const requestBody = ParkApplicationSubmitRequestSchema.parse({
        park_name: name,
        park_type: type,
        provinces: provs.length > 0 ? provs : [prov], // 省份数组
        latitude: latNum,
        longitude: lonNum,
        website: params.website,
        access_methods: access.map(method => REVERSE_ACCESS_METHODS_MAP[method] || method),
        activation_methods: activation.map(method => REVERSE_ACTIVATION_METHODS_MAP[method] || method),
        confirmed_authenticity: params.confirmed,
        confirmedNameSimilarity: params.confirmedNameSimilarity,
        confirmedNearbyLocation: params.confirmedNearbyLocation,
        confirmedRejectedPark: params.confirmedRejectedPark,
      });
      console.log('[useSubmit] 请求体:', requestBody);
      await requestWithSchema(
        apiClient.post('/api/park-applications', requestBody, { timeout: 5000 }),
        ApplicationDetailDataSchema
      ); // 5秒超时

      console.log('[useSubmit] API 请求成功');
      return { success: true };
    } catch (err: unknown) {
      console.error('[useSubmit] API 请求失败:', err);
      const errorMessage = getApiErrorMessage(err, '提交失败，请检查网络后重试');
      const errorDetails = getApiErrorDetails(err);
      console.log('[useSubmit] 错误信息:', errorMessage);
      console.log('[useSubmit] 错误详情:', errorDetails);
      return { success: false, error: errorMessage, errorDetails };
    } finally {
      submitRequestRef.current = false;
      setSubmitting(false);
      console.log('[useSubmit] handleSubmit 执行完成');
    }
  };

  return {
    submitting,
    handleSubmit,
  };
};

export type SubmitResult = {
  success: boolean;
  error?: string;
  errorDetails?: {
    code?: string;
    details?: {
      similarParks?: Array<{ id: number; name: string }>;
      nearbyParks?: Array<{ id: number; name: string }>;
      existingPark?: {
        id: number;
        name: string;
        status: string;
      };
      allowRetry?: boolean;
    };
  };
};
