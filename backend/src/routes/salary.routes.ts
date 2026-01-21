import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import Joi from 'joi';

const router = Router();

// 验证Schema
const salarySchema = Joi.object({
  personnel_id: Joi.number().required(),
  salary_month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  base_salary: Joi.number().precision(2).min(0).required(),
  position_salary: Joi.number().precision(2).min(0).required(),
  overtime_pay: Joi.number().precision(2).min(0).required(),
  bonus: Joi.number().precision(2).min(0).required(),
  deduction: Joi.number().precision(2).min(0).required(),
  meal_deduction: Joi.number().precision(2).min(0).required(),
  medical_deduction: Joi.number().precision(2).min(0).required(),
  other_deduction: Joi.number().precision(2).min(0).required(),
  actual_salary: Joi.number().precision(2).required(),
  payment_status: Joi.string()
    .valid('未发放', '部分发放', '已发放')
    .required(),
  payment_date: Joi.date().allow(null),
  payment_amount: Joi.number().precision(2).allow(0),
  remark: Joi.string().allow(''),
});

const updateSalarySchema = Joi.object({
  personnel_id: Joi.number(),
  salary_month: Joi.string().pattern(/^\d{4}-\d{2}$/),
  base_salary: Joi.number().precision(2).min(0),
  position_salary: Joi.number().precision(2).min(0),
  overtime_pay: Joi.number().precision(2).min(0),
  bonus: Joi.number().precision(2).min(0),
  deduction: Joi.number().precision(2).min(0),
  meal_deduction: Joi.number().precision(2).min(0),
  medical_deduction: Joi.number().precision(2).min(0),
  other_deduction: Joi.number().precision(2).min(0),
  actual_salary: Joi.number().precision(2),
  payment_status: Joi.string().valid('未发放', '部分发放', '已发放'),
  payment_date: Joi.date().allow(null),
  payment_amount: Joi.number().precision(2).allow(0),
  remark: Joi.string().allow(''),
});

// 获取所有工资记录
router.get('/', async (req: Request, res: Response) => {
  try {
    const { personnel_id, salary_month, payment_status, start_month, end_month, limit, offset } = req.query;

    const filters: Record<string, any> = {};
    if (personnel_id) filters.personnel_id = parseInt(personnel_id as string);
    if (salary_month) filters.salary_month = salary_month;
    if (payment_status) filters.payment_status = payment_status;

    let query;
    if (limit) {
      query = await DatabaseService.findMany({
        table: 'tb_salary',
        filters,
        orderBy: 'salary_month',
        orderDir: 'desc',
        limit: parseInt(limit as string),
        offset: offset ? parseInt(offset as string) : 0,
      });
    } else {
      query = await DatabaseService.findMany({
        table: 'tb_salary',
        filters,
        orderBy: 'salary_month',
        orderDir: 'desc',
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: query,
    });
  } catch (error: any) {
    console.error('Error getting salary records:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get salary records',
      data: null,
    });
  }
});

// 获取单个工资记录
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await DatabaseService.findOne('tb_salary', { id: parseInt(id) });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'Salary record not found',
        data: null,
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting salary record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get salary record',
      data: null,
    });
  }
});

// 创建工资记录
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = salarySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await DatabaseService.insert('tb_salary', value);

    res.status(201).json({
      code: 201,
      message: 'Salary record created successfully',
      data: data,
    });
  } catch (error: any) {
    console.error('Error creating salary record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to create salary record',
      data: null,
    });
  }
});

// 更新工资记录
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error, value } = updateSalarySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    const existing = await DatabaseService.findOne('tb_salary', { id: parseInt(id) });
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Salary record not found',
        data: null,
      });
    }

    const { data, error: updateError } = await (DatabaseService as any).update(
      'tb_salary',
      parseInt(id),
      value
    );

    if (updateError) {
      throw updateError;
    }

    res.json({
      code: 200,
      message: 'Salary record updated successfully',
      data: data,
    });
  } catch (error: any) {
    console.error('Error updating salary record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to update salary record',
      data: null,
    });
  }
});

