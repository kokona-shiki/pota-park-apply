import { z } from 'zod';

export const parseJsonWithSchema = <T>(schema: z.ZodType<T>, raw: string): T => {
  // eslint-disable-next-line no-restricted-properties
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error('JSON 数据校验失败');
  }
  return parsed.data;
};

export const safeParseJsonWithSchema = <T>(schema: z.ZodType<T>, raw: string): T | null => {
  try {
    return parseJsonWithSchema(schema, raw);
  } catch {
    return null;
  }
};

export const safeParseJson = <T>(raw: string, validator: (data: unknown) => data is T): T | null => {
  try {
    // eslint-disable-next-line no-restricted-properties
    const parsed = JSON.parse(raw);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
