import { query } from '../config/database.js';

export const up = async () => {
  console.log('🚀 开始迁移：创建邮箱验证码表...');

  await query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      verified_at TIMESTAMP WITH TIME ZONE,
      attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id 
    ON email_verification_tokens(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email 
    ON email_verification_tokens(email)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_code 
    ON email_verification_tokens(code)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at 
    ON email_verification_tokens(expires_at)
  `);

  await query(`
    INSERT INTO app_meta (key, value)
    VALUES ('schema_version', '12')
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
  `);

  console.log('✅ 迁移完成：邮箱验证码表创建成功');
};

export const down = async () => {
  console.log('🔄 回滚迁移：删除邮箱验证码表...');

  await query(`DROP INDEX IF EXISTS idx_email_verification_tokens_expires_at`);
  await query(`DROP INDEX IF EXISTS idx_email_verification_tokens_code`);
  await query(`DROP INDEX IF EXISTS idx_email_verification_tokens_email`);
  await query(`DROP INDEX IF EXISTS idx_email_verification_tokens_user_id`);
  await query(`DROP TABLE IF EXISTS email_verification_tokens`);

  await query(`
    INSERT INTO app_meta (key, value)
    VALUES ('schema_version', '11')
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
  `);

  console.log('✅ 回滚完成：邮箱验证码表已删除');
};
