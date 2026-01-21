import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import Joi from 'joi';

const router = Router();

// 验证Schema
const personnelSchema = Joi.object({
  name: Joi.string().max(50).required(),
  position: Joi.string()
    .valid('司机', '机修工', '爆破工', '统计员')
    .required(),
  salary: Joi.number().precision(2).positive().required(),
  entry_date: Joi.date().required(),
  phone: Joi.string().max(20).required(),
  bank_account: Joi.string().max(50).allow(''),
  machinery_type: Joi.string().valid('自卸车', '挖掘机', '推土机', '装载机').allow(null),
  vehicle_no: Joi.string().max(20).allow(''),
  remark: Joi.string().allow(''),
  status: Joi.string().valid('在职', '离职').required(),
});

const updatePersonnelSchema = Joi.object({
  name: Joi.string().max(50),
  position: Joi.string().valid('司机', '机修工', '爆破工', '统计员'),
  salary: Joi.number().precision(2).positive(),
  entry_date: Joi.date(),
  phone: Joi.string().max(20),
  bank_account: Joi.string().max(50).allow(''),
  machinery_type: Joi.string().valid('自卸车', '挖掘机', '推土机', '装载机').allow(null),
  vehicle_no: Joi.string().max(20).allow(''),
  vehicle_change_date: Joi.date().allow(null),
  remark: Joi.string().allow(''),
  status: Joi.string().valid('在职', '离职'),
});

// 获取所有人员信息
router.get('/', async (req: Request, res: Response) => {
  try {
    const { position, status, name } = req.query;

    const filters: Record<string, any> = {};
    if (position) filters.position = position;
    if (status) filters.status = status;
    if (name) filters.name = { ilike: `%${name}%` };

    const data = await DatabaseService.findMany({
      table: 'tb_personnel',
      filters,
      orderBy: 'name',
      orderDir: 'asc',
    });

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting personnel:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get personnel',
      data: null,
    });
  }
});

// 获取单个人员信息
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await DatabaseService.findOne('tb_personnel', { id: parseInt(id) });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'Personnel not found',
        data: null,
      });
    }

    // 获取该人员的车辆变更历史
    const history = await DatabaseService.findMany({
      table: 'tb_personnel_vehicle_history',
      filters: { personnel_id: parseInt(id) },
      orderBy: 'start_date',
      orderDir: 'desc',
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        ...data,
        vehicle_history: history,
      },
    });
  } catch (error: any) {
    console.error('Error getting personnel:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get personnel',
      data: null,
    });
  }
});

// 检查电话是否已存在
router.get('/check/phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        code: 400,
        message: 'phone is required',
        data: null,
      });
    }

    const existing = await DatabaseService.findOne('tb_personnel', {
      phone: phone as string,
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        exists: !!existing,
        personnel: existing,
      },
    });
  } catch (error: any) {
    console.error('Error checking phone:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to check phone',
      data: null,
    });
  }
});

// 获取所有在职人员（用于下拉选择）
router.get('/active/list', async (req: Request, res: Response) => {
  try {
    const { position } = req.query;

    const filters: Record<string, any> = { status: '在职' };
    if (position) filters.position = position;

    const data = await DatabaseService.findMany({
      table: 'tb_personnel',
      filters,
      select: 'id, name, position, phone, machinery_type, vehicle_no',
      orderBy: 'name',
      orderDir: 'asc',
    });

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting active personnel:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get active personnel',
      data: null,
    });
  }
});

// 创建人员信息
router.post('/', async (req: Request, res: Response) => {
  try {
    // 验证数据
    const { error, value } = personnelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    // 计算日工资
    value.daily_salary = value.salary / 30;

    // 检查电话是否已存在
    const existing = await DatabaseService.findOne('tb_personnel', {
      phone: value.phone,
    });

    if (existing) {
      return res.status(400).json({
        code: 400,
        message: '该电话号码已存在',
        data: null,
      });
    }

    // 创建人员记录
    const personnel = await DatabaseService.insert('tb_personnel', value);

    // 如果是司机，自动创建车辆变更历史
    if (value.position === '司机' && value.machinery_type && value.vehicle_no) {
      await DatabaseService.insert('tb_personnel_vehicle_history', {
        personnel_id: personnel.id,
        machinery_type: value.machinery_type,
        vehicle_no: value.vehicle_no,
        start_date: value.entry_date,
        change_reason: '入职',
      });
    }

    res.status(201).json({
      code: 201,
      message: 'Created successfully',
      data: personnel,
    });
  } catch (error: any) {
    console.error('Error creating personnel:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to create personnel',
      data: null,
    });
  }
});

