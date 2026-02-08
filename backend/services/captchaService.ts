import svgCaptcha from 'svg-captcha';

type CaptchaData = {
  id: string;
  svg: string;
  text: string;
};

const captchaStore = new Map<string, { text: string; expiresAt: number }>();
const CAPTCHA_EXPIRES_MS = 5 * 60 * 1000;

const generateCaptchaId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const generateCaptcha = (): CaptchaData => {
  const captcha = svgCaptcha({
    size: 4,
    ignoreChars: '0o1iIl',
    noise: 2,
    color: true,
    background: '#f8f9fa',
    width: 120,
    height: 40,
    fontSize: 36,
  });

  const id = generateCaptchaId();
  const expiresAt = Date.now() + CAPTCHA_EXPIRES_MS;

  captchaStore.set(id, {
    text: captcha.text.toLowerCase(),
    expiresAt,
  });

  return {
    id,
    svg: captcha.data,
    text: captcha.text,
  };
};

export const verifyCaptcha = (id: string, userInput: string): boolean => {
  const captcha = captchaStore.get(id);

  if (!captcha) {
    return false;
  }

  if (Date.now() > captcha.expiresAt) {
    captchaStore.delete(id);
    return false;
  }

  const isValid = userInput.toLowerCase() === captcha.text;

  if (isValid) {
    captchaStore.delete(id);
  }

  return isValid;
};

export const cleanupExpiredCaptchas = (): void => {
  const now = Date.now();
  for (const [id, captcha] of captchaStore.entries()) {
    if (now > captcha.expiresAt) {
      captchaStore.delete(id);
    }
  }
};

setInterval(cleanupExpiredCaptchas, 60 * 1000);
