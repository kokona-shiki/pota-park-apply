import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer';
import { getOne, query } from '../config/database.js';

// 扩展类型定义
type TokenResponseData = {
  id_token: string;
  access_token?: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
};

type TokenErrorData = {
  error: string;
  error_description?: string;
};

type PkcePayload = {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
};

type TokenExchangeResult = {
  idToken: string;
  accessToken?: string;
  refreshToken: string;
  expiresIn?: number;
  expiresAt?: Date;
  tokenType?: string;
};

type TokenRefreshResult = {
  idToken: string;
  accessToken?: string;
  refreshToken: string;
  expiresIn?: number;
};

type StoredTokens = {
  idToken: string;
  refreshToken: string;
  expiresAt: Date;
};

type DecodedTokenInfo = {
  userId: string;
  email?: string;
  callsign?: string;
  potaId?: string;
  groups: string[];
  issuedAt: Date;
  expiresAt: Date;
  expiresIn: number;
  isExpired: () => boolean;
  willExpireSoon: (minutes?: number) => boolean;
};

class PotaAuthService {
  private cognitoDomain: string;
  private clientId: string;
  private redirectUri: string;
  private masterEncryptionKey: Buffer;
  private algorithm: string;

  constructor() {
    this.cognitoDomain = 'parksontheair.auth.us-east-2.amazoncognito.com';
    this.clientId = '7hluqct0n2nckib7i7sd5753oa';
    this.redirectUri = 'https://pota.app/';
    // 主加密密钥
    const keyFromEnv = process.env.POTA_ENCRYPTION_KEY;
    if (keyFromEnv) {
      this.masterEncryptionKey = Buffer.from(keyFromEnv, 'hex');
      if (this.masterEncryptionKey.length !== 32) {
        throw new Error('POTA_ENCRYPTION_KEY 必须是 64 个字符的 hex 字符串（32 字节）');
      }
    } else {
      // 开发环境：生成随机密钥
      this.masterEncryptionKey = crypto.randomBytes(32);
      console.warn(
        '⚠️  警告: 未设置 POTA_ENCRYPTION_KEY，使用随机密钥。生产环境必须设置固定密钥！'
      );
    }
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * 为指定用户生成派生密钥
   */
  async generateUserDerivedKey(userId: number, passwordHash: string) {
    // 从数据库获取用户的 POTA 加密盐值
    const userData = await getOne('SELECT pota_encryption_salt FROM users WHERE id = $1', [userId]) as { pota_encryption_salt?: string };

    if (!userData) {
      throw new Error('用户不存在');
    }

    // 如果用户没有加密盐值，则创建一个
    let potaSalt = userData.pota_encryption_salt;
    if (!potaSalt) {
      potaSalt = crypto.randomBytes(32).toString('hex');
      await query('UPDATE users SET pota_encryption_salt = $1 WHERE id = $2', [potaSalt, userId]);
    }

    // 使用 PBKDF2 生成派生密钥
    // 将用户ID、密码哈希和用户特定盐值结合起来
    const saltBuffer = crypto.createHash('sha256').update(`${userId}:${potaSalt}`).digest();

    // 使用 pbkdf2 进行密钥派生
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        passwordHash, // 使用密码哈希作为输入
        saltBuffer, // 使用用户ID和盐值的组合作为salt
        10000, // 迭代次数
        32, // 输出32字节
        'sha256',
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });

