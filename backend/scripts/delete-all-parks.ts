#!/usr/bin/env node

/**
 * 临时脚本：删除系统中的所有公园数据
 * 仅用于开发调试目的
 */

import { Pool, PoolClient, QueryResult } from 'pg';
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

// 定义数据计数接口
interface DataCounts {
  parkCount: number;
  unprocessedCount: number;
  syncLogsCount: number;
  reviewRemindersCount: number;
  auditLogsCount: number;
}

// 获取当前数据量
async function getCurrentDataCounts(client: PoolClient): Promise<DataCounts> {
  const parkCountResult: QueryResult<{ count: string }> = await client.query(`SELECT COUNT(*) as count FROM park_applications`);
  const parkCount = parseInt(parkCountResult.rows[0].count);

  const unprocessedCountResult: QueryResult<{ count: string }> = await client.query(`SELECT COUNT(*) as count FROM pota_unprocessed_parks`);
  const unprocessedCount = parseInt(unprocessedCountResult.rows[0].count);

  const syncLogsCountResult: QueryResult<{ count: string }> = await client.query(`SELECT COUNT(*) as count FROM pota_sync_logs`);
  const syncLogsCount = parseInt(syncLogsCountResult.rows[0].count);

  const reviewRemindersCountResult: QueryResult<{ count: string }> = await client.query(`SELECT COUNT(*) as count FROM review_reminders`);
  const reviewRemindersCount = parseInt(reviewRemindersCountResult.rows[0].count);

  const auditLogsCountResult: QueryResult<{ count: string }> = await client.query(`SELECT COUNT(*) as count FROM application_audit_logs`);
  const auditLogsCount = parseInt(auditLogsCountResult.rows[0].count);

  return {
    parkCount,
    unprocessedCount,
    syncLogsCount,
    reviewRemindersCount,
    auditLogsCount
  };
}

// 确认删除操作
async function confirmDeletion(): Promise<void> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer: string = await new Promise((resolve) => {
    rl.question('请输入 "DELETE_ALL_PARKS" 以确认删除所有公园数据: ', (input) => {
      resolve(input.trim());
      rl.close();
    });
  });

  if (answer !== 'DELETE_ALL_PARKS') {
    console.warn('❌ 输入不匹配，取消删除操作。');
    await pool.end();
    process.exit(1);
  }
}

// 删除数据
async function deleteData(client: PoolClient, counts: DataCounts): Promise<void> {
  // 删除审核提醒（外键关联到 park_applications）
  if (counts.reviewRemindersCount > 0) {
    console.warn('   正在删除审核提醒...');
    const deleteRemindersResult = await client.query(
      'DELETE FROM review_reminders WHERE application_id IN (SELECT id FROM park_applications) RETURNING id'
    );
    console.warn(`   ✅ 删除了 ${deleteRemindersResult.rows.length} 条审核提醒`);
  }

  // 删除审核日志（外键关联到 park_applications）
  if (counts.auditLogsCount > 0) {
    console.warn('   正在删除审核日志...');
    const deleteAuditResult = await client.query(
      'DELETE FROM application_audit_logs WHERE application_id IN (SELECT id FROM park_applications) RETURNING id'
    );
    console.warn(`   ✅ 删除了 ${deleteAuditResult.rows.length} 条审核日志`);
  }

  // 删除公园申请
  if (counts.parkCount > 0) {
    console.warn('   正在删除公园申请...');
    const deleteResult = await client.query('DELETE FROM park_applications RETURNING id');
    console.warn(`   ✅ 删除了 ${deleteResult.rows.length} 个公园申请`);
  }

  // 删除未处理的公园
  if (counts.unprocessedCount > 0) {
    console.warn('   正在删除未处理的公园...');
    const deleteUnprocessedResult = await client.query('DELETE FROM pota_unprocessed_parks RETURNING reference');
    console.warn(`   ✅ 删除了 ${deleteUnprocessedResult.rows.length} 个未处理的公园`);
  }

  // 删除 POTA 同步日志
  if (counts.syncLogsCount > 0) {
    console.warn('   正在删除 POTA 同步日志...');
    const deleteSyncLogsResult = await client.query('DELETE FROM pota_sync_logs RETURNING id');
    console.warn(`   ✅ 删除了 ${deleteSyncLogsResult.rows.length} 条 POTA 同步日志`);
  }
}

