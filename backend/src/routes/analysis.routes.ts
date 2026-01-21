import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { supabase } from '../config';

const router = Router();

// 获取异常预警列表
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { alert_type, status, alert_level, start_date, end_date, limit } = req.query;

    let query = supabase
      .from('tb_alert')
      .select('*')
      .order('alert_time', { ascending: false });

    if (alert_type) {
      query = query.eq('alert_type', alert_type);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (alert_level) {
      query = query.eq('alert_level', alert_level);
    }
    if (start_date) {
      query = query.gte('alert_time', start_date);
    }
    if (end_date) {
      query = query.lte('alert_time', end_date);
    }

    const { data, error } = await query.limit(parseInt(limit as string) || 100);

    if (error) throw error;

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get alerts',
      data: null,
    });
  }
});

// 更新预警状态
router.put('/alerts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, handle_remark } = req.body;

    await DatabaseService.update(
      'tb_alert',
      { id: parseInt(id) },
      {
        status,
        handle_remark,
        handle_time: new Date().toISOString(),
      }
    );

    const updated = await DatabaseService.findOne('tb_alert', { id: parseInt(id) });

    res.json({
      code: 200,
      message: 'Updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to update alert',
      data: null,
    });
  }
});

// 批量更新预警状态
router.put('/alerts/batch/update', async (req: Request, res: Response) => {
  try {
    const { ids, status, handle_remark } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'ids array is required',
        data: null,
      });
    }

    for (const id of ids) {
      await DatabaseService.update(
        'tb_alert',
        { id },
        {
          status,
          handle_remark,
          handle_time: new Date().toISOString(),
        }
      );
    }

    res.json({
      code: 200,
      message: `Updated ${ids.length} alerts`,
      data: null,
    });
  } catch (error: any) {
    console.error('Error batch updating alerts:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to batch update alerts',
      data: null,
    });
  }
});

// 预警统计
router.get('/alerts/stats', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase.from('tb_alert').select('alert_type, status, alert_level');

    if (start_date) {
      query = query.gte('alert_time', start_date);
    }
    if (end_date) {
      query = query.lte('alert_time', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 按类型统计
    const byType: Record<string, number> = {};
    // 按状态统计
    const byStatus: Record<string, number> = {};
    // 按级别统计
    const byLevel: Record<string, number> = {};

    for (const alert of data || []) {
      byType[alert.alert_type] = (byType[alert.alert_type] || 0) + 1;
      byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
      byLevel[alert.alert_level] = (byLevel[alert.alert_level] || 0) + 1;
    }

    res.json({
      code: 200,
      message: 'success',
      data: {
        by_type: byType,
        by_status: byStatus,
        by_level: byLevel,
        total_alerts: data?.length || 0,
        unhandled_alerts: byStatus['未处理'] || 0,
      },
    });
  } catch (error: any) {
    console.error('Error getting alert stats:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get alert stats',
      data: null,
    });
  }
});

// 获取分析基准
router.get('/baselines', async (req: Request, res: Response) => {
  try {
    const { machinery_type, vehicle_no, indicator_type, calculation_date } = req.query;

    let query = supabase
      .from('tb_analysis_baseline')
      .select('*')
      .order('calculation_date', { ascending: false });

    if (machinery_type) {
      query = query.eq('machinery_type', machinery_type);
    }
    if (vehicle_no) {
      query = query.eq('vehicle_no', vehicle_no);
    }
    if (indicator_type) {
      query = query.eq('indicator_type', indicator_type);
    }
    if (calculation_date) {
      query = query.eq('calculation_date', calculation_date);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting baselines:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get baselines',
      data: null,
    });
  }
});