    return derivedKey;
  }

  /**
   * 加密数据（针对特定用户）
   */
  async encryptForUser(userId: number, passwordHash: string, text: string) {
    const userKey = await this.generateUserDerivedKey(userId, passwordHash);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, userKey, iv) as crypto.CipherGCM;
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密数据（针对特定用户）
   */
  async decryptForUser(userId: number, passwordHash: string, encrypted: string) {
    const userKey = await this.generateUserDerivedKey(userId, passwordHash);
    const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, userKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * 生成 PKCE 参数
   */
  generatePKCE(): PkcePayload {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const state = crypto.randomBytes(16).toString('hex');

    return {
      codeVerifier,
      codeChallenge,
      state,
    };
  }

  /**
   * 生成授权 URL
   */
  getAuthorizationUrl(pkce: PkcePayload) {
    const params = new URLSearchParams({
      redirect_uri: this.redirectUri,
      response_type: 'code',
      client_id: this.clientId,
      identity_provider: 'COGNITO',
      scope: '',
      state: pkce.state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://${this.cognitoDomain}/oauth2/authorize?${params.toString()}`;
  }

  /**
   * 用授权码交换 token
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenExchangeResult> {
    try {
      const params = this.buildTokenExchangeParams(code, codeVerifier);
      this.logTokenExchangeRequest(code, codeVerifier);
      const response = await this.sendTokenExchangeRequest(params);
      this.validateTokenResponse(response.data);
      return this.buildTokenExchangeResult(response.data);
    } catch (error) {
      this.handleTokenExchangeError(error);
      throw error;
    }
  }

  /**
   * 构建 token 交换参数
   */
  private buildTokenExchangeParams(code: string, codeVerifier: string): URLSearchParams {
    return new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code: code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });
  }

  /**
   * 记录 token 交换请求
   */
  private logTokenExchangeRequest(code: string, codeVerifier: string): void {
    console.warn('Token 交换请求参数:', {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code: code.substring(0, 20) + '...',
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier.substring(0, 20) + '...',
    });
  }

  /**
   * 发送 token 交换请求
   */
  private async sendTokenExchangeRequest(params: URLSearchParams): Promise<{ data: TokenResponseData }> {
    return await axios.post(`https://${this.cognitoDomain}/oauth2/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * 验证 token 响应
   */
  private validateTokenResponse(data: TokenResponseData): void {
    if (!data.id_token) {
      throw new Error('Token 响应中缺少 id_token');
    }
  }

  /**
   * 构建 token 交换结果
   */
  private buildTokenExchangeResult(data: TokenResponseData): TokenExchangeResult {
    return {
      idToken: data.id_token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    };
  }

  /**
   * 处理 token 交换错误
   */
  private handleTokenExchangeError(error: AxiosError): void {
    const errorData = this.getTokenExchangeErrorData(error);
    const errorMessage = this.getTokenExchangeErrorMessage(errorData, error);

    this.logTokenExchangeError(error, errorData, errorMessage);
    this.setTokenExchangeErrorMessage(error, errorData, errorMessage);
  }

  /**
   * 获取 token 交换错误数据
   */
  private getTokenExchangeErrorData(error: AxiosError): TokenErrorData | undefined {
    return error.response?.data as TokenErrorData;
  }

  /**
   * 获取 token 交换错误信息
   */
  private getTokenExchangeErrorMessage(errorData: TokenErrorData | undefined, error: AxiosError): string {
    return errorData?.error_description || errorData?.error || error.message;
  }

  /**
   * 记录 token 交换错误
   */
  private logTokenExchangeError(error: AxiosError, errorData: TokenErrorData | undefined, errorMessage: string): void {
    console.error('Token 交换失败:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: errorData,
      message: errorMessage,
    });
  }

  /**
   * 设置 token 交换错误信息
   */
  private setTokenExchangeErrorMessage(error: AxiosError, errorData: TokenErrorData | undefined, errorMessage: string): void {
    if (error.response?.status === 400) {
      if (errorData?.error === 'invalid_grant') {
        error.message = '授权码无效或已过期，请重新登录';
      } else if (errorData?.error === 'invalid_client') {
        error.message = '客户端认证失败';
      } else {
        error.message = `Token 交换失败: ${errorMessage || '请求参数错误'}`;
      }
    } else {
      error.message = `POTA token 交换失败: ${errorMessage}`;
    }
  }

  /**
   * 使用 refresh token 刷新
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const response = await axios.post(
        `https://${this.cognitoDomain}/oauth2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        idToken: response.data.id_token,
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken, // 如果未启用 rotation，继续使用旧的
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      console.error('刷新 token 失败:', error.response?.data || error.message);
      throw new Error('POTA token 刷新失败，需要重新登录');
    }
  }

  /**
   * 解析 JWT token 获取过期时间
   */
  decodeJWT(token: string): DecodedTokenInfo {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
      const decoded = JSON.parse(payload);

      return {
        userId: decoded.sub,
        email: decoded.email,
        callsign: decoded['pota:callsign'],
        potaId: decoded['pota:id'],
        groups: decoded['cognito:groups'] || [],
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        expiresIn: decoded.exp - decoded.iat,
        isExpired: () => Date.now() >= decoded.exp * 1000,
        willExpireSoon: (minutes = 5) => {
          const expiryTime = decoded.exp * 1000;
          const threshold = Date.now() + minutes * 60 * 1000;
          return expiryTime <= threshold;
        },
      };
    } catch (error) {
      throw new Error(`Failed to decode JWT: ${error.message}`);
    }
  }

  /**
   * 存储 PKCE 参数
   */
  async storePKCE(userId: number, pkce: PkcePayload) {
    await query(
      `INSERT INTO pota_pkce (user_id, code_verifier, state)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET code_verifier = $2, state = $3, created_at = CURRENT_TIMESTAMP`,
      [userId, pkce.codeVerifier, pkce.state]
    );
  }

  /**
   * 获取 PKCE 参数
   */
  async getPKCE(userId: number, state: string) {
    return await getOne('SELECT code_verifier FROM pota_pkce WHERE user_id = $1 AND state = $2', [
      userId,
      state,
    ]);
  }

  /**
   * 清除 PKCE 参数
   */
  async clearPKCE(userId: number) {
    await query('DELETE FROM pota_pkce WHERE user_id = $1', [userId]);
  }

  /**
   * 存储 token
   */
  async storeTokens(userId: number, tokens: TokenExchangeResult, passwordHash: string) {
    const expiresAt =
      tokens.expiresAt ?? (tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null);
    await query(
      `INSERT INTO pota_tokens (user_id, id_token_encrypted, access_token_encrypted, refresh_token_encrypted, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         id_token_encrypted = $2,
         access_token_encrypted = $3,
         refresh_token_encrypted = $4,
         expires_at = $5,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        await this.encryptForUser(userId, passwordHash, tokens.idToken),
        tokens.accessToken
          ? await this.encryptForUser(userId, passwordHash, tokens.accessToken)
          : null,
        await this.encryptForUser(userId, passwordHash, tokens.refreshToken),
        expiresAt,
      ]
    );
  }

  /**
   * 获取存储的 token
   */
  async getStoredTokens(userId: number, passwordHash: string): Promise<StoredTokens | null> {
    const stored = await getOne(
      'SELECT id_token_encrypted, refresh_token_encrypted, expires_at FROM pota_tokens WHERE user_id = $1',
      [userId]
    ) as {
      id_token_encrypted: string;
      refresh_token_encrypted: string;
      expires_at: string;
    };

    if (!stored) return null;

    try {
      return {
        idToken: await this.decryptForUser(userId, passwordHash, stored.id_token_encrypted),
        refreshToken: await this.decryptForUser(
          userId,
          passwordHash,
          stored.refresh_token_encrypted
        ),
        expiresAt: new Date(stored.expires_at),
      };
    } catch (error) {
      console.error('解密 POTA token 失败:', error.message);
      // 解密失败通常意味着加密密钥已更改，清除损坏的记录
      await query('DELETE FROM pota_tokens WHERE user_id = $1', [userId]);
      return null;
    }
  }

  /**
   * 获取有效的 token（自动刷新）
   */
  async getValidToken(userId: number, passwordHash: string) {
    const stored = await this.getStoredTokens(userId, passwordHash);

    if (!stored) {
      throw new Error('未找到 POTA token，请先登录');
    }

    const tokenInfo = this.decodeJWT(stored.idToken);

    // 如果快过期（提前5分钟）且有 refresh token，尝试刷新
    if (tokenInfo.willExpireSoon(5) && stored.refreshToken) {
      try {
        const refreshed = await this.refreshToken(stored.refreshToken);
        const newTokenInfo = this.decodeJWT(refreshed.idToken);

        // 更新存储
        await this.storeTokens(
          userId,
          {
            idToken: refreshed.idToken,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: newTokenInfo.expiresAt,
          },
          passwordHash
        );

        return refreshed.idToken;
      } catch (refreshError) {
        console.error('刷新 POTA token 失败:', refreshError);
        // 刷新失败，清除存储的 token
        await query('DELETE FROM pota_tokens WHERE user_id = $1', [userId]);
        throw new Error('POTA token 已过期且刷新失败，请重新登录');
      }
    }

    // Token 仍然有效
    return stored.idToken;
  }

  /**
   * 删除 token
   */
  async deleteTokens(userId: number) {
    await query('DELETE FROM pota_tokens WHERE user_id = $1', [userId]);
  }

  /**
   * 调用 POTA 登出接口
   * 使用 Puppeteer 确保 Cookie 正确传递
   */
  async logoutFromPota() {
    let browser = null;
    let page = null;

    try {
      const logoutUrl = `https://${this.cognitoDomain}/logout?client_id=${
        this.clientId
      }&logout_uri=${encodeURIComponent(this.redirectUri)}`;

      console.warn('开始调用 POTA 登出接口:', logoutUrl);

      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      page = await browser.newPage();

      // 设置 User-Agent
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
      );

      // 访问登出 URL，允许重定向
      const response = await page.goto(logoutUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // 等待一下确保登出完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 检查最终 URL（应该重定向到 pota.app）
      const finalUrl = page.url();
      console.warn('POTA 登出完成，最终 URL:', finalUrl);

      // 如果重定向到了 pota.app，说明登出成功
      if (
        finalUrl.includes('pota.app') ||
        (response && response.status() >= 200 && response.status() < 400)
      ) {
        console.warn('POTA 登出成功');
        return true;
      } else {
        console.warn('POTA 登出响应状态异常:', response?.status(), '最终 URL:', finalUrl);
        // 即使状态码异常，如果重定向了也认为成功
        return finalUrl.includes('pota.app');
      }
    } catch (error) {
      console.error('POTA 登出失败:', error);
      // 登出失败不应该阻止本地 token 清除
      return false;
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * 生成 Cognito ASF Data（高级安全功能数据）
   */
  generateCognitoAsfData(username: string) {
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
    const deviceId = `az3dtn1jjy0e9omv3z8j:${Date.now()}`;
    const timestamp = Date.now().toString();

    const payload = {
      contextData: {
        UserAgent: userAgent,
        DeviceId: deviceId,
        DeviceLanguage: 'zh-CN',
        DeviceFingerprint:
          userAgent +
          'PDF Viewer:Chrome PDF Viewer:Chrome PDF Viewer:Chrome PDF Viewer:Microsoft Edge PDF Viewer:WebKit built-in PDF:zh-CN',
        DevicePlatform: 'MacIntel',
        ClientTimezone: '08:00',
      },
      username: username,
      userPoolId: '',
      timestamp: timestamp,
    };

    // 注意：实际签名需要 Cognito 的密钥，但我们可以使用一个占位签名
    // 从日志看，这个签名可能不是必需的，或者 Cognito 会忽略无效签名
    const signature = 'Gd7bGIny4P/6BHTPzMCQan0f90QSSOuxC8rMYlLY6fA=';

    const asfData = {
      payload: JSON.stringify(payload),
      signature: signature,
      version: 'JS20171115',
    };

    return Buffer.from(JSON.stringify(asfData)).toString('base64');
  }

  /**
   * 使用 Puppeteer 进行 POTA 登录（用户提供账号密码）
   */
  async loginWithCredentials(username: string, password: string) {
    let browser = null;
    let page = null;

    try {
      const pkce = this.generatePKCE();
      const authUrl = this.getAuthorizationUrl(pkce);

      browser = await this.launchBrowser();
      page = await browser.newPage();
      await this.setupBrowserPage(page);

      await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.waitForLoginForm(page);

      const csrfToken = await this.getCsrfToken(page);
      const cognitoAsfData = this.generateCognitoAsfData(username);

      await this.fillLoginForm(page, username, password);
      await this.submitLoginForm(page, csrfToken, cognitoAsfData);

      const currentUrl = await this.waitForRedirect(page);
      const loginResult = await this.handleLoginRedirect(currentUrl, pkce);

      // Token 交换成功后，立即关闭浏览器
      await this.closeBrowser(browser, page);
      browser = null;
      page = null;

      console.warn('Token 交换成功');

      return loginResult;
    } catch (error) {
      this.handleLoginError(error);
      throw error;
    } finally {
      await this.closeBrowser(browser, page);
    }
  }

  /**
   * 启动浏览器
   */
  private async launchBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  }

  /**
   * 设置浏览器页面
   */
  private async setupBrowserPage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
    );
  }

  /**
   * 等待登录表单加载
   */
  private async waitForLoginForm(page: Page): Promise<void> {
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  }

  /**
   * 获取 CSRF token
   */
  private async getCsrfToken(page: Page): Promise<string> {
    // 从 Cookie 中获取
    let csrfToken = await this.getCsrfTokenFromCookies(page);
    
    // 如果 Cookie 中没有，尝试从页面中获取
    if (!csrfToken) {
      csrfToken = await this.getCsrfTokenFromPage(page);
    }

    // 如果仍然没有，等待一下再试
    if (!csrfToken) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      csrfToken = await this.getCsrfTokenFromCookies(page);
    }

    if (!csrfToken) {
      throw new Error('无法获取 CSRF token，请检查登录页面是否正常加载');
    }

    return csrfToken;
  }

  /**
   * 从 Cookie 中获取 CSRF token
   */
  private async getCsrfTokenFromCookies(page: Page): Promise<string | null> {
    const cookies = await page.cookies();
    for (const cookie of cookies) {
      if (cookie.name === 'XSRF-TOKEN') {
        return cookie.value;
      }
    }
    return null;
  }

  /**
   * 从页面中获取 CSRF token
   */
  private async getCsrfTokenFromPage(page: Page): Promise<string | null> {
    return await page.evaluate(() => {
      const csrfInput = document.querySelector('input[name="_csrf"]') as HTMLInputElement | null;
      return csrfInput ? csrfInput.value : null;
    });
  }

  /**
   * 填写登录表单
   */
  private async fillLoginForm(page: Page, username: string, password: string): Promise<void> {
    await page.type('input[name="username"]', username, { delay: 50 });
    await page.type('input[name="password"]', password, { delay: 50 });
  }

  /**
   * 提交登录表单
   */
  private async submitLoginForm(page: Page, csrfToken: string, cognitoAsfData: string): Promise<void> {
    await page.evaluate(
      (csrf, asfData) => {
        const form = document.querySelector('form');
        if (!form) {
          throw new Error('找不到登录表单');
        }

        // 检查是否已有 _csrf 字段
        let csrfInput = form.querySelector('input[name="_csrf"]') as HTMLInputElement | null;
        if (!csrfInput) {
          csrfInput = document.createElement('input') as HTMLInputElement;
          csrfInput.type = 'hidden';
          csrfInput.name = '_csrf';
          form.appendChild(csrfInput);
        }
        csrfInput.value = csrf;

        // 检查是否已有 cognitoAsfData 字段
        let asfInput = form.querySelector('input[name="cognitoAsfData"]') as HTMLInputElement | null;
        if (!asfInput) {
          asfInput = document.createElement('input') as HTMLInputElement;
          asfInput.type = 'hidden';
          asfInput.name = 'cognitoAsfData';
          form.appendChild(asfInput);
        }
        asfInput.value = asfData;

        form.submit();
      },
      csrfToken,
      cognitoAsfData
    );
  }

  /**
   * 等待重定向
   */
  private async waitForRedirect(page: Page): Promise<string> {
    const startTime = Date.now();
    const maxWaitTime = 30000; // 最多等待 30 秒
    const checkInterval = 500; // 每 500ms 检查一次

    try {
      // 先尝试等待导航
      await page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: maxWaitTime,
      });
      const currentUrl = page.url();
      const elapsedTime = Date.now() - startTime;
      console.warn(`重定向完成，耗时: ${elapsedTime}ms`);
      console.warn('登录后重定向 URL:', currentUrl);
      return currentUrl;
    } catch {
      // 如果导航超时，轮询检查 URL
      return await this.pollForRedirect(page, maxWaitTime, checkInterval);
    }
  }

  /**
   * 轮询检查 URL 变化
   */
  private async pollForRedirect(page: Page, maxWaitTime: number, checkInterval: number): Promise<string> {
    console.warn('等待导航超时，开始轮询检查 URL...');
    let waited = 0;
    while (waited < maxWaitTime) {
      const currentUrl = page.url();
      if (
        currentUrl.includes('pota.app') ||
        currentUrl.includes('code=') ||
        currentUrl.includes('error=')
      ) {
        console.warn('通过轮询检测到 URL 变化:', currentUrl);
        return currentUrl;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    const currentUrl = page.url();
    throw new Error(`等待重定向超时，当前 URL: ${currentUrl}`);
  }

  /**
   * 处理登录重定向
   */
  private async handleLoginRedirect(currentUrl: string, pkce: PkcePayload): Promise<{ tokens: TokenExchangeResult, pkce: PkcePayload }> {
    const url = new URL(currentUrl);

    // 如果重定向到了 pota.app，提取授权码
    if (url.hostname === 'pota.app' || url.hostname.includes('pota.app')) {
      return await this.handleSuccessfulRedirect(url, pkce);
    } else {
      return await this.handleUnsuccessfulRedirect(url);
    }
  }

  /**
   * 处理成功的重定向
   */
  private async handleSuccessfulRedirect(url: URL, pkce: PkcePayload): Promise<{ tokens: TokenExchangeResult, pkce: PkcePayload }> {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // 检查是否有错误
    if (error) {
      throw new Error(
        `OAuth 错误: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`
      );
    }

    if (!code) {
      throw new Error('未获取到授权码');
    }

    if (state !== pkce.state) {
      console.error('State 不匹配:', { expected: pkce.state, received: state });
      throw new Error('State 验证失败，可能存在安全风险');
    }

    console.warn('获取到授权码，立即开始交换 token（授权码有效期很短）...');

    // 验证 code_verifier 和 code_challenge 匹配（用于调试）
    this.verifyPkceChallenge(pkce);

    // 立即用授权码交换 token，不要有任何延迟（授权码有效期很短）
    const tokens = await this.exchangeCodeForToken(code, pkce.codeVerifier);

    return {
      tokens,
      pkce,
    };
  }

  /**
   * 验证 PKCE challenge
   */
  private verifyPkceChallenge(pkce: PkcePayload): void {
    const verifyChallenge = crypto
      .createHash('sha256')
      .update(pkce.codeVerifier)
      .digest('base64url');
    if (verifyChallenge !== pkce.codeChallenge) {
      console.error('PKCE 验证失败:', {
        expected: pkce.codeChallenge,
        actual: verifyChallenge,
      });
      throw new Error('PKCE code_verifier 和 code_challenge 不匹配');
    }
    console.warn('PKCE 验证通过');
  }

  /**
   * 处理不成功的重定向
   */
  private async handleUnsuccessfulRedirect(url: URL): Promise<never> {
    // 这里需要 page 对象来获取错误信息，暂时简化处理
    throw new Error(`登录后未重定向到预期页面，当前 URL: ${url.toString()}`);
  }

  /**
   * 关闭浏览器
   */
  private async closeBrowser(browser: Browser | null, page: Page | null): Promise<void> {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  /**
   * 处理登录错误
   */
  private handleLoginError(error: Error): void {
    console.error('Puppeteer 登录失败:', error);
    if (error.message) {
      error.message = `POTA 登录失败: ${error.message}`;
    }
  }
}

export default new PotaAuthService();
