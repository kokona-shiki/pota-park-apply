import nodemailer from 'nodemailer';

type EmailVerificationData = {
  email: string;
  code: string;
  callsign?: string;
};

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('SMTP 配置不完整，请检查环境变量');
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
};

const generateEmailTemplate = (data: EmailVerificationData): string => {
  const { email, code, callsign } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>验证您的 POTA 中国公园录入系统账号</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #555;
        }
        .code-container {
          background-color: #f8f9fa;
          border: 2px dashed #667eea;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .code {
          font-size: 36px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 8px;
          font-family: 'Courier New', monospace;
        }
        .info {
          color: #666;
          font-size: 14px;
          margin-top: 20px;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #e9ecef;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 邮箱验证</h1>
        </div>
        <div class="content">
          <p class="greeting">
            ${callsign ? `尊敬的 <strong>${callsign}</strong>，` : '您好，'}
          </p>
          <p>感谢您注册 <strong>POTA 中国公园录入系统</strong>！</p>
          
          <div class="code-container">
            <div class="code">${code}</div>
          </div>
          
          <p>您的邮箱验证码如上所示，请在注册页面输入该验证码以完成注册。</p>
          
          <div class="info">
            <p>✅ 验证码有效期为 <strong>30 分钟</strong></p>
            <p>🔒 请勿将验证码透露给他人</p>
          </div>
          
          <div class="warning">
            ⚠️ 如果这不是您的操作，请忽略此邮件。您的账号安全不会受到影响。
          </div>
        </div>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>&copy; ${new Date().getFullYear()} POTA 中国公园录入系统. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendVerificationEmail = async (data: EmailVerificationData): Promise<void> => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `"POTA 中国公园录入系统" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: '验证您的 POTA 中国公园录入系统账号',
      html: generateEmailTemplate(data),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ 验证邮件已发送至: ${data.email}`);
  } catch (error) {
    console.error('❌ 发送验证邮件失败:', error);
    throw new Error('发送验证邮件失败，请稍后重试');
  }
};

export const testEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ SMTP 连接测试成功');
    return true;
  } catch (error) {
    console.error('❌ SMTP 连接测试失败:', error);
    return false;
  }
};
