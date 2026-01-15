#!/usr/bin/env node

/**
 * 临时脚本：删除系统中的所有公园数据
 * 仅用于开发调试目的
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.resolve(__dirname, '../../.env') });

// 创建数据库连接池
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pota_park_dev',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function deleteAllParks() {
  console.log('⚠️  警告：此脚本将删除系统中的所有公园数据！');
  console.log('⚠️  此操作不可逆，请确认您了解后果。');
  console.log('');

  // 确认操作
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question('请输入 "DELETE_ALL_PARKS" 以确认删除所有公园数据: ', (input) => {
      resolve(input.trim());
      rl.close();
    });
  });

  if (answer !== 'DELETE_ALL_PARKS') {
    console.log('❌ 输入不匹配，取消删除操作。');
    process.exit(1);
  }

  console.log('');
  console.log('🔍 正在获取当前公园数量...');

  try {
    const client = await pool.connect();

    // 查询当前公园数量
    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM park_applications
    `);
    const parkCount = parseInt(countResult.rows[0].count);

    // 查询未处理的公园数量
    const unprocessedCountResult = await client.query(`
      SELECT COUNT(*) as count FROM pota_unprocessed_parks
    `);
    const unprocessedCount = parseInt(unprocessedCountResult.rows[0].count);

    console.log(`📊 当前系统中有 ${parkCount} 个公园记录，${unprocessedCount} 个未处理的公园。`);

    if (parkCount === 0 && unprocessedCount === 0) {
      console.log('✅ 系统中没有公园数据，无需删除。');
      return;
    }

    // 删除审核日志（外键关联）
    console.log('🗑️  正在删除相关审核日志...');
    await client.query(
      'DELETE FROM application_audit_logs WHERE application_id IN (SELECT id FROM park_applications)'
    );

    // 删除公园申请
    console.log('🗑️  正在删除所有公园申请...');
    const deleteResult = await client.query('DELETE FROM park_applications RETURNING id');

    // 删除未处理的公园
    console.log('🗑️  正在删除所有未处理的公园...');
    const deleteUnprocessedResult = await client.query('DELETE FROM pota_unprocessed_parks RETURNING reference');

    console.log(`✅ 成功删除 ${deleteResult.rows.length} 个公园申请及其相关审核日志，${deleteUnprocessedResult.rows.length} 个未处理的公园。`);

    // 验证删除结果
    const verifyResult = await client.query('SELECT COUNT(*) as count FROM park_applications');
    const remainingCount = parseInt(verifyResult.rows[0].count);
    const verifyUnprocessedResult = await client.query('SELECT COUNT(*) as count FROM pota_unprocessed_parks');
    const remainingUnprocessedCount = parseInt(verifyUnprocessedResult.rows[0].count);
    console.log(`✅ 删除后剩余公园数量: ${remainingCount}，剩余未处理公园数量: ${remainingUnprocessedCount}`);

    client.release();
    console.log('');
    console.log('🎉 所有公园数据已成功删除！');
  } catch (error) {
    console.error('❌ 删除过程中发生错误:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 执行删除操作
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  deleteAllParks()
    .then(() => {
      console.log('');
      console.log('✅ 脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('❌ 脚本执行失败:', error.message);
      process.exit(1);
    });
}

export { deleteAllParks };
