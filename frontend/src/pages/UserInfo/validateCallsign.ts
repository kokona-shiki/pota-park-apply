// src/pages/UserInfo/validateCallsign.ts

export function validateCallsignInput(
  callsign: string,
  currentCallsign: string | undefined
): { isValid: boolean; errorMessage: string } {
  if (!callsign) {
    return { isValid: false, errorMessage: '呼号不能为空' };
  }

  if (callsign.toUpperCase() === currentCallsign?.toUpperCase()) {
    return { isValid: false, errorMessage: '新呼号不能与当前呼号相同' };
  }

  if (!/^[A-Z0-9]{3,}$/.test(callsign.toUpperCase())) {
    return { isValid: false, errorMessage: '呼号格式不正确，应为字母和数字组合，至少3位' };
  }

  return { isValid: true, errorMessage: '' };
}

export function validateCallsignReason(reason: string): { isValid: boolean; errorMessage: string } {
  if (!reason.trim()) {
    return { isValid: false, errorMessage: '请填写变更原因' };
  }

  return { isValid: true, errorMessage: '' };
}