// src/pages/add-park/useSubmitHandler.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormState } from './types';
import { useFormState, clearFormState } from './useFormState';
import { useSubmit } from './useSubmit';
import { ApplicationDetailDataSchema } from '../../../../shared/schemas/parkApplication';
import { apiClient, requestWithSchema } from '../../services/apiClient';

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

  const handleFormSubmit = async () => {
    setError(null);

    try {
      const result = await handleSubmit(formState);

      if (result.success) {
        clearFormState();
        navigate('/my-uploads');
      } else {
        const errorMessage = result.error || '提交失败，请重试';
        const errorCode = result.errorDetails?.code;
        const isDuplicateNameError = errorCode?.startsWith('DUPLICATE_NAME');

        if (isDuplicateNameError) {
          const details = result.errorDetails?.details;
          if (details) {
            const existingPark = details.existingPark;
            const allowRetry = details.allowRetry;

            setDialogType(allowRetry ? 'warning' : 'error');
            setDialogTitle(allowRetry ? '警告' : '错误');
            setDialogMessage(errorMessage);

            const shouldShowLink =
              errorCode === 'DUPLICATE_NAME_APPROVED' || errorCode === 'DUPLICATE_NAME_POTA_SYNCED';
            const parkList =
              shouldShowLink && existingPark
                ? [{ id: existingPark.id, name: existingPark.name }]
                : [];
            setDialogParkList(parkList);
            setDialogParkListTitle(existingPark?.status === 'pota_synced' ? '已存在的公园' : '');

            if (allowRetry) {
              const confirmAction = async () => {
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
              setDialogConfirmAction(() => confirmAction);
            } else {
              setDialogConfirmAction(null);
            }
          } else if (result.errorDetails?.existingPark) {
            const existingPark = result.errorDetails?.existingPark;
            setDialogType('error');
            setDialogTitle('错误');
            setDialogMessage(errorMessage);

            const shouldShowLink =
              existingPark?.status === 'approved' || existingPark?.status === 'pota_synced';
            const parkList = shouldShowLink
              ? [{ id: existingPark.id, name: existingPark.name }]
              : [];
            setDialogParkList(parkList);
            setDialogParkListTitle(existingPark?.status === 'pota_synced' ? '已存在的公园' : '');
            setDialogConfirmAction(null);
          } else if (errorCode === 'SIMILAR_NAME' || errorMessage.includes('公园名称相似度较高')) {
            let parkList: { id: number; name: string }[] = [];
            try {
              parkList = result.errorDetails?.details?.similarParks || [];
            } catch {
              parkList = [];
            }
            setDialogType('warning');
            setDialogTitle('警告');
            setDialogMessage('当前填写的公园名称与已有公园名称相似度较高。');
            setDialogParkList(parkList);
            setDialogParkListTitle('相似公园列表');

            const confirmAction = async () => {
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
            setDialogConfirmAction(() => confirmAction);
          } else if (errorCode === 'NEARBY_LOCATION' || errorMessage.includes('公园距离过近')) {
            let parkList: { id: number; name: string }[] = [];
            try {
              parkList = result.errorDetails?.details?.nearbyParks || [];
            } catch {
              parkList = [];
            }
            setDialogType('warning');
            setDialogTitle('警告');
            setDialogMessage('当前填写的公园位置与已有公园位置距离较近。');
            setDialogParkList(parkList);
            setDialogParkListTitle('附近公园列表');

            const confirmAction = async () => {
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
            setDialogConfirmAction(() => confirmAction);
          } else {
            setError(errorMessage);
          }
        }
      }
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