import cron from 'node-cron';
import { autoTriggerPotaImport } from '../services/pota-import/potaImportService.js';

// 定义定时任务
class Scheduler {
  constructor() {
    this.jobs = [];
    this.timezone = 'Asia/Shanghai'; // UTC+8
  }

  /**
   * 初始化所有定时任务
   */
  async init() {
    console.log('🚀 初始化定时任务调度器...');

    // 每天凌晨4点执行POTA公园导入任务 (UTC+8)
    // Cron表达式: 0 4 * * * 表示每天4点0分执行
    const potaImportJob = cron.schedule(
      '0 4 * * *',
      async () => {
        console.log(`🕐 [${new Date().toISOString()}] 开始执行POTA公园自动导入任务`);
        try {
          const results = await autoTriggerPotaImport();

          if (results.error) {
            console.error('❌ POTA公园自动导入任务执行失败:', results.error);
          } else if (results.skipped && results.reason === 'queue_full') {
            console.log('⏸️ POTA公园自动导入任务队列已满，本次跳过');
          } else if (results.queued) {
            console.log('✅ POTA公园自动导入任务已入队:', results.task?.id);
          } else {
            console.log('✅ POTA公园自动导入任务执行完成:', results);
          }
        } catch (error) {
          console.error('🚨 POTA公园自动导入任务发生异常:', error);
        }
      },
      {
        scheduled: true,
        timezone: this.timezone,
        name: 'pota-daily-import',
      }
    );

    // 监听任务事件以获得更多调试信息
    if (potaImportJob.on) {
      potaImportJob.on('scheduled', (date) => {
        console.log(`📅 POTA导入任务下次计划执行时间: ${date}`);
      });

      potaImportJob.on('started', () => {
        console.log('▶️ POTA导入任务开始执行');
      });

      potaImportJob.on('completed', () => {
        console.log('⏹️ POTA导入任务执行完成');
      });
    }

    this.jobs.push({
      name: 'pota-import',
      job: potaImportJob,
      description: '每日凌晨4点自动导入POTA公园数据',
    });

    console.log(`✅ 成功启动 ${this.jobs.length} 个定时任务`);

    // 立即打印下次执行时间
    this.printNextRunTimes();
  }

  /**
   * 打印所有任务的下次执行时间
   */
  printNextRunTimes() {
    console.log('\n📅 定时任务下次执行时间:');
    this.jobs.forEach((jobInfo) => {
      // 根据调试结果显示，当前node-cron版本不支持获取下次执行时间的方法
      // 只显示基本的Cron表达式信息
      console.log(`  ${jobInfo.name}: ${jobInfo.description} (Cron: 0 4 * * *, TZ: Asia/Shanghai)`);
    });
    console.log('');
  }

  /**
   * 手动触发POTA导入任务（用于测试）
   */
  async triggerPotaImportManually() {
    console.log('🕐 手动触发POTA公园导入任务');
    try {
      const results = await autoTriggerPotaImport();

      if (results.error) {
        console.error('❌ POTA公园手动导入任务执行失败:', results.error);
      } else if (results.skipped && results.reason === 'queue_full') {
        console.log('⏸️ POTA公园导入任务队列已满，本次跳过');
      } else if (results.queued) {
        console.log('✅ POTA公园导入任务已入队:', results.task?.id);
      } else {
        console.log('✅ POTA公园手动导入任务执行完成:', results);
      }

      return results;
    } catch (error) {
      console.error('🚨 POTA公园手动导入任务发生异常:', error);
      throw error;
    }
  }

  /**
   * 停止所有定时任务
   */
  stop() {
    console.log('🛑 停止所有定时任务...');
    this.jobs.forEach((jobInfo) => {
      jobInfo.job.stop();
      console.log(`  已停止任务: ${jobInfo.name}`);
    });
    this.jobs = [];
    console.log('✅ 所有定时任务已停止');
  }
}

// 创建调度器实例
const scheduler = new Scheduler();

export default scheduler;