// 更新人员信息
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证数据
    const { error, value } = updatePersonnelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    // 检查是否存在
    const existing = await DatabaseService.findOne('tb_personnel', {
      id: parseInt(id),
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Personnel not found',
        data: null,
      });
    }

    // 如果要修改电话，检查是否冲突
    if (value.phone && value.phone !== existing.phone) {
      const phoneExists = await DatabaseService.findOne('tb_personnel', {
        phone: value.phone,
      });

      if (phoneExists && phoneExists.id !== parseInt(id)) {
        return res.status(400).json({
          code: 400,
          message: '该电话号码已存在',
          data: null,
        });
      }
    }

    // 如果是司机且更换了车辆，需要处理历史记录
    if (
      value.position === '司机' &&
      (value.machinery_type !== existing.machinery_type ||
        value.vehicle_no !== existing.vehicle_no) &&
      value.vehicle_change_date
    ) {
      // 关闭旧的历史记录
      await DatabaseService.update(
        'tb_personnel_vehicle_history',
        {
          personnel_id: parseInt(id),
          end_date: null,
        },
        { end_date: new Date(new Date(value.vehicle_change_date).getTime() - 86400000).toISOString().split('T')[0] }
      );

      // 创建新的历史记录
      await DatabaseService.insert('tb_personnel_vehicle_history', {
        personnel_id: parseInt(id),
        machinery_type: value.machinery_type,
        vehicle_no: value.vehicle_no,
        start_date: value.vehicle_change_date,
        change_reason: '换车',
      });
    }

    // 如果是离职
    if (value.status === '离职' && existing.status !== '离职') {
      // 关闭最后一条历史记录的end_date
      const { data: lastHistory } = await supabase
        .from('tb_personnel_vehicle_history')
        .select('*')
        .eq('personnel_id', parseInt(id))
        .is('end_date', null)
        .single();

      if (lastHistory) {
        await DatabaseService.update(
          'tb_personnel_vehicle_history',
          { id: lastHistory.id },
          { end_date: new Date().toISOString().split('T')[0] }
        );
      }
    }

    await DatabaseService.update('tb_personnel', { id: parseInt(id) }, value);

    // 获取更新后的数据
    const updated = await DatabaseService.findOne('tb_personnel', {
      id: parseInt(id),
    });

    res.json({
      code: 200,
      message: 'Updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating personnel:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to update personnel',
      data: null,
    });
  }
});

// 删除人员信息
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否存在
    const existing = await DatabaseService.findOne('tb_personnel', {
      id: parseInt(id),
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Personnel not found',
        data: null,
      });
    }

    await DatabaseService.delete('tb_personnel', { id: parseInt(id) });

    res.json({
      code: 200,
      message: 'Deleted successfully',
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting personnel:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to delete personnel',
      data: null,
    });
  }
});

// 获取人员车辆变更历史
router.get('/:id/vehicle-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await DatabaseService.findMany({
      table: 'tb_personnel_vehicle_history',
      filters: { personnel_id: parseInt(id) },
      orderBy: 'start_date',
      orderDir: 'desc',
    });

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting vehicle history:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get vehicle history',
      data: null,
    });
  }
});

// 统计信息
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { data: byPosition } = await supabase
      .from('tb_personnel')
      .select('position, status');

    const { data: salaryStats } = await supabase
      .from('tb_personnel')
      .select('salary')
      .eq('status', '在职');

    // 按职位统计
    const positionStats: Record<string, { total: number; active: number }> = {};
    for (const item of byPosition || []) {
      if (!positionStats[item.position]) {
        positionStats[item.position] = { total: 0, active: 0 };
      }
      positionStats[item.position].total++;
      if (item.status === '在职') {
        positionStats[item.position].active++;
      }
    }

    // 工资统计
    const salaries = (salaryStats || []).map((s) => s.salary || 0);
    const avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;

    res.json({
      code: 200,
      message: 'success',
      data: {
        by_position: positionStats,
        total_personnel: byPosition?.length || 0,
        active_personnel: salaryStats?.length || 0,
        average_salary: avgSalary,
      },
    });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get stats',
      data: null,
    });
  }
});

export default router;
