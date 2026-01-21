import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import Joi from 'joi';

const router = Router();

// 验证Schema
const truckRecordSchema = Joi.object({
  record_date: Joi.date().required(),
  machinery_type: Joi.string()
    .valid('自卸车', '挖掘机', '推土机', '装载机')
    .required(),
  vehicle_no: Joi.string().max(20).required(),
  load_type: Joi.string()
    .valid('重车', '空车')
    .required(),
  load_times: Joi.number().integer().min(0).required(),
  capacity: Joi.number().precision(2).positive().required(),
  unit_price: Joi.number().precision(2).positive().required(),
  distance: Joi.number().precision(2).positive().allow(0),
  work_content: Joi.string().max(200).allow(''),
  remark: Joi.string().allow(''),
});

const updateTruckRecordSchema = Joi.object({
  record_date: Joi.date(),
  machinery_type: Joi.string().valid('自卸车', '挖掘机', '推土机', '装载机'),
  vehicle_no: Joi.string().max(20),
  load_type: Joi.string().valid('重车', '空车'),
  load_times: Joi.number().integer().min(0),
  capacity: Joi.number().precision(2).positive(),
  unit_price: Joi.number().precision(2).positive(),
  distance: Joi.number().precision(2).positive().allow(0),
  work_content: Joi.string().max(200).allow(''),
  remark: Joi.string().allow(''),
});

// 获取所有车次记录
router.get('/', async (req: Request, res: Response) => {
  try {
    const { record_date, machinery_type, vehicle_no, start_date, end_date, limit, offset } = req.query;

    const filters: Record<string, any> = {};
    if (record_date) filters.record_date = record_date;
    if (machinery_type) filters.machinery_type = machinery_type;
    if (vehicle_no) filters.vehicle_no = vehicle_no;

    let query = DatabaseService.findMany({
      table: 'tb_truck_record',
      filters,
      orderBy: 'record_date',
      orderDir: 'desc',
    });

    if (limit) {
      query = await DatabaseService.findMany({
        table: 'tb_truck_record',
        filters,
        orderBy: 'record_date',
        orderDir: 'desc',
        limit: parseInt(limit as string),
        offset: offset ? parseInt(offset as string) : 0,
      });
    } else {
      query = await query;
    }

    res.json({
      code: 200,
      message: 'success',
      data: query,
    });
  } catch (error: any) {
    console.error('Error getting truck records:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get truck records',
      data: null,
    });
  }
});

// 获取单个车次记录
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await DatabaseService.findOne('tb_truck_record', { id: parseInt(id) });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'Truck record not found',
        data: null,
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting truck record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get truck record',
      data: null,
    });
  }
});

// 创建车次记录
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = truckRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await DatabaseService.insert('tb_truck_record', value);

    res.status(201).json({
      code: 201,
      message: 'Truck record created successfully',
      data: data,
    });
  } catch (error: any) {
    console.error('Error creating truck record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to create truck record',
      data: null,
    });
  }
});

// 更新车次记录
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error, value } = updateTruckRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    const existing = await DatabaseService.findOne('tb_truck_record', { id: parseInt(id) });
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Truck record not found',
        data: null,
      });
    }

    const { data, error: updateError } = await (DatabaseService as any).update(
      'tb_truck_record',
      parseInt(id),
      value
    );

    if (updateError) {
      throw updateError;
    }

    res.json({
      code: 200,
      message: 'Truck record updated successfully',
      data: data,
    });
  } catch (error: any) {
    console.error('Error updating truck record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to update truck record',
      data: null,
    });
  }
});

// 删除车次记录
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await DatabaseService.findOne('tb_truck_record', { id: parseInt(id) });
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Truck record not found',
        data: null,
      });
    }

    await (DatabaseService as any).delete('tb_truck_record', parseInt(id));

    res.json({
      code: 200,
      message: 'Truck record deleted successfully',
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting truck record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to delete truck record',
      data: null,
    });
  }
});

// 批量导入车次记录
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'Records must be a non-empty array',
        data: null,
      });
    }

    // 验证所有记录
    for (let i = 0; i < records.length; i++) {
      const { error } = truckRecordSchema.validate(records[i]);
      if (error) {
        return res.status(400).json({
          code: 400,
          message: `Record ${i + 1}: ${error.details[0].message}`,
          data: null,
        });
      }
    }

    const data = await DatabaseService.insertMany('tb_truck_record', records);

    res.status(201).json({
      code: 201,
      message: `Successfully imported ${data.length} truck records`,
      data: data,
    });
  } catch (error: any) {
    console.error('Error importing truck records:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to import truck records',
      data: null,
    });
  }
});

export default router;
