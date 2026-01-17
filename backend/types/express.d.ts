import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      email?: string | null;
      role?: string | null;
      permissions?: string[];
      hasPotaImportPermission?: boolean;
    };
  }
}
