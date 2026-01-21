import { Router, Request, Response } from 'express';
import { DatabaseService, PriceService } from '../services/database.service';
import { supabase } from '../config';
import Joi from 'joi';

const router = Router();

// 验证Schema
const oilRecordSchema = Joi.object({
  record_date: Joi.date().required(),
  machinery_type: Joi.string()
    .valid('自卸车', '挖掘机', '推土机', '装载机')
    .required(),
  vehicle_no: Joi.string().max(20).required(),
  oil_amount: Joi.number().precision(2).positive().required(),
  remark: Joi.string().allow(''),
});

// 获取油料记录
router.get('/', async (req: Request, res: Response) => {
  try {
    const { record_date, machinery_type, vehicle_no, start_date, end_date } = req.query;

    const filters: Record<string, any> = {};
    if (record_date) filters.record_date = record_date;
    if (machinery_type) filters.machinery_type = machinery_type;
    if (vehicle_no) filters.vehicle_no = vehicle_no;

    let query = supabase.from('tb_oil_record').select('*').order('create_time', { ascending: false });

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

    const { data, error } = await query.limit(100);

    if (error) throw error;

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting oil records:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get oil records',
      data: null,
    });
  }
});

// 获取单个油料记录
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await DatabaseService.findOne('tb_oil_record', { id: parseInt(id) });

    if (!data) {
      return res.status(404).json({
        code: 404,
        message: 'Oil record not found',
        data: null,
      });
    }

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting oil record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get oil record',
      data: null,
    });
  }
});

// 获取指定日期的油价
router.get('/price/diesel', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        code: 400,
        message: 'date is required',
        data: null,
      });
    }

    const price = await PriceService.getOilPrice('柴油', date as string);

    res.json({
      code: 200,
      message: 'success',
      data: { price },
    });
  } catch (error: any) {
    console.error('Error getting oil price:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get oil price',
      data: null,
    });
  }
});

// 创建油料记录
router.post('/', async (req: Request, res: Response) => {
  try {
    // 验证数据
    const { error, value } = oilRecordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 400,
        message: error.details[0].message,
        data: null,
      });
    }

    // 获取当日油价
    const oilPrice = await PriceService.getOilPrice('柴油', value.record_date);

    // 计算总费用
    const totalFee = value.oil_amount * oilPrice;

    const data = await DatabaseService.insert('tb_oil_record', {
      ...value,
      oil_price: oilPrice,
      total_fee: totalFee,
    });

    res.status(201).json({
      code: 201,
      message: 'Created successfully',
      data: data,
    });
  } catch (error: any) {
    console.error('Error creating oil record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to create oil record',
      data: null,
    });
  }
});

// 批量创建油料记录
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'records array is required',
        data: null,
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const { error: validationError } = oilRecordSchema.validate(record);

        if (validationError) {
          errors.push({
            index: i,
            error: validationError.details[0].message,
          });
          continue;
        }

        const oilPrice = await PriceService.getOilPrice('柴油', record.record_date);
        const totalFee = record.oil_amount * oilPrice;

        const data = await DatabaseService.insert('tb_oil_record', {
          ...record,
          oil_price: oilPrice,
          total_fee: totalFee,
        });

        results.push(data);
      } catch (err: any) {
        errors.push({
          index: i,
          error: err.message,
        });
      }
    }

    res.status(201).json({
      code: 201,
      message: `Created ${results.length} records, ${errors.length} errors`,
      data: {
        success: results,
        errors: errors,
      },
    });
  } catch (error: any) {
    console.error('Error batch creating oil records:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to batch create oil records',
      data: null,
    });
  }
});

// 更新油料记录
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { oil_amount, record_date, remark } = req.body;

    // 检查是否存在
    const existing = await DatabaseService.findOne('tb_oil_record', {
      id: parseInt(id),
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Oil record not found',
        data: null,
      });
    }

    // 重新计算
    const date = record_date || existing.record_date;
    const oilPrice = await PriceService.getOilPrice('柴油', date);
    const amount = oil_amount || existing.oil_amount;
    const totalFee = amount * oilPrice;

    await DatabaseService.update(
      'tb_oil_record',
      { id: parseInt(id) },
      {
        oil_amount: amount,
        oil_price: oilPrice,
        total_fee: totalFee,
        record_date: date,
        remark: remark || existing.remark,
      }
    );

    // 获取更新后的数据
    const updated = await DatabaseService.findOne('tb_oil_record', {
      id: parseInt(id),
    });

    res.json({
      code: 200,
      message: 'Updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating oil record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to update oil record',
      data: null,
    });
  }
});

// 删除油料记录
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await DatabaseService.findOne('tb_oil_record', {
      id: parseInt(id),
    });

    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: 'Oil record not found',
        data: null,
      });
    }

    await DatabaseService.delete('tb_oil_record', { id: parseInt(id) });

    res.json({
      code: 200,
      message: 'Deleted successfully',
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting oil record:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to delete oil record',
      data: null,
    });
  }
});

// 统计油料消耗
router.get('/stats/consumption', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, machinery_type } = req.query;

    let query = supabase
      .from('tb_oil_record')
      .select('record_date, machinery_type, oil_amount, total_fee');

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

    // 按日期汇总
    const byDate: Record<string, { oil_amount: number; fee: number }> = {};
    // 按类型汇总
    const byType: Record<string, { oil_amount: number; fee: number }> = {};

    for (const record of data || []) {
      // 按日期
      if (!byDate[record.record_date]) {
        byDate[record.record_date] = { oil_amount: 0, fee: 0 };
      }
      byDate[record.record_date].oil_amount += record.oil_amount || 0;
      byDate[record.record_date].fee += record.total_fee || 0;

      // 按类型
      if (!byType[record.machinery_type]) {
        byType[record.machinery_type] = { oil_amount: 0, fee: 0 };
      }
      byType[record.machinery_type].oil_amount += record.oil_amount || 0;
      byType[record.machinery_type].fee += record.total_fee || 0;
    }

    const totalOil = (data || []).reduce((sum, r) => sum + (r.oil_amount || 0), 0);
    const totalFee = (data || []).reduce((sum, r) => sum + (r.total_fee || 0), 0);

    res.json({
      code: 200,
      message: 'success',
      data: {
        total_oil: totalOil,
        total_fee: totalFee,
        by_date: byDate,
        by_type: byType,
        record_count: data?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error getting consumption stats:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get consumption stats',
      data: null,
    });
  }
});

export default router;
