import { insert, getOne, query, update } from '../config/database.js';
import { sendVerificationEmail } from './emailService.js';

const CODE_EXPIRES_MINUTES = 30;
const MAX_ATTEMPTS = 5;
const SEND_COOLDOWN_SECONDS = 60;

const generateCode = (): string => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
};

export const createVerificationToken = async (email: string, callsign?: string): Promise<string> => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);

  await insert(
    `
    INSERT INTO email_verification_tokens (email, code, expires_at)
    VALUES ($1, $2, $3)
  `,
    [email, code, expiresAt]
  );

  await sendVerificationEmail({ email, code, callsign });

  return code;
};

export const verifyEmailCode = async (email: string, code: string): Promise<boolean> => {
  const token = await getOne(
    `
    SELECT * FROM email_verification_tokens
    WHERE email = $1 AND code = $2 AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [email, code]
  );

  if (!token) {
    return false;
  }

  if (new Date(token.expires_at) < new Date()) {
    return false;
  }

  if (token.attempts >= MAX_ATTEMPTS) {
    return false;
  }

  await update(
    `
    UPDATE email_verification_tokens
    SET verified_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `,
    [token.id]
  );

  return true;
};

export const checkEmailVerified = async (email: string): Promise<boolean> => {
  const token = await getOne(
    `
    SELECT verified_at FROM email_verification_tokens
    WHERE email = $1 AND verified_at IS NOT NULL
    ORDER BY verified_at DESC
    LIMIT 1
  `,
    [email]
  );

  return !!token;
};

export const incrementAttempt = async (email: string): Promise<void> => {
  await query(
    `
    UPDATE email_verification_tokens
    SET attempts = attempts + 1
    WHERE email = $1 AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [email]
  );
};

export const checkSendCooldown = async (email: string): Promise<boolean> => {
  const lastToken = await getOne(
    `
    SELECT created_at FROM email_verification_tokens
    WHERE email = $1
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [email]
  );

  if (!lastToken) {
    return false;
  }

  const secondsSinceLastSend = (Date.now() - new Date(lastToken.created_at).getTime()) / 1000;
  return secondsSinceLastSend < SEND_COOLDOWN_SECONDS;
};

export const getRemainingCooldown = async (email: string): Promise<number> => {
  const lastToken = await getOne(
    `
    SELECT created_at FROM email_verification_tokens
    WHERE email = $1
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [email]
  );

  if (!lastToken) {
    return 0;
  }

  const secondsSinceLastSend = (Date.now() - new Date(lastToken.created_at).getTime()) / 1000;
  const remaining = Math.max(0, SEND_COOLDOWN_SECONDS - secondsSinceLastSend);
  return Math.ceil(remaining);
};

export const cleanupExpiredTokens = async (): Promise<void> => {
  await query(
    `
    DELETE FROM email_verification_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
  `
  );
};
