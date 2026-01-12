// src/pages/add-park/useFormState.ts
import { useState, useCallback, useEffect } from 'react';
import type { FormState } from './types';

const FORM_STATE_KEY = 'addParkFormData';

export const loadSavedState = (): FormState | null => {
  try {
    const saved = localStorage.getItem(FORM_STATE_KEY);
    return saved ? JSON.parse(saved) : null;
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

export const useFormState = (initialState: Partial<FormState> = {}) => {
  const savedState = loadSavedState();

  const [formState, setFormState] = useState<FormState>({
    parkName: savedState?.parkName || initialState.parkName || '',
    parkType: savedState?.parkType || initialState.parkType || '',
    province: savedState?.province || initialState.province || '',
    provinces: savedState?.provinces || initialState.provinces || [],
    latitude: savedState?.latitude || initialState.latitude || '',
    longitude: savedState?.longitude || initialState.longitude || '',
    website: savedState?.website || initialState.website || '',
    accessMethods: savedState?.accessMethods ||
      initialState.accessMethods || ['汽车', '步行', '其他'],
    activationMethods: savedState?.activationMethods ||
      initialState.activationMethods || ['步行', '车载', '其他'],
    confirmed: savedState?.confirmed || initialState.confirmed || false,
    isPotaPark: savedState?.isPotaPark || initialState.isPotaPark || false,
    mapCenter: savedState?.mapCenter || initialState.mapCenter || [39.9042, 116.4074], // 北京
    mapZoom: savedState?.mapZoom || initialState.mapZoom || 13,
  });

  const updateFormState = useCallback((newState: Partial<FormState>) => {
    setFormState((prev) => {
      const updated = { ...prev, ...newState };
      saveFormState(updated);
      return updated;
    });
  }, []);

  const resetFormState = useCallback(() => {
    const defaultState: FormState = {
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
    setFormState(defaultState);
    clearFormState();
  }, []);

  // 自动保存表单状态
  useEffect(() => {
    saveFormState(formState);
  }, [formState]);

  return {
    formState,
    updateFormState,
    resetFormState,
  };
};
