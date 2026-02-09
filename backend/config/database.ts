import pkg from 'pg';
const { Pool } = pkg;
import type { PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pota_park',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
});

// 测试数据库连接
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL 连接成功');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL 连接失败:', (error as Error).message);
    return false;
  }
};

// 是否打印完整 SQL（默认关闭，避免 init-db 输出过大导致“看起来很慢”）
const DB_LOG_SQL = String(process.env.DB_LOG_SQL || '').toLowerCase();
const SHOULD_LOG_SQL = DB_LOG_SQL === '1' || DB_LOG_SQL === 'true' || DB_LOG_SQL === 'yes';

// 执行查询的辅助函数
export const query = async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (SHOULD_LOG_SQL) {
      console.log('📊 查询执行:', { text, duration, rows: result.rowCount });
    } else {
      const firstLine = String(text).trim().split('\n')[0]?.slice(0, 120);
      console.log('📊 查询执行:', { sql: firstLine, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('❌ 查询失败:', {
      text: SHOULD_LOG_SQL ? text : String(text).trim().slice(0, 200),
      error: (error as Error).message,
    });
    throw error;
  }
};

// 获取单个记录
export const getOne = async <T = any>(text: string, params?: any[]): Promise<T | null> => {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
};

// 获取多个记录
export const getMany = async <T = any>(text: string, params?: any[]): Promise<T[]> => {
  const result = await query<T>(text, params);
  return result.rows;
};

// 插入记录并返回插入的记录
export const insert = async <T = any>(text: string, params?: any[]): Promise<T> => {
  const result = await query<T>(text + ' RETURNING *', params);
  return result.rows[0];
};

// 更新记录并返回更新后的记录
export const update = async <T = any>(text: string, params?: any[]): Promise<T> => {
  const result = await query<T>(text + ' RETURNING *', params);
  return result.rows[0];
};

// 删除记录并返回删除的记录
export const deleteRecord = async <T = any>(text: string, params?: any[]): Promise<T> => {
  const result = await query<T>(text + ' RETURNING *', params);
  return result.rows[0];
};

// 事务处理
export const transaction = async <T = any>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 关闭连接池
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('🔌 数据库连接池已关闭');
};

export default pool;
