import { Router, Request, Response } from 'express';
import { DatabaseService, VehicleService } from '../services/database.service';
import { CalculationService } from '../services/calculation.service';
import { ScheduledTaskService } from '../jobs/scheduled-tasks';
import { supabase } from '../config';
import Joi from 'joi';

const router = Router();

// 获取单日结算数据
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { record_date, machinery_type, vehicle_no, start_date, end_date } = req.query;

    let query = supabase.from('tb_daily_settlement').select('*').order('record_date', { ascending: false });

    if (record_date) {
      query = query.eq('record_date', record_date);
    }
    if (start_date) {
      query = query.gte('record_date', start_date);
    }
    if (end_date) {
      query = query.lte('record_date', end_date);
    }
    if (machinery_type) {
      query = query.eq('machinery_type', machinery_type);
    }
    if (vehicle_no) {
      query = query.eq('vehicle_no', vehicle_no);
    }

    const { data, error } = await query.limit(200);

    if (error) throw error;

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting daily settlements:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get daily settlements',
      data: null,
    });
  }
});

// 获取单个车辆的单日结算详情
router.get('/daily/detail', async (req: Request, res: Response) => {
  try {
    const { record_date, machinery_type, vehicle_no } = req.query;

    if (!record_date || !machinery_type || !vehicle_no) {
      return res.status(400).json({
        code: 400,
        message: 'record_date, machinery_type and vehicle_no are required',
        data: null,
      });
    }

    // 先查数据库
    const existing = await DatabaseService.findOne('tb_daily_settlement', {
      record_date: record_date as string,
      machinery_type: machinery_type as string,
      vehicle_no: vehicle_no as string,
    });

    if (existing) {
      // 获取车辆信息
      const vehicle = await VehicleService.getVehicleInfo(
        machinery_type as string,
        vehicle_no as string
      );

      // 获取司机信息
      const drivers = await VehicleService.getDriversByVehicle(
        machinery_type as string,
        vehicle_no as string,
        record_date as string
      );

      return res.json({
        code: 200,
        message: 'success',
        data: {
          settlement: existing,
          vehicle: vehicle,
          drivers: drivers,
        },
      });
    }

    // 如果不存在，实时计算
    const settlementData = await CalculationService.calculateDailySettlement(
      record_date as string,
      machinery_type as string,
      vehicle_no as string
    );

    // 获取车辆信息
    const vehicle = await VehicleService.getVehicleInfo(
      machinery_type as string,
      vehicle_no as string
    );

    // 获取司机信息
    const drivers = await VehicleService.getDriversByVehicle(
      machinery_type as string,
      vehicle_no as string,
      record_date as string
    );

    res.json({
      code: 200,
      message: 'success',
      data: {
        settlement: settlementData,
        vehicle: vehicle,
        drivers: drivers,
        isRealtime: true, // 标记为实时计算
      },
    });
  } catch (error: any) {
    console.error('Error getting daily settlement detail:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get daily settlement detail',
      data: null,
    });
  }
});

// 刷新单日结算数据
router.post('/daily/refresh', async (req: Request, res: Response) => {
  try {
    const { record_date, machinery_type, vehicle_no } = req.body;

    if (!record_date || !machinery_type || !vehicle_no) {
      return res.status(400).json({
        code: 400,
        message: 'record_date, machinery_type and vehicle_no are required',
        data: null,
      });
    }

    // 重新计算结算数据
    const settlementData = await CalculationService.calculateDailySettlement(
      record_date,
      machinery_type,
      vehicle_no
    );

    // 检查是否已存在
    const existing = await DatabaseService.findOne('tb_daily_settlement', {
      record_date,
      machinery_type,
      vehicle_no,
    });

    if (existing) {
      // 更新现有记录
      await DatabaseService.update(
        'tb_daily_settlement',
        { id: existing.id },
        {
          ...settlementData,
          last_refresh_time: new Date().toISOString(),
        }
      );

      const updated = await DatabaseService.findOne('tb_daily_settlement', {
        id: existing.id,
      });

      res.json({
        code: 200,
        message: 'Refreshed successfully',
        data: updated,
      });
    } else {
      // 插入新记录
      const data = await DatabaseService.insert('tb_daily_settlement', {
        ...settlementData,
        last_refresh_time: new Date().toISOString(),
      });

      res.status(201).json({
        code: 201,
        message: 'Created and refreshed successfully',
        data: data,
      });
    }
  } catch (error: any) {
    console.error('Error refreshing daily settlement:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to refresh daily settlement',
      data: null,
    });
  }
});