// 油耗分析
router.get('/fuel-analysis', async (req: Request, res: Response) => {
  try {
    const { machinery_type, vehicle_no, start_date, end_date } = req.query;

    // 查询油料记录
    let oilQuery = supabase
      .from('tb_oil_record')
      .select('record_date, machinery_type, vehicle_no, oil_amount, total_fee')
      .order('record_date', { ascending: false });

    if (machinery_type) {
      oilQuery = oilQuery.eq('machinery_type', machinery_type);
    }
    if (vehicle_no) {
      oilQuery = oilQuery.eq('vehicle_no', vehicle_no);
    }
    if (start_date) {
      oilQuery = oilQuery.gte('record_date', start_date);
    }
    if (end_date) {
      oilQuery = oilQuery.lte('record_date', end_date);
    }

    const { data: oilData, error: oilError } = await oilQuery;

    if (oilError) throw oilError;

    // 查询车数记录
    let truckQuery = supabase
      .from('tb_truck_record')
      .select('record_date, truck_no, truck_count, total_capacity');

    if (start_date) {
      truckQuery = truckQuery.gte('record_date', start_date);
    }
    if (end_date) {
      truckQuery = truckQuery.lte('record_date', end_date);
    }
    if (vehicle_no) {
      truckQuery = truckQuery.eq('truck_no', vehicle_no);
    }

    const { data: truckData, error: truckError } = await truckQuery;

    if (truckError) throw truckError;

    // 按日期汇总
    const byDate: Record<string, any> = {};
    for (const oil of oilData || []) {
      if (!byDate[oil.record_date]) {
        byDate[oil.record_date] = {
          date: oil.record_date,
          oil_amount: 0,
          fee: 0,
          truck_count: 0,
          capacity: 0,
        };
      }
      byDate[oil.record_date].oil_amount += oil.oil_amount || 0;
      byDate[oil.record_date].fee += oil.total_fee || 0;
    }

    for (const truck of truckData || []) {
      if (byDate[truck.record_date]) {
        byDate[truck.record_date].truck_count += truck.truck_count || 0;
        byDate[truck.record_date].capacity += truck.total_capacity || 0;
      }
    }

    // 计算单车油耗和单方油耗
    const results = Object.values(byDate).map((day: any) => ({
      ...day,
      per_truck_oil: day.truck_count > 0 ? day.oil_amount / day.truck_count : 0,
      per_capacity_oil: day.capacity > 0 ? day.oil_amount / day.capacity : 0,
    }));

    // 统计信息
    const oilAmounts = results.map((r: any) => r.oil_amount);
    const perTruckOils = results
      .filter((r: any) => r.per_truck_oil > 0)
      .map((r: any) => r.per_truck_oil);

    const avgOil = oilAmounts.length
      ? oilAmounts.reduce((a, b) => a + b, 0) / oilAmounts.length
      : 0;
    const avgPerTruckOil = perTruckOils.length
      ? perTruckOils.reduce((a, b) => a + b, 0) / perTruckOils.length
      : 0;

    res.json({
      code: 200,
      message: 'success',
      data: {
        summary: {
          total_oil: oilAmounts.reduce((a, b) => a + b, 0),
          avg_daily_oil: avgOil,
          avg_per_truck_oil: avgPerTruckOil,
          analysis_days: results.length,
        },
        trends: results,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing fuel:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to analyze fuel',
      data: null,
    });
  }
});

// 利润分析
router.get('/profit-analysis', async (req: Request, res: Response) => {
  try {
    const { machinery_type, vehicle_no, start_date, end_date } = req.query;

    let query = supabase
      .from('tb_daily_settlement')
      .select('*')
      .order('record_date', { ascending: false });

    if (machinery_type) {
      query = query.eq('machinery_type', machinery_type);
    }
    if (vehicle_no) {
      query = query.eq('vehicle_no', vehicle_no);
    }
    if (start_date) {
      query = query.gte('record_date', start_date);
    }
    if (end_date) {
      query = query.lte('record_date', end_date);
    }

    const { data, error } = await query.limit(200);

    if (error) throw error;

    // 计算各项统计
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBalance = 0;
    let totalActualBalance = 0;
    let profitableDays = 0;
    let lossDays = 0;

    // 成本构成
    const costBreakdown = {
      oil_fee: 0,
      shift_fee: 0,
      driver_salary: 0,
      meal_fee: 0,
      repair_fee: 0,
      parts_fee: 0,
      deduction: 0,
      others: 0,
    };

    for (const record of data || []) {
      totalIncome += record.income || 0;
      totalBalance += record.balance || 0;
      totalActualBalance += record.actual_balance || 0;

      const oilFee = record.oil_fee || 0;
      const shiftFee = record.shift_fee || 0;
      const driverSalary = record.driver_salary || 0;
      const mealFee = record.meal_fee || 0;
      const repairFee = record.repair_fee || 0;
      const partsFee = record.parts_fee || 0;
      const deduction = record.deduction || 0;

      costBreakdown.oil_fee += oilFee;
      costBreakdown.shift_fee += shiftFee;
      costBreakdown.driver_salary += driverSalary;
      costBreakdown.meal_fee += mealFee;
      costBreakdown.repair_fee += repairFee;
      costBreakdown.parts_fee += partsFee;
      costBreakdown.deduction += deduction;

      const dailyExpense =
        oilFee + shiftFee + driverSalary + mealFee + repairFee + partsFee + deduction;
      costBreakdown.others += dailyExpense;

      totalExpense += dailyExpense;

      if (record.actual_balance >= 0) {
        profitableDays++;
      } else {
        lossDays++;
      }
    }

    const profit = totalIncome - totalExpense;
    const profitRate = data?.length ? (profitableDays / data.length) * 100 : 0;

    // 按日期趋势
    const byDate: Record<string, any> = {};
    for (const record of data || []) {
      const date = record.record_date;
      if (!byDate[date]) {
        byDate[date] = {
          date,
          income: 0,
          expense: 0,
          profit: 0,
        };
      }
      byDate[date].income += record.income || 0;
      const dailyExpense =
        (record.oil_fee || 0) +
        (record.shift_fee || 0) +
        (record.driver_salary || 0) +
        (record.meal_fee || 0) +
        (record.repair_fee || 0) +
        (record.parts_fee || 0) +
        (record.deduction || 0);
      byDate[date].expense += dailyExpense;
      byDate[date].profit += record.actual_balance || 0;
    }

    res.json({
      code: 200,
      message: 'success',
      data: {
        summary: {
          total_income: totalIncome,
          total_expense: totalExpense,
          profit: profit,
          total_actual_balance: totalActualBalance,
          profitable_days: profitableDays,
          loss_days: lossDays,
          total_days: data?.length || 0,
          profit_rate: profitRate,
        },
        cost_breakdown: costBreakdown,
        trends: Object.values(byDate),
      },
    });
  } catch (error: any) {
    console.error('Error analyzing profit:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to analyze profit',
      data: null,
    });
  }
});

export default router;
