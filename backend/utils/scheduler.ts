import cron from 'node-cron';
import { autoTriggerPotaImport } from '../services/pota-import/potaImportService.js';

// 定义任务信息接口
interface JobInfo {
  name: string;
  job: cron.ScheduledTask;
  description: string;
}

// 定义定时任务
class Scheduler {
  private jobs: JobInfo[] = [];
  private timezone: string = 'Asia/Shanghai'; // UTC+8

  /**
   * 初始化所有定时任务
   */
  async init(): Promise<void> {
    console.warn('🚀 初始化定时任务调度器...');

    // 每天凌晨4点执行POTA公园导入任务 (UTC+8)
    // Cron表达式: 0 4 * * * 表示每天4点0分执行
    const potaImportJob = cron.schedule(
      '0 4 * * *',
      async () => {
        console.warn(`🕐 [${new Date().toISOString()}] 开始执行POTA公园自动导入任务`);
        try {
          const results = await autoTriggerPotaImport();

          if (results.error) {
            console.error('❌ POTA公园自动导入任务执行失败:', results.error);
          } else if (results.skipped && results.reason === 'queue_full') {
            console.warn('⏸️ POTA公园自动导入任务队列已满，本次跳过');
          } else if (results.queued) {
            console.warn('✅ POTA公园自动导入任务已入队:', results.task?.id);
          } else {
            console.warn('✅ POTA公园自动导入任务执行完成:', results);
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
      potaImportJob.on('scheduled', (date: Date) => {
        console.warn(`📅 POTA导入任务下次计划执行时间: ${date}`);
      });

      potaImportJob.on('started', () => {
        console.warn('▶️ POTA导入任务开始执行');
      });

      potaImportJob.on('completed', () => {
        console.warn('⏹️ POTA导入任务执行完成');
      });
    }

    this.jobs.push({
      name: 'pota-import',
      job: potaImportJob,
      description: '每日凌晨4点自动导入POTA公园数据',
    });

    console.warn(`✅ 成功启动 ${this.jobs.length} 个定时任务`);

    // 立即打印下次执行时间
    this.printNextRunTimes();
  }

  /**
   * 打印所有任务的下次执行时间
   */
  printNextRunTimes(): void {
    console.warn('\n📅 定时任务下次执行时间:');
    this.jobs.forEach((jobInfo) => {
      // 根据调试结果显示，当前node-cron版本不支持获取下次执行时间的方法
      // 只显示基本的Cron表达式信息
      console.warn(`  ${jobInfo.name}: ${jobInfo.description} (Cron: 0 4 * * *, TZ: Asia/Shanghai)`);
    });
    console.warn('');
  }

  /**
   * 手动触发POTA导入任务（用于测试）
   */
  async triggerPotaImportManually(): Promise<ReturnType<typeof autoTriggerPotaImport>> {
    console.warn('🕐 手动触发POTA公园导入任务');
    try {
      const results = await autoTriggerPotaImport();

      if (results.error) {
        console.error('❌ POTA公园手动导入任务执行失败:', results.error);
      } else if (results.skipped && results.reason === 'queue_full') {
        console.warn('⏸️ POTA公园导入任务队列已满，本次跳过');
      } else if (results.queued) {
        console.warn('✅ POTA公园导入任务已入队:', results.task?.id);
      } else {
        console.warn('✅ POTA公园手动导入任务执行完成:', results);
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
  stop(): void {
    console.warn('🛑 停止所有定时任务...');
    this.jobs.forEach((jobInfo) => {
      jobInfo.job.stop();
      console.warn(`  已停止任务: ${jobInfo.name}`);
    });
    this.jobs = [];
    console.warn('✅ 所有定时任务已停止');
  }
}

// 创建调度器实例
const scheduler = new Scheduler();

export default scheduler;