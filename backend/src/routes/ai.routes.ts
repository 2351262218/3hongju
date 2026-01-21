import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { DatabaseService } from '../services/database.service';

const router = Router();

// 发送对话消息
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { question, tableName, conditions, machineryType, vehicleNo, startDate, endDate } = req.body;

    if (!question) {
      return res.status(400).json({
        code: 400,
        message: 'question is required',
        data: null,
      });
    }

    // 如果指定了分析类型，进行分析
    if (machineryType || vehicleNo) {
      const result = await AIService.analyze(question, machineryType, vehicleNo, startDate, endDate);
      return res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    }

    // 如果指定了表名和条件，进行智能查询
    if (tableName) {
      const result = await AIService.smartQuery(question, tableName, conditions || {});
      return res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    }

    // 普通对话
    const result = await AIService.chat(question, '', null);
    res.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'AI service error',
      data: null,
    });
  }
});

// 获取对话历史
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.query;

    const conversations = await AIService.getConversationHistory(
      session_id as string
    );

    res.json({
      code: 200,
      message: 'success',
      data: conversations,
    });
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get conversations',
      data: null,
    });
  }
});

// 清除对话历史
router.delete('/conversations', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.query;

    await AIService.clearConversationHistory(session_id as string);

    res.json({
      code: 200,
      message: 'Conversations cleared',
      data: null,
    });
  } catch (error: any) {
    console.error('Error clearing conversations:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to clear conversations',
      data: null,
    });
  }
});

// 常见问题示例
router.get('/examples', async (req: Request, res: Response) => {
  try {
    const examples = [
      {
        category: '数据查询',
        questions: [
          '001号自卸车1月份的总油耗是多少？',
          '张三的工资是多少？',
          '上个月总共花了多少钱？',
          '哪台车的利润最高？',
        ],
      },
      {
        category: '数据计算',
        questions: [
          '帮我算一下001号车1月份的净利润',
          '所有自卸车的平均油耗是多少？',
          '如果油价涨到8元每升，成本会增加多少？',
        ],
      },
      {
        category: '数据分析',
        questions: [
          '为什么002号车一直亏损？',
          '哪台车的油耗最高？',
          '最近一周的利润为什么下降了？',
        ],
      },
      {
        category: '对比分析',
        questions: [
          '001号车和002号车哪个更赚钱？',
          '1月份和12月份的成本有什么变化？',
          '自卸车和挖掘机哪个利润更高？',
        ],
      },
      {
        category: '决策建议',
        questions: [
          '给我一些降低成本的建议',
          '应该淘汰哪台车？',
          '如何提高利润？',
        ],
      },
      {
        category: '异常诊断',
        questions: [
          '为什么001号车的油耗突然升高？',
          '002号车的维修费为什么这么高？',
          '最近为什么一直亏损？',
        ],
      },
      {
        category: '预测分析',
        questions: [
          '预测一下2月份的总成本',
          '按照目前的趋势，今年能赚多少钱？',
          '如果继续这样下去，多久会回本？',
        ],
      },
    ];

    res.json({
      code: 200,
      message: 'success',
      data: examples,
    });
  } catch (error: any) {
    console.error('Error getting examples:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get examples',
      data: null,
    });
  }
});

// 获取AI知识库
router.get('/knowledge', async (req: Request, res: Response) => {
  try {
    const { knowledge_type } = req.query;

    const filters: Record<string, any> = {};
    if (knowledge_type) filters.knowledge_type = knowledge_type;

    const knowledge = await DatabaseService.findMany({
      table: 'tb_ai_knowledge',
      filters,
      orderBy: 'knowledge_type',
      orderDir: 'asc',
    });

    res.json({
      code: 200,
      message: 'success',
      data: knowledge,
    });
  } catch (error: any) {
    console.error('Error getting knowledge:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to get knowledge',
      data: null,
    });
  }
});

