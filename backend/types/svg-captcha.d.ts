declare module 'svg-captcha' {
  interface CaptchaOptions {
    size?: number;
    ignoreChars?: string;
    noise?: number;
    color?: boolean;
    background?: string;
    width?: number;
    height?: number;
    fontSize?: number;
    charPreset?: string;
  }

  interface CaptchaResult {
    text: string;
    data: string;
  }

  export default function create(options?: CaptchaOptions): CaptchaResult;
}
