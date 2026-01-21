import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { supabase } from '../config';

const router = Router();

// 获取日结算报表
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { record_date, machinery_type, start_date, end_date } = req.query;

    let query = supabase
      .from('tb_daily_settlement')
      .select('*')
      .order('record_date', { ascending: false });

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

    const { data, error } = await query;

    if (error) throw error;

    // 计算汇总
    const summary = {
      total_income: 0,
      total_oil_fee: 0,
      total_shift_fee: 0,
      total_balance: 0,
      total_deduction: 0,
      total_actual_balance: 0,
      vehicle_count: 0,
    };

    data?.forEach((item: any) => {
      summary.total_income += item.income || 0;
      summary.total_oil_fee += item.oil_fee || 0;
      summary.total_shift_fee += item.shift_fee || 0;
      summary.total_balance += item.balance || 0;
      summary.total_deduction += item.deduction || 0;
      summary.total_actual_balance += item.actual_balance || 0;
      summary.vehicle_count += 1;
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        records: data,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error getting daily report:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get daily report',
      data: null,
    });
  }
});

// 获取月结算报表
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const { year, month, machinery_type } = req.query;

    const monthStr = `${year}-${month.padStart(2, '0')}`;

    let query = supabase
      .from('tb_monthly_settlement')
      .select('*')
      .eq('settlement_month', monthStr);

    if (machinery_type) {
      query = query.eq('machinery_type', machinery_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 计算汇总
    const summary = {
      month: monthStr,
      total_income: 0,
      total_oil_fee: 0,
      total_shift_fee: 0,
      total_balance: 0,
      total_driver_salary: 0,
      total_repair_fee: 0,
      total_parts_fee: 0,
      total_actual_profit: 0,
    };

    data?.forEach((item: any) => {
      summary.total_income += item.total_income || 0;
      summary.total_oil_fee += item.total_oil_fee || 0;
      summary.total_shift_fee += item.total_shift_fee || 0;
      summary.total_balance += item.total_balance || 0;
      summary.total_driver_salary += item.total_driver_salary || 0;
      summary.total_repair_fee += item.total_repair_fee || 0;
      summary.total_parts_fee += item.total_parts_fee || 0;
      summary.total_actual_profit += item.actual_profit || 0;
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        records: data,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error getting monthly report:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get monthly report',
      data: null,
    });
  }
});

// 获取车次统计报表
router.get('/truck-stats', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, machinery_type } = req.query;

    let query = supabase
      .from('tb_truck_record')
      .select('record_date, machinery_type, vehicle_no, load_times, capacity, unit_price, distance')
      .order('record_date', { ascending: false });

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

    // 按车辆分组统计
    const vehicleStats: Record<string, any> = {};
    data?.forEach((record: any) => {
      const vehicleNo = record.vehicle_no;
      if (!vehicleStats[vehicleNo]) {
        vehicleStats[vehicleNo] = {
          vehicle_no: vehicleNo,
          machinery_type: record.machinery_type,
          total_trucks: 0,
          total_capacity: 0,
          total_distance: 0,
          total_income: 0,
          details: [],
        };
      }
      const income = record.load_times * record.capacity * record.unit_price;
      vehicleStats[vehicleNo].total_trucks += record.load_times;
      vehicleStats[vehicleNo].total_capacity += record.load_times * record.capacity;
      vehicleStats[vehicleNo].total_distance += record.distance || 0;
      vehicleStats[vehicleNo].total_income += income;
      vehicleStats[vehicleNo].details.push({
        date: record.record_date,
        load_times: record.load_times,
        capacity: record.load_times * record.capacity,
        income,
      });
    });

    res.json({
      code: 200,
      message: 'success',
      data: Object.values(vehicleStats),
    });
  } catch (error: any) {
    console.error('Error getting truck stats report:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get truck stats report',
      data: null,
    });
  }
});

// 获取油料消耗报表
router.get('/oil-consumption', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, machinery_type } = req.query;

    let query = supabase
      .from('tb_oil_record')
      .select('record_date, machinery_type, vehicle_no, oil_amount, unit_price, total_fee')
      .order('record_date', { ascending: false });

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

    // 按车辆分组统计
    const vehicleStats: Record<string, any> = {};
    data?.forEach((record: any) => {
      const vehicleNo = record.vehicle_no;
      if (!vehicleStats[vehicleNo]) {
        vehicleStats[vehicleNo] = {
          vehicle_no: vehicleNo,
          machinery_type: record.machinery_type,
          total_oil_amount: 0,
          total_fee: 0,
          records: [],
        };
      }
      vehicleStats[vehicleNo].total_oil_amount += record.oil_amount;
      vehicleStats[vehicleNo].total_fee += record.total_fee;
      vehicleStats[vehicleNo].records.push({
        date: record.record_date,
        oil_amount: record.oil_amount,
        unit_price: record.unit_price,
        total_fee: record.total_fee,
      });
    });

    // 计算总计
    const summary = {
      total_oil_amount: 0,
      total_fee: 0,
      vehicle_count: Object.keys(vehicleStats).length,
    };

    Object.values(vehicleStats).forEach((vehicle: any) => {
      summary.total_oil_amount += vehicle.total_oil_amount;
      summary.total_fee += vehicle.total_fee;
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        by_vehicle: Object.values(vehicleStats),
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error getting oil consumption report:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get oil consumption report',
      data: null,
    });
  }
});

