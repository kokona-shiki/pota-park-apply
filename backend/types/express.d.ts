import { Request } from 'express';

declare global {
  namespace Express {
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
}