// 添加AI知识
router.post('/knowledge', async (req: Request, res: Response) => {
  try {
    const { knowledge_type, title, content, keywords } = req.body;

    if (!knowledge_type || !title || !content || !keywords) {
      return res.status(400).json({
        code: 400,
        message: 'knowledge_type, title, content and keywords are required',
        data: null,
      });
    }

    const data = await DatabaseService.insert('tb_ai_knowledge', {
      knowledge_type,
      title,
      content,
      keywords,
    });

    res.status(201).json({
      code: 201,
      message: 'Knowledge added successfully',
      data: data,
    });
  } catch (error: any) {
    console.error('Error adding knowledge:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to add knowledge',
      data: null,
    });
  }
});

// 智能问答 - 油耗查询
router.post('/query/oil', async (req: Request, res: Response) => {
  try {
    const { machinery_type, vehicle_no, start_date, end_date } = req.body;

    // 查询油料记录
    let query = supabase
      .from('tb_oil_record')
      .select('record_date, machinery_type, vehicle_no, oil_amount, total_fee')
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

    const { data: oilData, error: oilError } = await query;

    if (oilError) throw oilError;

    // 查询车数记录（用于计算单车油耗）
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

    // 汇总计算
    const totalOil = (oilData || []).reduce((sum, r) => sum + (r.oil_amount || 0), 0);
    const totalFee = (oilData || []).reduce((sum, r) => sum + (r.total_fee || 0), 0);
    const totalTrucks = (truckData || []).reduce((sum, r) => sum + (r.truck_count || 0), 0);
    const totalCapacity = (truckData || []).reduce((sum, r) => sum + (r.total_capacity || 0), 0);

    const perTruckOil = totalTrucks > 0 ? totalOil / totalTrucks : 0;
    const perCapacityOil = totalCapacity > 0 ? totalOil / totalCapacity : 0;

    res.json({
      code: 200,
      message: 'success',
      data: {
        summary: {
          total_oil: totalOil,
          total_fee: totalFee,
          total_trucks: totalTrucks,
          total_capacity: totalCapacity,
          per_truck_oil: perTruckOil,
          per_capacity_oil: perCapacityOil,
        },
        oil_records: oilData?.slice(0, 50) || [],
        truck_records: truckData?.slice(0, 50) || [],
      },
    });
  } catch (error: any) {
    console.error('Error querying oil data:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to query oil data',
      data: null,
    });
  }
});

// 智能问答 - 利润查询
router.post('/query/profit', async (req: Request, res: Response) => {
  try {
    const { machinery_type, vehicle_no, start_date, end_date } = req.body;

    // 查询结算记录
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

    // 汇总计算
    let totalIncome = 0;
    let totalExpense = 0;
    let totalActualBalance = 0;
    let profitableDays = 0;
    let lossDays = 0;

    for (const record of data || []) {
      totalIncome += record.income || 0;
      totalExpense +=
        (record.oil_fee || 0) +
        (record.shift_fee || 0) +
        (record.driver_salary || 0) +
        (record.meal_fee || 0) +
        (record.repair_fee || 0);
      totalActualBalance += record.actual_balance || 0;

      if (record.actual_balance >= 0) {
        profitableDays++;
      } else {
        lossDays++;
      }
    }

    const profit = totalIncome - totalExpense;

    // 按日期趋势
    const byDate: Record<string, any> = {};
    for (const record of data || []) {
      if (!byDate[record.record_date]) {
        byDate[record.record_date] = {
          income: 0,
          expense: 0,
          balance: 0,
        };
      }
      byDate[record.record_date].income += record.income || 0;
      byDate[record.record_date].expense +=
        (record.oil_fee || 0) +
        (record.shift_fee || 0) +
        (record.driver_salary || 0) +
        (record.meal_fee || 0) +
        (record.repair_fee || 0);
      byDate[record.record_date].balance += record.actual_balance || 0;
    }

    res.json({
      code: 200,
      message: 'success',
      data: {
        summary: {
          total_income: totalIncome,
          total_expense: totalExpense,
          profit: profit,
          actual_balance: totalActualBalance,
          profitable_days: profitableDays,
          loss_days: lossDays,
          total_days: data?.length || 0,
          profit_rate: data?.length ? (profitableDays / data.length) * 100 : 0,
        },
        by_date: byDate,
        daily_records: data,
      },
    });
  } catch (error: any) {
    console.error('Error querying profit data:', error);
    res.status(500).json({
      code: 500,
      message: error.message || 'Failed to query profit data',
      data: null,
    });
  }
});

export default router;
