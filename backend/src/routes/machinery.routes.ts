import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import Joi from 'joi';

const router = Router();

// 验证Schema
const machinerySchema = Joi.object({
  machinery_type: Joi.string()
    .valid('自卸车', '挖掘机', '推土机', '装载机')
    .required(),
  vehicle_no: Joi.string().max(20).required(),
  model: Joi.string().max(100).allow(''),
  capacity: Joi.number().precision(2).positive().allow(null),
  owner_unit: Joi.string().max(100).required(),
  is_rental: Joi.boolean().required(),
  rental_fee: Joi.number().precision(2).positive().allow(null),
  rental_unit: Joi.string().valid('月', '天').allow(null),
  status: Joi.string()
    .valid('在用', '停用', '维修中')
    .required(),
  remark: Joi.string().allow(''),
});

const updateMachinerySchema = Joi.object({
  machinery_type: Joi.string()
    .valid('自卸车', '挖掘机', '推土机', '装载机'),
  vehicle_no: Joi.string().max(20),
  model: Joi.string().max(100).allow(''),
  capacity: Joi.number().precision(2).positive().allow(null),
  owner_unit: Joi.string().max(100),
  is_rental: Joi.boolean(),
  rental_fee: Joi.number().precision(2).positive().allow(null),
  rental_unit: Joi.string().valid('月', '天').allow(null),
  status: Joi.string().valid('在用', '停用', '维修中'),
  remark: Joi.string().allow(''),
});

// 获取所有机械信息
router.get('/', async (req: Request, res: Response) => {
  try {
    const { machinery_type, status } = req.query;

    const filters: Record<string, any> = {};
    if (machinery_type) filters.machinery_type = machinery_type;
    if (status) filters.status = status;

    const data = await DatabaseService.findMany({
      table: 'tb_machinery',
      filters,
      orderBy: 'vehicle_no',
      orderDir: 'asc',
    });

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting machinery:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get machinery',
      data: null,
    });
  }
});

// 获取单个机械信息
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await DatabaseService.findOne('tb_machinery', { id: parseInt(id) });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'Machinery not found',
        data: null,
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting machinery:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get machinery',
      data: null,
    });
  }
});

// 检查车号是否存在
router.get('/check/vehicle-no', async (req: Request, res: Response) => {
  try {
    const { machinery_type, vehicle_no } = req.query;

    if (!machinery_type || !vehicle_no) {
      return res.status(400).json({
        code: 400,
        message: 'machinery_type and vehicle_no are required',
        data: null,
      });
    }

    const existing = await DatabaseService.findOne('tb_machinery', {
      machinery_type: machinery_type as string,
      vehicle_no: vehicle_no as string,
    });

    res.json({
      code: 200,
      message: 'success',
      data: {
        exists: !!existing,
        machinery: existing,
      },
    });
  } catch (error: any) {
    console.error('Error checking vehicle no:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to check vehicle no',
      data: null,
    });
  }
});

// 获取在用车辆列表（用于下拉选择）
router.get('/active/list', async (req: Request, res: Response) => {
  try {
    const { machinery_type } = req.query;

    const filters: Record<string, any> = { status: '在用' };
    if (machinery_type) filters.machinery_type = machinery_type;

    const data = await DatabaseService.findMany({
      table: 'tb_machinery',
      filters,
      select: 'id, machinery_type, vehicle_no, model, capacity',
      orderBy: 'vehicle_no',
      orderDir: 'asc',
    });

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting active vehicles:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get active vehicles',
      data: null,
    });
  }
});

// 创建机械信息
router.post('/', async (req: Request, res: Response) => {
  try {
    // 验证数据
    const { error, value } = machinerySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    // 检查车号是否已存在
    const existing = await DatabaseService.findOne('tb_machinery', {
      machinery_type: value.machinery_type,
      vehicle_no: value.vehicle_no,
    });

    if (existing) {
      return res.status(400).json({
        code: 400,
        message: `该车型(${value.machinery_type})的车号(${value.vehicle_no})已存在`,
        data: null,
      });
    }

    const data = await DatabaseService.insert('tb_machinery', value);

    res.status(201).json({
      code: 201,
      message: 'Created successfully',
      data: data,
    });
  } catch (error: any) {
    console.error('Error creating machinery:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to create machinery',
      data: null,
    });
  }
});

// 更新机械信息
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证数据
    const { error, value } = updateMachinerySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    // 检查是否存在
    const existing = await DatabaseService.findOne('tb_machinery', {
      id: parseInt(id),
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Machinery not found',
        data: null,
      });
    }

    // 如果要修改车型或车号，检查是否冲突
    if (value.machinery_type || value.vehicle_no) {
      const newType = value.machinery_type || existing.machinery_type;
      const newNo = value.vehicle_no || existing.vehicle_no;

      if (newType !== existing.machinery_type || newNo !== existing.vehicle_no) {
        const conflict = await DatabaseService.findOne('tb_machinery', {
          machinery_type: newType,
          vehicle_no: newNo,
        });

        if (conflict && conflict.id !== parseInt(id)) {
          return res.status(400).json({
            code: 400,
            message: `该车型(${newType})的车号(${newNo})已存在`,
            data: null,
          });
        }
      }
    }

    await DatabaseService.update('tb_machinery', { id: parseInt(id) }, value);

    // 获取更新后的数据
    const updated = await DatabaseService.findOne('tb_machinery', {
      id: parseInt(id),
    });

    res.json({
      code: 200,
      message: 'Updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating machinery:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to update machinery',
      data: null,
    });
  }
});

// 删除机械信息
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查是否存在
    const existing = await DatabaseService.findOne('tb_machinery', {
      id: parseInt(id),
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Machinery not found',
        data: null,
      });
    }

    await DatabaseService.delete('tb_machinery', { id: parseInt(id) });

    res.json({
      code: 200,
      message: 'Deleted successfully',
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting machinery:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to delete machinery',
      data: null,
    });
  }
});

// 批量删除
router.post('/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'ids array is required',
        data: null,
      });
    }

    for (const id of ids) {
      await DatabaseService.delete('tb_machinery', { id });
    }

    res.json({
      code: 200,
      message: `Deleted ${ids.length} records successfully`,
      data: null,
    });
  } catch (error: any) {
    console.error('Error batch deleting machinery:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to batch delete machinery',
      data: null,
    });
  }
});

// 统计信息
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { data: byType } = await supabase
      .from('tb_machinery')
      .select('machinery_type, status')
      .order('machinery_type');

    const { data: rentalStats } = await supabase
      .from('tb_machinery')
      .select('is_rental, rental_fee')
      .eq('is_rental', true);

    // 按类型统计
    const typeStats: Record<string, { total: number; inUse: number; maintenance: number; stopped: number }> = {};
    for (const item of byType || []) {
      if (!typeStats[item.machinery_type]) {
        typeStats[item.machinery_type] = { total: 0, inUse: 0, maintenance: 0, stopped: 0 };
      }
      typeStats[item.machinery_type].total++;
      if (item.status === '在用') typeStats[item.machinery_type].inUse++;
      else if (item.status === '维修中') typeStats[item.machinery_type].maintenance++;
      else typeStats[item.machinery_type].stopped++;
    }

    // 租赁统计
    const totalRentalFee = (rentalStats || []).reduce(
      (sum, item) => sum + (item.rental_fee || 0),
      0
    );

    res.json({
      code: 200,
      message: 'success',
      data: {
        by_type: typeStats,
        total_vehicles: byType?.length || 0,
        rental_vehicles: rentalStats?.length || 0,
        total_rental_fee: totalRentalFee,
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
