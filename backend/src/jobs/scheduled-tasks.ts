import cron from 'node-cron';
import { supabase } from '../config';
import { CalculationService } from './calculation.service';
import { DatabaseService, VehicleService } from './database.service';
import winston from 'winston';

// 日志记录
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/cron.log' }),
  ],
});

// 定时任务状态
interface TaskStatus {
  name: string;
  lastRun: Date | null;
  nextRun: Date | null;
  isRunning: boolean;
  status: 'idle' | 'running' | 'error';
}

const taskStatus: Map<string, TaskStatus> = new Map();

// 定时任务服务
export class ScheduledTaskService {
  private static dailyJob: cron.ScheduledTask | null = null;
  private static monthlyJob: cron.ScheduledTask | null = null;
  private static alertJob: cron.ScheduledTask | null = null;

  /**
   * 初始化所有定时任务
   */
  static initialize(): void {
    logger.info('Initializing scheduled tasks...');

    // 每天凌晨0点执行：生成单日结算表
    this.dailyJob = cron.schedule('0 0 * * *', async () => {
      await this.generateDailySettlements();
    });

    // 每月1号凌晨0点执行：生成上月结算表和考勤表
    this.monthlyJob = cron.schedule('0 0 1 * *', async () => {
      await this.generateMonthlySettlements();
      await this.generateAttendance();
      await this.calculateAnalysisBaseline();
    });

    // 每天凌晨1点执行：检测异常数据
    this.alertJob = cron.schedule('0 1 * * *', async () => {
      await this.checkAbnormalData();
    });

    // 每天凌晨2点执行：计算油量余额
    this.fuelBalanceJob = cron.schedule('0 2 * * *', async () => {
      await this.calculateFuelBalances();
    });

    logger.info('Scheduled tasks initialized');
  }

