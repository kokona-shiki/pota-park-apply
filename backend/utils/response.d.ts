import { Response } from 'express';

export function sendOk(res: Response, data?: any, message?: string): Response;

export function sendBizError(res: Response, code?: string, message?: string, data?: any): Response;

export function sendHttpError(res: Response, status?: number, code?: string, message?: string, data?: any): Response;

export function sendError(
  res: Response,
  err: any,
  options?: {
    bizCode?: string;
    bizMessage?: string;
    httpCode?: string;
    httpMessage?: string;
  }
): Response;
