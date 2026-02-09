// src/pages/add-park/useSubmitHandler.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormState } from './types';
import { clearFormState } from './useFormState';
import { useSubmit } from './useSubmit';

interface SubmitResult {
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
    existingPark?: {
      id: number;
      name: string;
      status: string;
    };
  };
}

function isDuplicateNameError(errorCode?: string): boolean {
  return errorCode?.startsWith('DUPLICATE_NAME') ?? false;
}

function isSimilarNameError(errorCode?: string, errorMessage?: string): boolean {
  return errorCode === 'SIMILAR_NAME' || Boolean(errorMessage?.includes('公园名称相似度较高'));
}

function isNearbyLocationError(errorCode?: string, errorMessage?: string): boolean {
  return errorCode === 'NEARBY_LOCATION' || Boolean(errorMessage?.includes('公园距离过近'));
}

function shouldShowLink(errorCode?: string): boolean {
  return errorCode === 'DUPLICATE_NAME_APPROVED' || errorCode === 'DUPLICATE_NAME_POTA_SYNCED';
}

function getDialogType(allowRetry: boolean): 'error' | 'warning' {
  return allowRetry ? 'warning' : 'error';
}

function getDialogTitle(allowRetry: boolean): string {
  return allowRetry ? '警告' : '错误';
}

function getParkListTitle(existingPark?: { status: string }): string {
  return existingPark?.status === 'pota_synced' ? '已存在的公园' : '';
}

function createDuplicateNameConfirmAction(
  formState: FormState,
  handleSubmit: (state: FormState) => Promise<SubmitResult>,
  setError: (error: string) => void,
  clearFormState: () => void,
  navigate: ReturnType<typeof useNavigate>
): () => Promise<void> {
  return async () => {
    const result = await handleSubmit({
      ...formState,
      confirmedRejectedPark: true,
    });

    if (result.success) {
      clearFormState();
      navigate('/my-uploads');
    } else {
      setError(result.error || '提交失败，请重试');
    }
  };
}

function createSimilarNameConfirmAction(
  formState: FormState,
  handleSubmit: (state: FormState) => Promise<SubmitResult>,
  setError: (error: string) => void,
  clearFormState: () => void,
  navigate: ReturnType<typeof useNavigate>
): () => Promise<void> {
  return async () => {
    const result = await handleSubmit({
      ...formState,
      confirmedNameSimilarity: true,
    });

    if (result.success) {
      clearFormState();
      navigate('/my-uploads');
    } else {
      setError(result.error || '提交失败，请重试');
    }
  };
}

function createNearbyLocationConfirmAction(
  formState: FormState,
  handleSubmit: (state: FormState) => Promise<SubmitResult>,
  setError: (error: string) => void,
  clearFormState: () => void,
  navigate: ReturnType<typeof useNavigate>
): () => Promise<void> {
  return async () => {
    const result = await handleSubmit({
      ...formState,
      confirmedNearbyLocation: true,
    });

    if (result.success) {
      clearFormState();
      navigate('/my-uploads');
    } else {
      setError(result.error || '提交失败，请重试');
    }
  };
}

function extractParkList(
  result: SubmitResult,
  shouldShow: boolean
): { id: number; name: string }[] {
  if (!shouldShow || !result.errorDetails) {
    return [];
  }

  const existingPark = result.errorDetails.existingPark;
  if (!existingPark) {
    return [];
  }

  return [{ id: existingPark.id, name: existingPark.name }];
}

function extractSimilarParks(result: SubmitResult): { id: number; name: string }[] {
  try {
    return result.errorDetails?.details?.similarParks || [];
  } catch {
    return [];
  }
}

function extractNearbyParks(result: SubmitResult): { id: number; name: string }[] {
  try {
    return result.errorDetails?.details?.nearbyParks || [];
  } catch {
    return [];
  }
}