  /**
   * 生成单日结算表
   */
  private static async generateDailySettlements(): Promise<void> {
    const taskName = 'generate_daily_settlements';
    if (taskStatus.get(taskName)?.isRunning) {
      logger.warn('Daily settlement job is already running, skip');
      return;
    }

    taskStatus.set(taskName, {
      name: taskName,
      lastRun: new Date(),
      nextRun: null,
      isRunning: true,
      status: 'running',
    });

    try {
      logger.info('Starting to generate daily settlements...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recordDate = yesterday.toISOString().split('T')[0];

      // 获取所有在用车辆
      const vehicles = await VehicleService.getActiveVehicles();

      for (const vehicle of vehicles) {
        try {
          // 计算结算数据
          const settlementData = await CalculationService.calculateDailySettlement(
            recordDate,
            vehicle.machinery_type,
            vehicle.vehicle_no
          );

          // 检查是否已存在该日期的结算记录
          const existing = await DatabaseService.findOne('tb_daily_settlement', {
            record_date: recordDate,
            machinery_type: vehicle.machinery_type,
            vehicle_no: vehicle.vehicle_no,
          });

          if (existing) {
            // 更新现有记录
            await DatabaseService.update('tb_daily_settlement', {
              id: existing.id,
            }, settlementData);
          } else {
            // 插入新记录
            await DatabaseService.insert('tb_daily_settlement', settlementData);
          }

          logger.debug(`Generated settlement for ${vehicle.machinery_type}-${vehicle.vehicle_no}`);
        } catch (error) {
          logger.error(`Error generating settlement for ${vehicle.machinery_type}-${vehicle.vehicle_no}:`, error);
        }
      }

      taskStatus.get(taskName)!.status = 'idle';
      logger.info(`Daily settlements generated successfully for ${recordDate}`);
    } catch (error) {
      taskStatus.get(taskName)!.status = 'error';
      logger.error('Error generating daily settlements:', error);
    } finally {
      taskStatus.get(taskName)!.isRunning = false;
    }
  }

  /**
   * 生成当月结算表
   */
  private static async generateMonthlySettlements(): Promise<void> {
    const taskName = 'generate_monthly_settlements';
    if (taskStatus.get(taskName)?.isRunning) {
      logger.warn('Monthly settlement job is already running, skip');
      return;
    }

    taskStatus.set(taskName, {
      name: taskName,
      lastRun: new Date(),
      nextRun: null,
      isRunning: true,
      status: 'running',
    });

    try {
      logger.info('Starting to generate monthly settlements...');

      // 获取上个月
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const yearMonth = lastMonth.toISOString().substring(0, 7);

      // 获取所有在用车辆
      const vehicles = await VehicleService.getActiveVehicles();

      for (const vehicle of vehicles) {
        try {
          // 查询该月所有单日结算
          const { data: dailySettlements, error } = await supabase
            .from('tb_daily_settlement')
            .select('*')
            .eq('record_date', lastMonth.toISOString().split('T')[0].substring(0, 7) + '-01') // 这里需要改进
            .eq('machinery_type', vehicle.machinery_type)
            .eq('vehicle_no', vehicle.vehicle_no);

          if (error) throw error;

          // 汇总计算月度数据
          const monthlyData = this.aggregateMonthlyData(dailySettlements || [], yearMonth, vehicle);

          // 保存月度结算
          await DatabaseService.insert('tb_monthly_settlement', monthlyData);
        } catch (error) {
          logger.error(`Error generating monthly settlement for ${vehicle.machinery_type}-${vehicle.vehicle_no}:`, error);
        }
      }

      taskStatus.get(taskName)!.status = 'idle';
      logger.info(`Monthly settlements generated successfully for ${yearMonth}`);
    } catch (error) {
      taskStatus.get(taskName)!.status = 'error';
      logger.error('Error generating monthly settlements:', error);
    } finally {
      taskStatus.get(taskName)!.isRunning = false;
    }
  }

  /**
   * 汇总月度数据
   */
  private static aggregateMonthlyData(
    dailySettlements: any[],
    yearMonth: string,
    vehicle: any
  ): any {
    let totalTruckCount = 0;
    let totalCapacity = 0;
    let totalIncome = 0;
    let totalOilAmount = 0;
    let totalOilFee = 0;
    let totalWorkHours = 0;
    let totalShiftFee = 0;
    let totalBalance = 0;
    let totalDeduction = 0;
    let totalMealFee = 0;
    let totalMedicalFee = 0;
    let totalWalkieTalkieFee = 0;
    let totalBluetoothCardFee = 0;
    let totalAmplifierFee = 0;
    let totalReflectiveVestFee = 0;
    let totalSafetyInsuranceFee = 0;
    let totalDriverSalary = 0;
    let totalRepairFee = 0;
    let totalPartsFee = 0;

    for (const settlement of dailySettlements) {
      totalTruckCount += settlement.truck_count || 0;
      totalCapacity += settlement.total_capacity || 0;
      totalIncome += settlement.income || 0;
      totalOilAmount += settlement.oil_amount || 0;
      totalOilFee += settlement.oil_fee || 0;
      totalWorkHours += settlement.work_hours || 0;
      totalShiftFee += settlement.shift_fee || 0;
      totalBalance += settlement.balance || 0;
      totalDeduction += settlement.deduction || 0;
      totalMealFee += settlement.meal_fee || 0;
      totalMedicalFee += settlement.medical_fee || 0;
      totalWalkieTalkieFee += settlement.walkie_talkie_fee || 0;
      totalBluetoothCardFee += settlement.bluetooth_card_fee || 0;
      totalAmplifierFee += settlement.amplifier_fee || 0;
      totalReflectiveVestFee += settlement.reflective_vest_fee || 0;
      totalSafetyInsuranceFee += settlement.safety_insurance_fee || 0;
      totalDriverSalary += settlement.driver_salary || 0;
      totalRepairFee += settlement.repair_fee || 0;
      totalPartsFee += settlement.parts_fee || 0;
    }

    // 计算租赁费
    let rentalFee = 0;
    if (vehicle.is_rental) {
      if (vehicle.rental_unit === '月') {
        rentalFee = vehicle.rental_fee || 0;
      } else if (vehicle.rental_unit === '天') {
        rentalFee = (vehicle.rental_fee || 0) * dailySettlements.length;
      }
    }

    const totalBalance2 = totalIncome - totalOilFee;
    const actualBalance =
      totalBalance2 -
      totalShiftFee -
      totalDeduction -
      totalMealFee -
      totalMedicalFee -
      totalWalkieTalkieFee -
      totalBluetoothCardFee -
      totalAmplifierFee -
      totalReflectiveVestFee -
      totalSafetyInsuranceFee -
      totalDriverSalary -
      totalRepairFee -
      totalPartsFee -
      rentalFee;

    return {
      year_month: yearMonth,
      machinery_type: vehicle.machinery_type,
      vehicle_no: vehicle.vehicle_no,
      truck_count: totalTruckCount,
      total_capacity: totalCapacity,
      income: totalIncome,
      oil_amount: totalOilAmount,
      oil_fee: totalOilFee,
      work_hours: totalWorkHours,
      shift_fee: totalShiftFee,
      balance: totalBalance2,
      deduction: totalDeduction,
      meal_fee: totalMealFee,
      medical_fee: totalMedicalFee,
      walkie_talkie_fee: totalWalkieTalkieFee,
      bluetooth_card_fee: totalBluetoothCardFee,
      amplifier_fee: totalAmplifierFee,
      reflective_vest_fee: totalReflectiveVestFee,
      safety_insurance_fee: totalSafetyInsuranceFee,
      driver_salary: totalDriverSalary,
      repair_fee: totalRepairFee,
      parts_fee: totalPartsFee,
      rental_fee: rentalFee,
      actual_balance: actualBalance,
    };
  }

  /**
   * 生成考勤表
   */
  private static async generateAttendance(): Promise<void> {
    const taskName = 'generate_attendance';
    if (taskStatus.get(taskName)?.isRunning) {
      logger.warn('Attendance job is already running, skip');
      return;
    }

    taskStatus.set(taskName, {
      name: taskName,
      lastRun: new Date(),
      nextRun: null,
      isRunning: true,
      status: 'running',
    });

    try {
      logger.info('Starting to generate attendance...');

      // 获取当月
      const now = new Date();
      const yearMonth = now.toISOString().substring(0, 7);

      // 检查是否已存在
      const existing = await DatabaseService.findOne('tb_attendance_master', {
        year_month: yearMonth,
      });

      if (existing) {
        logger.info(`Attendance for ${yearMonth} already exists`);
        return;
      }

      // 创建考勤主表
      const masterId = await this.createAttendanceMaster(yearMonth);

      // 获取所有在职人员
      const personnel = await VehicleService.getActiveVehicles(); // 这里应该获取人员

      // 生成每日考勤明细
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${yearMonth}-${day.toString().padStart(2, '0')}`;

        for (const person of personnel) {
          await DatabaseService.insert('tb_attendance_detail', {
            master_id: masterId,
            personnel_id: person.id,
            attendance_date: date,
            attendance_status: '出勤', // 默认出勤
            meal_status: '正常', // 默认正常
          });
        }
      }

      taskStatus.get(taskName)!.status = 'idle';
      logger.info(`Attendance generated successfully for ${yearMonth}`);
    } catch (error) {
      taskStatus.get(taskName)!.status = 'error';
      logger.error('Error generating attendance:', error);
    } finally {
      taskStatus.get(taskName)!.isRunning = false;
    }
  }

  /**
   * 创建考勤主表
   */
  private static async createAttendanceMaster(yearMonth: string): Promise<number> {
    const { data, error } = await supabase
      .from('tb_attendance_master')
      .insert({ year_month: yearMonth, status: '编辑中' })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * 计算分析基准
   */
  private static async calculateAnalysisBaseline(): Promise<void> {
    const taskName = 'calculate_analysis_baseline';
    if (taskStatus.get(taskName)?.isRunning) {
      logger.warn('Analysis baseline job is already running, skip');
      return;
    }

    taskStatus.set(taskName, {
      name: taskName,
      lastRun: new Date(),
      nextRun: null,
      isRunning: true,
      status: 'running',
    });

    try {
      logger.info('Starting to calculate analysis baselines...');

      // 获取所有在用车辆
      const vehicles = await VehicleService.getActiveVehicles();

      for (const vehicle of vehicles) {
        // 计算各项指标的平均值和标准差
        // 这里可以添加详细的计算逻辑
        logger.debug(`Calculating baseline for ${vehicle.machinery_type}-${vehicle.vehicle_no}`);
      }

      taskStatus.get(taskName)!.status = 'idle';
      logger.info('Analysis baselines calculated successfully');
    } catch (error) {
      taskStatus.get(taskName)!.status = 'error';
      logger.error('Error calculating analysis baselines:', error);
    } finally {
      taskStatus.get(taskName)!.isRunning = false;
    }
  }

  /**
   * 检测异常数据
   */
  private static async checkAbnormalData(): Promise<void> {
    const taskName = 'check_abnormal_data';
    if (taskStatus.get(taskName)?.isRunning) {
      logger.warn('Abnormal data check job is already running, skip');
      return;
    }

    taskStatus.set(taskName, {
      name: taskName,
      lastRun: new Date(),
      nextRun: null,
      isRunning: true,
      status: 'running',
    });

    try {
      logger.info('Starting to check abnormal data...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recordDate = yesterday.toISOString().split('T')[0];

      // 获取所有在用车辆
      const vehicles = await VehicleService.getActiveVehicles();

      for (const vehicle of vehicles) {
        // 检测油耗异常
        await this.checkFuelAnomaly(recordDate, vehicle);

        // 检测利润异常
        await this.checkProfitAnomaly(recordDate, vehicle);

        // 检测车数异常
        await this.checkTruckCountAnomaly(recordDate, vehicle);
      }

      taskStatus.get(taskName)!.status = 'idle';
      logger.info('Abnormal data check completed');
    } catch (error) {
      taskStatus.get(taskName)!.status = 'error';
      logger.error('Error checking abnormal data:', error);
    } finally {
      taskStatus.get(taskName)!.isRunning = false;
    }
  }

  /**
   * 检测油耗异常
   */
  private static async checkFuelAnomaly(recordDate: string, vehicle: any): Promise<void> {
    // 获取该车最近7天的数据
    const { data: recentData } = await supabase
      .from('tb_daily_settlement')
      .select('record_date, oil_amount, truck_count')
      .eq('machinery_type', vehicle.machinery_type)
      .eq('vehicle_no', vehicle.vehicle_no)
      .gte('record_date', recordDate)
      .order('record_date', { ascending: false })
      .limit(7);

    if (!recentData || recentData.length < 7) return;

    // 计算平均油耗
    let totalOil = 0;
    let totalTrucks = 0;

    for (const row of recentData) {
      totalOil += row.oil_amount || 0;
      totalTrucks += row.truck_count || 0;
    }

    const avgOilPerTruck = totalTrucks > 0 ? totalOil / totalTrucks : 0;

    // 检查是否超过正常范围的2倍
    if (avgOilPerTruck > 20) { // 假设正常范围是0-10
      await DatabaseService.insert('tb_alert', {
        alert_type: '油耗异常',
        machinery_type: vehicle.machinery_type,
        vehicle_no: vehicle.vehicle_no,
        alert_content: `连续7天平均单车油耗${avgOilPerTruck.toFixed(2)}升，异常偏高`,
        alert_level: '高',
        related_date: recordDate,
        related_data: { avg_oil_per_truck: avgOilPerTruck, recent_data: recentData },
        status: '未处理',
      });
    }
  }

  /**
   * 检测利润异常
   */
  private static async checkProfitAnomaly(recordDate: string, vehicle: any): Promise<void> {
    const { data: recentData } = await supabase
      .from('tb_daily_settlement')
      .select('record_date, actual_balance')
      .eq('machinery_type', vehicle.machinery_type)
      .eq('vehicle_no', vehicle.vehicle_no)
      .gte('record_date', recordDate)
      .order('record_date', { ascending: false })
      .limit(3);

    if (!recentData || recentData.length < 3) return;

    // 检查是否连续3天亏损
    const allNegative = recentData.every(row => (row.actual_balance || 0) < 0);

    if (allNegative) {
      const totalLoss = recentData.reduce((sum, row) => sum + (row.actual_balance || 0), 0);

      await DatabaseService.insert('tb_alert', {
        alert_type: '利润异常',
        machinery_type: vehicle.machinery_type,
        vehicle_no: vehicle.vehicle_no,
        alert_content: `连续3天亏损，累计亏损${Math.abs(totalLoss).toFixed(2)}元`,
        alert_level: '高',
        related_date: recordDate,
        related_data: { recent_balances: recentData, total_loss: totalLoss },
        status: '未处理',
      });
    }
  }

  /**
   * 检测车数异常
   */
  private static async checkTruckCountAnomaly(recordDate: string, vehicle: any): Promise<void> {
    const { data: recentData } = await supabase
      .from('tb_daily_settlement')
      .select('record_date, truck_count')
      .eq('machinery_type', vehicle.machinery_type)
      .eq('vehicle_no', vehicle.vehicle_no)
      .gte('record_date', recordDate)
      .order('record_date', { ascending: false })
      .limit(5);

    if (!recentData || recentData.length < 5) return;

    // 检查是否连续3天车数为0
    const zeroDays = recentData.filter(row => (row.truck_count || 0) === 0).length;

    if (zeroDays >= 3) {
      await DatabaseService.insert('tb_alert', {
        alert_type: '车数异常',
        machinery_type: vehicle.machinery_type,
        vehicle_no: vehicle.vehicle_no,
        alert_content: `连续${zeroDays}天车数为0，可能停工`,
        alert_level: '中',
        related_date: recordDate,
        related_data: { recent_truck_counts: recentData, zero_days: zeroDays },
        status: '未处理',
      });
    }
  }

  /**
   * 计算油量余额
   */
  private static async calculateFuelBalances(): Promise<void> {
    const taskName = 'calculate_fuel_balances';
    if (taskStatus.get(taskName)?.isRunning) {
      logger.warn('Fuel balance job is already running, skip');
      return;
    }

    taskStatus.set(taskName, {
      name: taskName,
      lastRun: new Date(),
      nextRun: null,
      isRunning: true,
      status: 'running',
    });

    try {
      logger.info('Starting to calculate fuel balances...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recordDate = yesterday.toISOString().split('T')[0];

      // 获取所有在用车辆
      const vehicles = await VehicleService.getActiveVehicles();

      for (const vehicle of vehicles) {
        // 获取油料记录
        const { data: oilRecords } = await supabase
          .from('tb_oil_record')
          .select('*')
          .eq('record_date', recordDate)
          .eq('machinery_type', vehicle.machinery_type)
          .eq('vehicle_no', vehicle.vehicle_no);

        // 获取结算记录（包含消耗量）
        const { data: settlementData } = await supabase
          .from('tb_daily_settlement')
          .select('*')
          .eq('record_date', recordDate)
          .eq('machinery_type', vehicle.machinery_type)
          .eq('vehicle_no', vehicle.vehicle_no)
          .single();

        if (!settlementData) continue;

        // 获取昨日的期末余额作为今日的期初余额
        const { data: yesterdayBalance } = await supabase
          .from('tb_fuel_balance')
          .select('closing_balance')
          .eq('record_date', yesterday.toISOString().split('T')[0])
          .eq('machinery_type', vehicle.machinery_type)
          .eq('vehicle_no', vehicle.vehicle_no)
          .single();

        const openingBalance = yesterdayBalance?.closing_balance || 0;
        const refuelAmount = oilRecords?.reduce((sum, r) => sum + (r.oil_amount || 0), 0) || 0;
        const consumptionAmount = settlementData?.oil_amount || 0;
        const closingBalance = openingBalance + refuelAmount - consumptionAmount;

        // 计算理论消耗量（基于车数和平均油耗）
        const theoreticalConsumption = (settlementData.truck_count || 0) * 4.5; // 假设平均油耗4.5升/车
        const consumptionDifference = consumptionAmount - theoreticalConsumption;

        // 如果消耗差异超过理论值的20%，发出预警
        if (theoreticalConsumption > 0 && consumptionDifference / theoreticalConsumption > 0.2) {
          await DatabaseService.insert('tb_alert', {
            alert_type: '加油异常',
            machinery_type: vehicle.machinery_type,
            vehicle_no: vehicle.vehicle_no,
            alert_content: `油量消耗差异过大：实际消耗${consumptionAmount}升，理论消耗${theoreticalConsumption}升`,
            alert_level: '中',
            related_date: recordDate,
            related_data: {
              opening_balance: openingBalance,
              refuel_amount: refuelAmount,
              consumption_amount: consumptionAmount,
              closing_balance: closingBalance,
              theoretical_consumption: theoreticalConsumption,
              consumption_difference: consumptionDifference,
            },
            status: '未处理',
          });
        }

        // 保存油量余额记录
        await DatabaseService.insert('tb_fuel_balance', {
          record_date: recordDate,
          machinery_type: vehicle.machinery_type,
          vehicle_no: vehicle.vehicle_no,
          opening_balance: openingBalance,
          refuel_amount: refuelAmount,
          consumption_amount: consumptionAmount,
          closing_balance: closingBalance,
          theoretical_consumption: theoreticalConsumption,
          consumption_difference: consumptionDifference,
        });
      }

      taskStatus.get(taskName)!.status = 'idle';
      logger.info('Fuel balances calculated successfully');
    } catch (error) {
      taskStatus.get(taskName)!.status = 'error';
      logger.error('Error calculating fuel balances:', error);
    } finally {
      taskStatus.get(taskName)!.isRunning = false;
    }
  }

  /**
   * 获取任务状态
   */
  static getTaskStatus(): TaskStatus[] {
    return Array.from(taskStatus.values());
  }

  /**
   * 手动触发单日结算生成
   */
  static async triggerDailySettlement(recordDate: string): Promise<void> {
    logger.info(`Manually triggering daily settlement for ${recordDate}`);

    // 获取所有在用车辆
    const vehicles = await VehicleService.getActiveVehicles();

    for (const vehicle of vehicles) {
      try {
        const settlementData = await CalculationService.calculateDailySettlement(
          recordDate,
          vehicle.machinery_type,
          vehicle.vehicle_no
        );

        const existing = await DatabaseService.findOne('tb_daily_settlement', {
          record_date: recordDate,
          machinery_type: vehicle.machinery_type,
          vehicle_no: vehicle.vehicle_no,
        });

        if (existing) {
          await DatabaseService.update('tb_daily_settlement', {
            id: existing.id,
          }, settlementData);
        } else {
          await DatabaseService.insert('tb_daily_settlement', settlementData);
        }
      } catch (error) {
        logger.error(`Error generating settlement for ${vehicle.machinery_type}-${vehicle.vehicle_no}:`, error);
      }
    }
  }

  /**
   * 停止所有定时任务
   */
  static stopAll(): void {
    if (this.dailyJob) {
      this.dailyJob.stop();
    }
    if (this.monthlyJob) {
      this.monthlyJob.stop();
    }
    if (this.alertJob) {
      this.alertJob.stop();
    }
    if (this.fuelBalanceJob) {
      this.fuelBalanceJob.stop();
    }

    logger.info('All scheduled tasks stopped');
  }
}

// 燃料平衡作业（需要在类中添加）
ScheduledTaskService as any;