// 验证删除结果
async function verifyDeletion(client: PoolClient): Promise<void> {
  const verifyParkResult: QueryResult<{ count: string }> = await client.query('SELECT COUNT(*) as count FROM park_applications');
  const verifyParkCount = parseInt(verifyParkResult.rows[0].count);

  const verifyUnprocessedResult: QueryResult<{ count: string }> = await client.query('SELECT COUNT(*) as count FROM pota_unprocessed_parks');
  const verifyUnprocessedCount = parseInt(verifyUnprocessedResult.rows[0].count);

  const verifySyncLogsResult: QueryResult<{ count: string }> = await client.query('SELECT COUNT(*) as count FROM pota_sync_logs');
  const verifySyncLogsCount = parseInt(verifySyncLogsResult.rows[0].count);

  const verifyRemindersResult: QueryResult<{ count: string }> = await client.query('SELECT COUNT(*) as count FROM review_reminders');
  const verifyRemindersCount = parseInt(verifyRemindersResult.rows[0].count);

  const verifyAuditResult: QueryResult<{ count: string }> = await client.query('SELECT COUNT(*) as count FROM application_audit_logs');
  const verifyAuditCount = parseInt(verifyAuditResult.rows[0].count);

  console.warn(`✅ 删除后剩余数据:`);
  console.warn(`   - 公园申请: ${verifyParkCount}`);
  console.warn(`   - 未处理的公园: ${verifyUnprocessedCount}`);
  console.warn(`   - POTA 同步日志: ${verifySyncLogsCount}`);
  console.warn(`   - 审核提醒: ${verifyRemindersCount}`);
  console.warn(`   - 审核日志: ${verifyAuditCount}`);
}

async function deleteAllParks(): Promise<void> {
  console.warn('⚠️  警告：此脚本将删除系统中的所有公园数据！');
  console.warn('⚠️  此操作不可逆，请确认您了解后果。');
  console.warn('');

  try {
    const client = await pool.connect();

    // 先查询当前数据量
    console.warn('🔍 正在获取当前数据量...');
    const counts = await getCurrentDataCounts(client);

    console.warn(`📊 当前系统中有:`);
    console.warn(`   - ${counts.parkCount} 个公园申请`);
    console.warn(`   - ${counts.unprocessedCount} 个未处理的公园`);
    console.warn(`   - ${counts.syncLogsCount} 条 POTA 同步日志`);
    console.warn(`   - ${counts.reviewRemindersCount} 条审核提醒`);
    console.warn(`   - ${counts.auditLogsCount} 条审核日志`);
    console.warn('');

    if (counts.parkCount === 0 && counts.unprocessedCount === 0 && counts.syncLogsCount === 0 && counts.reviewRemindersCount === 0 && counts.auditLogsCount === 0) {
      console.warn('✅ 系统中没有公园相关数据，无需删除。');
      client.release();
      await pool.end();
      return;
    }

    // 确认操作
    await confirmDeletion();

    console.warn('');
    console.warn('🗑️  开始删除数据...');

    // 删除数据
    await deleteData(client, counts);

    console.warn('');
    console.warn('🔍 验证删除结果...');

    // 验证删除结果
    await verifyDeletion(client);

    client.release();
    console.warn('');
    console.warn('🎉 所有公园相关数据已成功删除！');
  } catch (error) {
    console.error('❌ 删除过程中发生错误:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await pool.end();
  }
}

// 执行删除操作
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  deleteAllParks()
    .then(() => {
      console.warn('');
      console.warn('✅ 脚本执行完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('❌ 脚本执行失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}

export { deleteAllParks };