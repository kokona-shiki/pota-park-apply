// src/pages/add-park/useSubmit.ts
import { useState, useRef } from 'react';
import { ApplicationDetailDataSchema, ParkApplicationSubmitRequestSchema } from '../../../../shared/schemas/parkApplication';
import { apiClient, requestWithSchema } from '../../services/apiClient';
import { getApiErrorMessage, getApiErrorDetails, type ApiErrorDetails } from '../../utils/error';
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

  // 验证必填字段
  const validateRequiredFields = (name: string, type: string, prov: string) => {
    if (!name) {
      throw new Error('请填写公园名称');
    }
    if (!type) {
      throw new Error('请选择公园类型');
    }
    if (!prov) {
      throw new Error('请选择省份');
    }
  };

  // 验证经纬度
  const validateCoordinates = (latNum: number, lonNum: number) => {
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      throw new Error('请填写有效的经纬度');
    }
    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      throw new Error('经纬度超出范围（纬度 -90～90，经度 -180～180）');
    }
  };

  // 验证方法列表
  const validateMethods = (access: string[], activation: string[]) => {
    if (access.length === 0) {
      throw new Error('请选择至少一个访问方法');
    }
    if (activation.length === 0) {
      throw new Error('请选择至少一个激活方法');
    }
  };

  // 验证网站URL
  const validateWebsite = (website: string) => {
    if (website && website.trim() !== '' && !isValidUrl(website.trim())) {
      throw new Error('公园网址格式不对');
    }
  };

  // 验证提交参数
  const validateSubmitParams = (params: SubmitParams) => {
    const name = params.parkName.trim();
    const type = params.parkType.trim();
    const prov = params.province.trim();
    const latNum = Number.parseFloat(params.latitude.trim());
    const lonNum = Number.parseFloat(params.longitude.trim());
    const access = params.accessMethods.map((s) => String(s).trim()).filter(Boolean);
    const activation = params.activationMethods.map((s) => String(s).trim()).filter(Boolean);

    validateRequiredFields(name, type, prov);
    validateCoordinates(latNum, lonNum);
    validateMethods(access, activation);
    
    if (!params.confirmed) {
      throw new Error('请勾选确认公园真实性');
    }

    validateWebsite(params.website);

    return {
      name,
      type,
      prov,
      provs: params.provinces || [],
      latNum,
      lonNum,
      access,
      activation,
      website: params.website,
      confirmed: params.confirmed,
      confirmedNameSimilarity: params.confirmedNameSimilarity,
      confirmedNearbyLocation: params.confirmedNearbyLocation,
      confirmedRejectedPark: params.confirmedRejectedPark,
    };
  };

  // 构建请求体
  const buildRequestBody = (validatedParams: ReturnType<typeof validateSubmitParams>) => {
    return ParkApplicationSubmitRequestSchema.parse({
      park_name: validatedParams.name,
      park_type: validatedParams.type,
      provinces: validatedParams.provs.length > 0 ? validatedParams.provs : [validatedParams.prov],
      latitude: validatedParams.latNum,
      longitude: validatedParams.lonNum,
      website: validatedParams.website,
      access_methods: validatedParams.access.map(method => REVERSE_ACCESS_METHODS_MAP[method] || method),
      activation_methods: validatedParams.activation.map(method => REVERSE_ACTIVATION_METHODS_MAP[method] || method),
      confirmed_authenticity: validatedParams.confirmed,
      confirmedNameSimilarity: validatedParams.confirmedNameSimilarity,
      confirmedNearbyLocation: validatedParams.confirmedNearbyLocation,
      confirmedRejectedPark: validatedParams.confirmedRejectedPark,
    });
  };

  const handleSubmit = async (params: unknown): Promise<SubmitResult> => {
    const typedParams = params as SubmitParams;

    if (submitRequestRef.current) {
      return { success: false, error: '提交请求已在处理中' };
    }

    submitRequestRef.current = true;
    setSubmitting(true);

    try {
      // 验证参数
      const validatedParams = validateSubmitParams(typedParams);
      
      // 构建请求体
      const requestBody = buildRequestBody(validatedParams);
      
      // 发送请求
      await requestWithSchema(
        apiClient.post('/api/park-applications', requestBody, { timeout: 5000 }),
        ApplicationDetailDataSchema
      ); // 5秒超时

      return { success: true };
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = getApiErrorMessage(err, '提交失败，请检查网络后重试');
      const errorDetails = getApiErrorDetails(err);
      return { success: false, error: errorMessage, errorDetails };
    } finally {
      submitRequestRef.current = false;
      setSubmitting(false);
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
  errorDetails?: ApiErrorDetails;
};
