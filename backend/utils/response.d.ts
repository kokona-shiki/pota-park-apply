import { Response } from 'express';

export function sendOk(res: Response, data?: unknown, message?: string): Response;

export function sendBizError(res: Response, code?: string, message?: string, data?: unknown): Response;

export function sendHttpError(res: Response, status?: number, code?: string, message?: string, data?: unknown): Response;

export function sendError(
  res: Response,
  err: unknown,
  options?: {
    bizCode?: string;
    bizMessage?: string;
    httpCode?: string;
    httpMessage?: string;
  }
): Response;
