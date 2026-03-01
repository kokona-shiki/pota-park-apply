// src/pages/add-park/useFormState.ts
import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import type { FormState } from './types';
import { safeParseJsonWithSchema } from '../../utils/parseJson';

const FORM_STATE_KEY = 'addParkFormData';

const FormStateSchema = z.object({
  parkName: z.string(),
  parkType: z.string(),
  province: z.string(),
  provinces: z.array(z.string()),
  latitude: z.string(),
  longitude: z.string(),
  website: z.string(),
  accessMethods: z.array(z.string()),
  activationMethods: z.array(z.string()),
  confirmed: z.boolean(),
  isPotaPark: z.boolean(),
  mapCenter: z.tuple([z.number(), z.number()]),
  mapZoom: z.number(),
});

export const loadSavedState = (): FormState | null => {
  try {
    const saved = localStorage.getItem(FORM_STATE_KEY);
    if (!saved) return null;
    return safeParseJsonWithSchema(FormStateSchema, saved);
  } catch {
    return null;
  }
};

export const saveFormState = (state: FormState) => {
  try {
    localStorage.setItem(FORM_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save form state:', error);
  }
};

export const clearFormState = () => {
  localStorage.removeItem(FORM_STATE_KEY);
};

// 默认值配置
const DEFAULT_FORM_STATE: FormState = {
  parkName: '',
  parkType: '',
  province: '',
  provinces: [],
  latitude: '',
  longitude: '',
  website: '',
  accessMethods: ['汽车', '步行', '其他'],
  activationMethods: ['步行', '车载', '其他'],
  confirmed: false,
  isPotaPark: false,
  mapCenter: [39.9042, 116.4074],
  mapZoom: 13,
};

// 生成初始表单状态
const getInitialFormState = (savedState: FormState | null, initialState: Partial<FormState>): FormState => {
  return {
    ...DEFAULT_FORM_STATE,
    ...initialState,
    ...savedState,
  };
};

export const useFormState = (initialState: Partial<FormState> = {}) => {
  const savedState = loadSavedState();

  const [formState, setFormState] = useState<FormState>(() =>
    getInitialFormState(savedState, initialState)
  );

  const updateFormState = useCallback((newState: Partial<FormState>) => {
    setFormState((prev) => {
      const updated = { ...prev, ...newState };
      saveFormState(updated);
      return updated;
    });
  }, []);

  const resetFormState = useCallback(() => {
    setFormState(DEFAULT_FORM_STATE);
    clearFormState();
  }, []);

  useEffect(() => {
    saveFormState(formState);
  }, [formState]);

  return {
    formState,
    updateFormState,
    resetFormState,
  };
};