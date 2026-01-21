import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { supabase } from '../config';
import Joi from 'joi';

const router = Router();

// 验证Schema
const attendanceDetailSchema = Joi.object({
  master_id: Joi.number().required(),
  personnel_id: Joi.number().required(),
  attendance_date: Joi.date().required(),
  attendance_status: Joi.string()
    .valid('出勤', '缺勤', '请假', '加班')
    .required(),
  meal_status: Joi.string()
    .valid('正常', '吃一顿', '不吃')
    .required(),
  remark: Joi.string().allow(''),
});

// 获取考勤主表列表
router.get('/master', async (req: Request, res: Response) => {
  try {
    const { year_month, status } = req.query;

    let query = supabase
      .from('tb_attendance_master')
      .select('*')
      .order('year_month', { ascending: false });

    if (year_month) {
      query = query.eq('year_month', year_month);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting attendance master:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get attendance master',
      data: null,
    });
  }
});

// 获取考勤明细
router.get('/detail', async (req: Request, res: Response) => {
  try {
    const { year_month, personnel_id, attendance_date, master_id } = req.query;

    let query = supabase
      .from('tb_attendance_detail')
      .select(
        `*,
        personnel:tb_personnel(id, name, position, machinery_type, vehicle_no)`
      )
      .order('attendance_date', { ascending: true });

    if (master_id) {
      query = query.eq('master_id', parseInt(master_id as string));
    } else if (year_month) {
      // 先获取主表ID
      const { data: masterData } = await supabase
        .from('tb_attendance_master')
        .select('id')
        .eq('year_month', year_month)
        .single();

      if (masterData) {
        query = query.eq('master_id', masterData.id);
      }
    }

    if (personnel_id) {
      query = query.eq('personnel_id', parseInt(personnel_id as string));
    }
    if (attendance_date) {
      query = query.eq('attendance_date', attendance_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      code: 200,
      message: 'success',
      data: data,
    });
  } catch (error: any) {
    console.error('Error getting attendance detail:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get attendance detail',
      data: null,
    });
  }
});

// 生成考勤表
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { year_month } = req.body;

    if (!year_month) {
      return res.status(400).json({
        code: 400,
        message: 'year_month is required',
        data: null,
      });
    }

    // 检查是否已存在
    const existing = await DatabaseService.findOne('tb_attendance_master', {
      year_month,
    });

    if (existing) {
      return res.status(400).json({
        code: 400,
        message: `考勤表 ${year_month} 已存在`,
        data: null,
      });
    }

    // 创建考勤主表
    const master = await DatabaseService.insert('tb_attendance_master', {
      year_month,
      status: '编辑中',
    });

    // 获取所有在职人员
    const { data: personnel, error } = await supabase
      .from('tb_personnel')
      .select('*')
      .eq('status', '在职');

    if (error) throw error;

    // 生成每天的考勤记录
    const daysInMonth = new Date(
      parseInt(year_month.substring(0, 4)),
      parseInt(year_month.substring(5, 7)),
      0
    ).getDate();

    const attendanceDetails = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year_month}-${day.toString().padStart(2, '0')}`;

      for (const person of personnel || []) {
        attendanceDetails.push({
          master_id: master.id,
          personnel_id: person.id,
          attendance_date: date,
          attendance_status: '出勤',
          meal_status: '正常',
        });
      }
    }

    // 批量插入考勤明细
    if (attendanceDetails.length > 0) {
      const { error: insertError } = await supabase
        .from('tb_attendance_detail')
        .insert(attendanceDetails);

      if (insertError) throw insertError;
    }

    res.status(201).json({
      code: 201,
      message: 'Attendance generated successfully',
      data: {
        master,
        personnel_count: personnel?.length || 0,
        days_in_month: daysInMonth,
        total_records: attendanceDetails.length,
      },
    });
  } catch (error: any) {
    console.error('Error generating attendance:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to generate attendance',
      data: null,
    });
  }
});

// 更新考勤明细
router.put('/detail/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { attendance_status, meal_status, remark } = req.body;

    const { error } = await supabase
      .from('tb_attendance_detail')
      .update({
        attendance_status,
        meal_status,
        remark,
      })
      .eq('id', parseInt(id));

    if (error) throw error;

    res.json({
      code: 200,
      message: 'Updated successfully',
      data: null,
    });
  } catch (error: any) {
    console.error('Error updating attendance detail:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to update attendance detail',
      data: null,
    });
  }
});

// 批量更新考勤
router.put('/detail/batch', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'updates array is required',
        data: null,
      });
    }

    for (const update of updates) {
      await supabase
        .from('tb_attendance_detail')
        .update({
          attendance_status: update.attendance_status,
          meal_status: update.meal_status,
          remark: update.remark,
        })
        .eq('id', update.id);
    }

    res.json({
      code: 200,
      message: `Updated ${updates.length} records`,
      data: null,
    });
  } catch (error: any) {
    console.error('Error batch updating attendance:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to batch update attendance',
      data: null,
    });
  }
});

// 一键填充考勤
router.post('/detail/fill-all', async (req: Request, res: Response) => {
  try {
    const { master_id, attendance_status, meal_status } = req.body;

    if (!master_id) {
      return res.status(400).json({
        code: 400,
        message: 'master_id is required',
        data: null,
      });
    }

    const { error } = await supabase
      .from('tb_attendance_detail')
      .update({
        attendance_status: attendance_status || '出勤',
        meal_status: meal_status || '正常',
      })
      .eq('master_id', master_id);

    if (error) throw error;

    res.json({
      code: 200,
      message: 'Filled all attendance records',
      data: null,
    });
  } catch (error: any) {
    console.error('Error filling attendance:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to fill attendance',
      data: null,
    });
  }
});

// 锁定考勤表
router.put('/master/:id/lock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await DatabaseService.update('tb_attendance_master', { id: parseInt(id) }, {
      status: '已锁定',
    });

    res.json({
      code: 200,
      message: 'Attendance locked successfully',
      data: null,
    });
  } catch (error: any) {
    console.error('Error locking attendance:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to lock attendance',
      data: null,
    });
  }
});

// 考勤统计
router.get('/stats/monthly', async (req: Request, res: Response) => {
  try {
    const { year_month } = req.query;

    if (!year_month) {
      return res.status(400).json({
        code: 400,
        message: 'year_month is required',
        data: null,
      });
    }

    // 获取主表
    const { data: masterData } = await supabase
      .from('tb_attendance_master')
      .select('id')
      .eq('year_month', year_month)
      .single();

    if (!masterData) {
      return res.status(404).json({
        code: 404,
        message: 'Attendance master not found',
        data: null,
      });
    }

    // 统计考勤状态
    const { data: stats, error } = await supabase
      .from('tb_attendance_detail')
      .select('attendance_status, meal_status')
      .eq('master_id', masterData.id);

    if (error) throw error;

    const statusCount: Record<string, number> = {};
    const mealCount: Record<string, number> = {};

    for (const record of stats || []) {
      statusCount[record.attendance_status] =
        (statusCount[record.attendance_status] || 0) + 1;
      mealCount[record.meal_status] = (mealCount[record.meal_status] || 0) + 1;
    }

    res.json({
      code: 200,
      message: 'success',
      data: {
        by_status: statusCount,
        by_meal: mealCount,
        total_records: stats?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get attendance stats',
      data: null,
    });
  }
});

export default router;