// 获取利润分析报表
router.get('/profit-analysis', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, machinery_type } = req.query;

    // 获取结算数据
    let settlementQuery = supabase
      .from('tb_daily_settlement')
      .select('machinery_type, income, oil_fee, shift_fee, balance, actual_balance, driver_salary, repair_fee, parts_fee')
      .order('record_date', { ascending: false });

    if (start_date) {
      settlementQuery = settlementQuery.gte('record_date', start_date);
    }
    if (end_date) {
      settlementQuery = settlementQuery.lte('record_date', end_date);
    }
    if (machinery_type) {
      settlementQuery = settlementQuery.eq('machinery_type', machinery_type);
    }

    const { data: settlements, error: settlementError } = await settlementQuery;

    if (settlementError) throw settlementError;

    // 按机械类型分组
    const analysis: Record<string, any> = {};
    settlements?.forEach((item: any) => {
      const type = item.machinery_type;
      if (!analysis[type]) {
        analysis[type] = {
          machinery_type: type,
          total_income: 0,
          total_oil_fee: 0,
          total_shift_fee: 0,
          total_balance: 0,
          total_driver_salary: 0,
          total_repair_fee: 0,
          total_parts_fee: 0,
          total_actual_balance: 0,
          record_count: 0,
        };
      }
      analysis[type].total_income += item.income || 0;
      analysis[type].total_oil_fee += item.oil_fee || 0;
      analysis[type].total_shift_fee += item.shift_fee || 0;
      analysis[type].total_balance += item.balance || 0;
      analysis[type].total_driver_salary += item.driver_salary || 0;
      analysis[type].total_repair_fee += item.repair_fee || 0;
      analysis[type].total_parts_fee += item.parts_fee || 0;
      analysis[type].total_actual_balance += item.actual_balance || 0;
      analysis[type].record_count += 1;
    });

    // 计算利润率
    Object.values(analysis).forEach((item: any) => {
      item.profit_rate = item.total_income > 0 
        ? ((item.total_income - item.total_oil_fee - item.total_shift_fee - item.total_driver_salary - item.total_repair_fee - item.total_parts_fee) / item.total_income * 100).toFixed(2)
        : 0;
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        by_machinery_type: Object.values(analysis),
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error getting profit analysis report:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get profit analysis report',
      data: null,
    });
  }
});

// 获取人员工资报表
router.get('/salary-report', async (req: Request, res: Response) => {
  try {
    const { salary_month } = req.query;

    if (!salary_month) {
      return res.status(400).json({
        code: 400,
        message: 'salary_month is required (format: YYYY-MM)',
        data: null,
      });
    }

    // 获取工资数据
    const salaries = await DatabaseService.findMany({
      table: 'tb_salary',
      filters: { salary_month },
    });

    // 获取人员信息
    const personnel = await DatabaseService.findMany({
      table: 'tb_personnel',
      filters: { status: '在职' },
    });

    // 构建报表
    const report = {
      month: salary_month,
      generated_at: new Date().toISOString(),
      personnel_list: [] as any[],
      summary: {
        total_personnel: personnel.length,
        total_base_salary: 0,
        total_actual_salary: 0,
        total_paid: 0,
        total_unpaid: 0,
      },
    };

    salaries.forEach((salary: any) => {
      const person = personnel.find((p: any) => p.id === salary.personnel_id);
      if (person) {
        report.personnel_list.push({
          personnel_id: salary.personnel_id,
          name: person.name,
          position: person.position,
          base_salary: salary.base_salary,
          position_salary: salary.position_salary,
          overtime_pay: salary.overtime_pay,
          bonus: salary.bonus,
          deduction: salary.deduction,
          actual_salary: salary.actual_salary,
          payment_status: salary.payment_status,
          payment_amount: salary.payment_amount || 0,
        });

        report.summary.total_base_salary += salary.base_salary || 0;
        report.summary.total_actual_salary += salary.actual_salary || 0;
        report.summary.total_paid += salary.payment_amount || 0;
        report.summary.total_unpaid += (salary.actual_salary || 0) - (salary.payment_amount || 0);
      }
    });

    res.json({
      code: 200,
      message: 'success',
      data: report,
    });
  } catch (error: any) {
    console.error('Error getting salary report:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get salary report',
      data: null,
    });
  }
});

// 导出报表数据
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { report_type, start_date, end_date, format } = req.query;

    let data: any[] = [];
    let filename = '';

    switch (report_type) {
      case 'daily':
        const dailyData = await DatabaseService.findMany({
          table: 'tb_daily_settlement',
        });
        data = dailyData;
        filename = `daily_settlement_${start_date}_${end_date}`;
        break;

      case 'monthly':
        const monthlyData = await DatabaseService.findMany({
          table: 'tb_monthly_settlement',
        });
        data = monthlyData;
        filename = 'monthly_settlement';
        break;

      case 'truck':
        const truckData = await DatabaseService.findMany({
          table: 'tb_truck_record',
        });
        data = truckData;
        filename = 'truck_records';
        break;

      case 'oil':
        const oilData = await DatabaseService.findMany({
          table: 'tb_oil_record',
        });
        data = oilData;
        filename = 'oil_records';
        break;

      case 'salary':
        const salaryData = await DatabaseService.findMany({
          table: 'tb_salary',
        });
        data = salaryData;
        filename = 'salary_records';
        break;

      default:
        return res.status(400).json({
          code: 400,
          message: 'Invalid report_type. Must be: daily, monthly, truck, oil, or salary',
          data: null,
        });
    }

    if (format === 'csv') {
      // 生成CSV
      if (data.length === 0) {
        return res.status(400).json({
          code: 400,
          message: 'No data to export',
          data: null,
        });
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csvContent);
    }

    // 默认返回JSON
    res.json({
      code: 200,
      message: 'success',
      data: {
        report_type,
        exported_at: new Date().toISOString(),
        record_count: data.length,
        records: data,
      },
    });
  } catch (error: any) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to export report',
      data: null,
    });
  }
});

export default router;