export const useSubmitHandler = (formState: FormState) => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'error' | 'warning'>('error');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogParkList, setDialogParkList] = useState<{ id: number; name: string }[]>([]);
  const [dialogParkListTitle, setDialogParkListTitle] = useState('');
  const [dialogConfirmAction, setDialogConfirmAction] = useState<(() => void) | null>(null);
  const { submitting, handleSubmit } = useSubmit();

  // 处理重复名称错误
  const handleDuplicateNameError = (result: SubmitResult, errorCode?: string) => {
    const details = result.errorDetails?.details;
    const existingPark = details?.existingPark;
    const allowRetry = details?.allowRetry ?? false;

    setDialogType(getDialogType(allowRetry));
    setDialogTitle(getDialogTitle(allowRetry));
    setDialogMessage(result.error || '提交失败，请重试');
    setDialogParkList(extractParkList(result, shouldShowLink(errorCode)));
    setDialogParkListTitle(getParkListTitle(existingPark));

    if (allowRetry) {
      setDialogConfirmAction(createDuplicateNameConfirmAction(
        formState,
        handleSubmit,
        setError,
        clearFormState,
        navigate
      ));
    } else {
      setDialogConfirmAction(null);
    }
  };

  // 处理已存在公园错误
  const handleExistingParkError = (result: SubmitResult) => {
    const existingPark = result.errorDetails?.existingPark;
    const shouldShowLink = existingPark?.status === 'approved' || existingPark?.status === 'pota_synced';

    setDialogType('error');
    setDialogTitle('错误');
    setDialogMessage(result.error || '提交失败，请重试');
    setDialogParkList(extractParkList(result, shouldShowLink));
    setDialogParkListTitle(getParkListTitle(existingPark));
    setDialogConfirmAction(null);
  };

  // 处理相似名称错误
  const handleSimilarNameError = (result: SubmitResult) => {
    const parkList = extractSimilarParks(result);

    setDialogType('warning');
    setDialogTitle('警告');
    setDialogMessage('当前填写的公园名称与已有公园名称相似度较高。');
    setDialogParkList(parkList);
    setDialogParkListTitle('相似公园列表');
    setDialogConfirmAction(createSimilarNameConfirmAction(
      formState,
      handleSubmit,
      setError,
      clearFormState,
      navigate
    ));
  };

  // 处理附近位置错误
  const handleNearbyLocationError = (result: SubmitResult) => {
    const parkList = extractNearbyParks(result);

    setDialogType('warning');
    setDialogTitle('警告');
    setDialogMessage('当前填写的公园位置与已有公园位置距离较近。');
    setDialogParkList(parkList);
    setDialogParkListTitle('附近公园列表');
    setDialogConfirmAction(createNearbyLocationConfirmAction(
      formState,
      handleSubmit,
      setError,
      clearFormState,
      navigate
    ));
  };

  // 处理成功结果
  const handleSuccessResult = () => {
    clearFormState();
    navigate('/my-uploads');
  };

  // 处理错误结果
  const handleErrorResult = (result: SubmitResult) => {
    const errorCode = result.errorDetails?.code;

    if (isDuplicateNameError(errorCode)) {
      handleDuplicateNameError(result, errorCode);
      return;
    }

    if (result.errorDetails?.existingPark) {
      handleExistingParkError(result);
      return;
    }

    if (isSimilarNameError(errorCode, result.error)) {
      handleSimilarNameError(result);
      return;
    }

    if (isNearbyLocationError(errorCode, result.error)) {
      handleNearbyLocationError(result);
      return;
    }

    setError(result.error || '提交失败，请重试');
  };

  const handleFormSubmit = async () => {
    setError(null);

    try {
      const result = await handleSubmit(formState);

      if (result.success) {
        handleSuccessResult();
        return;
      }

      handleErrorResult(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '提交失败，请检查网络后重试';
      setError(errorMessage);
    }
  };

  const handleDialogCancel = () => {
    setDialogOpen(false);
    setDialogConfirmAction(null);
  };

  return {
    error,
    setError,
    dialogOpen,
    dialogType,
    dialogTitle,
    dialogMessage,
    dialogParkList,
    dialogParkListTitle,
    dialogConfirmAction,
    submitting,
    handleFormSubmit,
    handleDialogCancel,
  };
};