// 删除工资记录
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await DatabaseService.findOne('tb_salary', { id: parseInt(id) });
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Salary record not found',
        data: null,
      });
    }

    await (DatabaseService as any).delete('tb_salary', parseInt(id));

    res.json({
      code: 200,
      message: 'Salary record deleted successfully',
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting salary record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to delete salary record',
      data: null,
    });
  }
});

// 获取工资汇总报表
router.get('/report/summary', async (req: Request, res: Response) => {
  try {
    const { salary_month } = req.query;

    if (!salary_month) {
      return res.status(400).json({
        code: 400,
        message: 'salary_month is required',
        data: null,
      });
    }

    const salaries = await DatabaseService.findMany({
      table: 'tb_salary',
      filters: { salary_month },
    });

    // 获取人员信息
    const personnel = await DatabaseService.findMany({
      table: 'tb_personnel',
      filters: { status: '在职' },
    });

    // 汇总统计
    const summary = {
      month: salary_month,
      total_personnel: personnel.length,
      total_base_salary: 0,
      total_position_salary: 0,
      total_overtime_pay: 0,
      total_bonus: 0,
      total_deduction: 0,
      total_actual_salary: 0,
      paid_amount: 0,
      unpaid_amount: 0,
      personnel_list: [] as any[],
    };

    salaries.forEach((salary: any) => {
      summary.total_base_salary += salary.base_salary || 0;
      summary.total_position_salary += salary.position_salary || 0;
      summary.total_overtime_pay += salary.overtime_pay || 0;
      summary.total_bonus += salary.bonus || 0;
      summary.total_deduction += salary.deduction || 0;
      summary.total_actual_salary += salary.actual_salary || 0;
      summary.paid_amount += salary.payment_amount || 0;
      summary.unpaid_amount += (salary.actual_salary || 0) - (salary.payment_amount || 0);

      const person = personnel.find((p: any) => p.id === salary.personnel_id);
      if (person) {
        summary.personnel_list.push({
          personnel_id: salary.personnel_id,
          name: person.name,
          position: person.position,
          actual_salary: salary.actual_salary,
          payment_status: salary.payment_status,
          payment_amount: salary.payment_amount || 0,
        });
      }
    });

    res.json({
      code: 200,
      message: 'success',
      data: summary,
    });
  } catch (error: any) {
    console.error('Error getting salary summary:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get salary summary',
      data: null,
    });
  }
});

// 批量生成工资记录
router.post('/batch-generate', async (req: Request, res: Response) => {
  try {
    const { salary_month, personnel_ids } = req.body;

    if (!salary_month || !personnel_ids || !Array.isArray(personnel_ids) || personnel_ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'salary_month and personnel_ids are required',
        data: null,
      });
    }

    // 检查是否已存在该月的工资记录
    const existingRecords = await DatabaseService.findMany({
      table: 'tb_salary',
      filters: { salary_month },
    });

    if (existingRecords.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `Salary records for ${salary_month} already exist`,
        data: null,
      });
    }

    // 获取人员信息
    const personnel = await DatabaseService.findMany({
      table: 'tb_personnel',
    });

    // 生成工资记录
    const salaryRecords: any[] = [];
    for (const personId of personnel_ids) {
      const person = personnel.find((p: any) => p.id === personId);
      if (!person) continue;

      const baseSalary = person.salary || 0;

      const record = {
        personnel_id: personId,
        salary_month,
        base_salary: baseSalary,
        position_salary: 0,
        overtime_pay: 0,
        bonus: 0,
        deduction: 0,
        meal_deduction: 0,
        medical_deduction: 0,
        other_deduction: 0,
        actual_salary: baseSalary,
        payment_status: '未发放',
        payment_date: null,
        payment_amount: 0,
        remark: '',
      };

      salaryRecords.push(record);
    }

    const data = await DatabaseService.insertMany('tb_salary', salaryRecords);

    res.status(201).json({
      code: 201,
      message: `Successfully generated ${data.length} salary records for ${salary_month}`,
      data: data,
    });
  } catch (error: any) {
    console.error('Error generating salary records:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to generate salary records',
      data: null,
    });
  }
});

export default router;