// 批量刷新单日结算数据
router.post('/daily/refresh-all', async (req: Request, res: Response) => {
  try {
    const { record_date } = req.body;

    if (!record_date) {
      return res.status(400).json({
        code: 400,
        message: 'record_date is required',
        data: null,
      });
    }

    // 获取所有在用车辆
    const vehicles = await VehicleService.getActiveVehicles();

    const results = {
      total: vehicles.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const vehicle of vehicles) {
      try {
        const settlementData = await CalculationService.calculateDailySettlement(
          record_date,
          vehicle.machinery_type,
          vehicle.vehicle_no
        );

        const existing = await DatabaseService.findOne('tb_daily_settlement', {
          record_date,
          machinery_type: vehicle.machinery_type,
          vehicle_no: vehicle.vehicle_no,
        });

        if (existing) {
          await DatabaseService.update(
            'tb_daily_settlement',
            { id: existing.id },
            {
              ...settlementData,
              last_refresh_time: new Date().toISOString(),
            }
          );
        } else {
          await DatabaseService.insert('tb_daily_settlement', {
            ...settlementData,
            last_refresh_time: new Date().toISOString(),
          });
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `${vehicle.machinery_type}-${vehicle.vehicle_no}: ${error.message}`
        );
      }
    }

    res.json({
      code: 200,
      message: `Refreshed ${results.success} records, ${results.failed} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('Error batch refreshing daily settlements:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to batch refresh daily settlements',
      data: null,
    });
  }
});

// 获取当月结算数据
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const { year_month, machinery_type, is_current_month } = req.query;

    // 如果是当月，实时计算
    if (is_current_month === 'true' || is_current_month === '1') {
      const now = new Date();
      const currentYearMonth = now.toISOString().substring(0, 7);

      const { data: dailyData, error } = await supabase
        .from('tb_daily_settlement')
        .select('*')
        .gte('record_date', `${currentYearMonth}-01`)
        .lte('record_date', now.toISOString().split('T')[0]);

      if (error) throw error;

      // 按车辆汇总
      const monthlyByVehicle: Record<string, any> = {};

      for (const daily of dailyData || []) {
        const key = `${daily.machinery_type}-${daily.vehicle_no}`;
        if (!monthlyByVehicle[key]) {
          monthlyByVehicle[key] = {
            year_month: currentYearMonth,
            machinery_type: daily.machinery_type,
            vehicle_no: daily.vehicle_no,
            truck_count: 0,
            total_capacity: 0,
            income: 0,
            oil_amount: 0,
            oil_fee: 0,
            work_hours: 0,
            shift_fee: 0,
            balance: 0,
            deduction: 0,
            meal_fee: 0,
            medical_fee: 0,
            walkie_talkie_fee: 0,
            bluetooth_card_fee: 0,
            amplifier_fee: 0,
            reflective_vest_fee: 0,
            safety_insurance_fee: 0,
            driver_salary: 0,
            repair_fee: 0,
            parts_fee: 0,
            rental_fee: 0,
            actual_balance: 0,
          };
        }

        const m = monthlyByVehicle[key];
        m.truck_count += daily.truck_count || 0;
        m.total_capacity += daily.total_capacity || 0;
        m.income += daily.income || 0;
        m.oil_amount += daily.oil_amount || 0;
        m.oil_fee += daily.oil_fee || 0;
        m.work_hours += daily.work_hours || 0;
        m.shift_fee += daily.shift_fee || 0;
        m.balance += daily.balance || 0;
        m.deduction += daily.deduction || 0;
        m.meal_fee += daily.meal_fee || 0;
        m.medical_fee += daily.medical_fee || 0;
        m.walkie_talkie_fee += daily.walkie_talkie_fee || 0;
        m.bluetooth_card_fee += daily.bluetooth_card_fee || 0;
        m.amplifier_fee += daily.amplifier_fee || 0;
        m.reflective_vest_fee += daily.reflective_vest_fee || 0;
        m.safety_insurance_fee += daily.safety_insurance_fee || 0;
        m.driver_salary += daily.driver_salary || 0;
        m.repair_fee += daily.repair_fee || 0;
        m.parts_fee += daily.parts_fee || 0;
        m.actual_balance += daily.actual_balance || 0;
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          year_month: currentYearMonth,
          is_current_month: true,
          settlements: Object.values(monthlyByVehicle),
        },
      });
    }

    // 否则查询数据库
    let query = supabase
      .from('tb_monthly_settlement')
      .select('*')
      .order('vehicle_no', { ascending: true });

    if (year_month) {
      query = query.eq('year_month', year_month);
    }
    if (machinery_type) {
      query = query.eq('machinery_type', machinery_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      code: 200,
      message: 'success',
      data: {
        year_month: year_month || null,
        is_current_month: false,
        settlements: data,
      },
    });
  } catch (error: any) {
    console.error('Error getting monthly settlements:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get monthly settlements',
      data: null,
    });
  }
});

// 生成当月结算表
router.post('/monthly/generate', async (req: Request, res: Response) => {
  try {
    const { year_month } = req.body;

    if (!year_month) {
      return res.status(400).json({
        code: 400,
        message: 'year_month is required',
        data: null,
      });
    }

    // 检查是否是当前月
    const now = new Date();
    const currentYearMonth = now.toISOString().substring(0, 7);
    const isCurrentMonth = year_month === currentYearMonth;

    if (isCurrentMonth) {
      // 当月数据不保存，只返回临时计算结果
      const startDate = `${year_month}-01`;
      const endDate = now.toISOString().split('T')[0];

      const { data: dailyData, error } = await supabase
        .from('tb_daily_settlement')
        .select('*')
        .gte('record_date', startDate)
        .lte('record_date', endDate);

      if (error) throw error;

      // 按车辆汇总
      const monthlyByVehicle: Record<string, any> = {};

      for (const daily of dailyData || []) {
        const key = `${daily.machinery_type}-${daily.vehicle_no}`;
        if (!monthlyByVehicle[key]) {
          monthlyByVehicle[key] = {
            year_month,
            machinery_type: daily.machinery_type,
            vehicle_no: daily.vehicle_no,
            truck_count: 0,
            total_capacity: 0,
            income: 0,
            oil_amount: 0,
            oil_fee: 0,
            work_hours: 0,
            shift_fee: 0,
            balance: 0,
            deduction: 0,
            meal_fee: 0,
            medical_fee: 0,
            walkie_talkie_fee: 0,
            bluetooth_card_fee: 0,
            amplifier_fee: 0,
            reflective_vest_fee: 0,
            safety_insurance_fee: 0,
            driver_salary: 0,
            repair_fee: 0,
            parts_fee: 0,
            rental_fee: 0,
            actual_balance: 0,
          };
        }

        const m = monthlyByVehicle[key];
        m.truck_count += daily.truck_count || 0;
        m.total_capacity += daily.total_capacity || 0;
        m.income += daily.income || 0;
        m.oil_amount += daily.oil_amount || 0;
        m.oil_fee += daily.oil_fee || 0;
        m.work_hours += daily.work_hours || 0;
        m.shift_fee += daily.shift_fee || 0;
        m.balance += daily.balance || 0;
        m.deduction += daily.deduction || 0;
        m.meal_fee += daily.meal_fee || 0;
        m.medical_fee += daily.medical_fee || 0;
        m.walkie_talkie_fee += daily.walkie_talkie_fee || 0;
        m.bluetooth_card_fee += daily.bluetooth_card_fee || 0;
        m.amplifier_fee += daily.amplifier_fee || 0;
        m.reflective_vest_fee += daily.reflective_vest_fee || 0;
        m.safety_insurance_fee += daily.safety_insurance_fee || 0;
        m.driver_salary += daily.driver_salary || 0;
        m.repair_fee += daily.repair_fee || 0;
        m.parts_fee += daily.parts_fee || 0;
        m.actual_balance += daily.actual_balance || 0;
      }

      return res.json({
        code: 200,
        message: 'Generated temporary monthly settlement data',
        data: {
          year_month,
          is_current_month: true,
          settlements: Object.values(monthlyByVehicle),
        },
      });
    }

    // 历史月份，保存到数据库
    const startDate = `${year_month}-01`;
    const endDate = `${year_month}-${new Date(
      parseInt(year_month.substring(0, 4)),
      parseInt(year_month.substring(5, 7)),
      0
    ).getDate()}`;

    const { data: dailyData, error } = await supabase
      .from('tb_daily_settlement')
      .select('*')
      .gte('record_date', startDate)
      .lte('record_date', endDate);

    if (error) throw error;

    // 按车辆汇总并添加租赁费
    const monthlyByVehicle: Record<string, any> = {};
    const vehicles = await VehicleService.getActiveVehicles();
    const vehicleMap = new Map(
      vehicles.map((v) => [`${v.machinery_type}-${v.vehicle_no}`, v])
    );

    for (const daily of dailyData || []) {
      const key = `${daily.machinery_type}-${daily.vehicle_no}`;
      if (!monthlyByVehicle[key]) {
        const vehicle = vehicleMap.get(key);
        let rentalFee = 0;
        if (vehicle?.is_rental) {
          if (vehicle.rental_unit === '月') {
            rentalFee = vehicle.rental_fee || 0;
          } else if (vehicle.rental_unit === '天') {
            const days = dailyData.filter(
              (d) => d.machinery_type === daily.machinery_type && d.vehicle_no === daily.vehicle_no
            ).length;
            rentalFee = (vehicle.rental_fee || 0) * days;
          }
        }

        monthlyByVehicle[key] = {
          year_month,
          machinery_type: daily.machinery_type,
          vehicle_no: daily.vehicle_no,
          truck_count: 0,
          total_capacity: 0,
          income: 0,
          oil_amount: 0,
          oil_fee: 0,
          work_hours: 0,
          shift_fee: 0,
          balance: 0,
          deduction: 0,
          meal_fee: 0,
          medical_fee: 0,
          walkie_talkie_fee: 0,
          bluetooth_card_fee: 0,
          amplifier_fee: 0,
          reflective_vest_fee: 0,
          safety_insurance_fee: 0,
          driver_salary: 0,
          repair_fee: 0,
          parts_fee: 0,
          rental_fee: 0,
          actual_balance: 0,
        };
        monthlyByVehicle[key].rental_fee = rentalFee;
      }

      const m = monthlyByVehicle[key];
      m.truck_count += daily.truck_count || 0;
      m.total_capacity += daily.total_capacity || 0;
      m.income += daily.income || 0;
      m.oil_amount += daily.oil_amount || 0;
      m.oil_fee += daily.oil_fee || 0;
      m.work_hours += daily.work_hours || 0;
      m.shift_fee += daily.shift_fee || 0;
      m.balance += daily.balance || 0;
      m.deduction += daily.deduction || 0;
      m.meal_fee += daily.meal_fee || 0;
      m.medical_fee += daily.medical_fee || 0;
      m.walkie_talkie_fee += daily.walkie_talkie_fee || 0;
      m.bluetooth_card_fee += daily.bluetooth_card_fee || 0;
      m.amplifier_fee += daily.amplifier_fee || 0;
      m.reflective_vest_fee += daily.reflective_vest_fee || 0;
      m.safety_insurance_fee += daily.safety_insurance_fee || 0;
      m.driver_salary += daily.driver_salary || 0;
      m.repair_fee += daily.repair_fee || 0;
      m.parts_fee += daily.parts_fee || 0;
      m.actual_balance += daily.actual_balance || 0;
      m.actual_balance -= m.rental_fee;
    }

    // 保存到数据库
    const settlements = Object.values(monthlyByVehicle);
    for (const settlement of settlements) {
      const existing = await DatabaseService.findOne('tb_monthly_settlement', {
        year_month,
        machinery_type: settlement.machinery_type,
        vehicle_no: settlement.vehicle_no,
      });

      if (existing) {
        await DatabaseService.update('tb_monthly_settlement', { id: existing.id }, settlement);
      } else {
        await DatabaseService.insert('tb_monthly_settlement', settlement);
      }
    }

    res.json({
      code: 200,
      message: 'Generated and saved monthly settlement data',
      data: {
        year_month,
        is_current_month: false,
        settlements,
      },
    });
  } catch (error: any) {
    console.error('Error generating monthly settlement:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to generate monthly settlement',
      data: null,
    });
  }
});

// 结算统计汇总
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, machinery_type } = req.query;

    let query = supabase.from('tb_daily_settlement').select(
      'machinery_type, truck_count, total_capacity, income, oil_fee, actual_balance'
    );

    if (start_date) {
      query = query.gte('record_date', start_date);
    }
    if (end_date) {
      query = query.lte('record_date', end_date);
    }
    if (machinery_type) {
      query = query.eq('machinery_type', machinery_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 按类型汇总
    const byType: Record<string, any> = {};
    let totalTruckCount = 0;
    let totalCapacity = 0;
    let totalIncome = 0;
    let totalOilFee = 0;
    let totalActualBalance = 0;

    for (const record of data || []) {
      const type = record.machinery_type;
      if (!byType[type]) {
        byType[type] = {
          truck_count: 0,
          total_capacity: 0,
          income: 0,
          oil_fee: 0,
          actual_balance: 0,
        };
      }
      byType[type].truck_count += record.truck_count || 0;
      byType[type].total_capacity += record.total_capacity || 0;
      byType[type].income += record.income || 0;
      byType[type].oil_fee += record.oil_fee || 0;
      byType[type].actual_balance += record.actual_balance || 0;

      totalTruckCount += record.truck_count || 0;
      totalCapacity += record.total_capacity || 0;
      totalIncome += record.income || 0;
      totalOilFee += record.oil_fee || 0;
      totalActualBalance += record.actual_balance || 0;
    }

    res.json({
      code: 200,
      message: 'success',
      data: {
        total_truck_count: totalTruckCount,
        total_capacity: totalCapacity,
        total_income: totalIncome,
        total_oil_fee: totalOilFee,
        total_actual_balance: totalActualBalance,
        by_type: byType,
        record_count: data?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error getting settlement stats:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get settlement stats',
      data: null,
    });
  }
});

export default router;
