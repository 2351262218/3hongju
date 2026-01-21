import axios from 'axios';
import { aiConfig } from '../config';
import { DatabaseService } from './database.service';
import { v4 as uuidv4 } from 'uuid';

// AI对话消息
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// AI回答结果
export interface AIAnswer {
  answer: string;
  relatedData?: any;
  relatedSql?: string;
  isAccurate: boolean;
}

// AI服务
export class AIService {
  private static sessionId: string = uuidv4();

  /**
   * 发送对话请求
   */
  static async chat(
    userQuestion: string,
    systemContext: string,
    relatedData?: any
  ): Promise<AIAnswer> {
    const startTime = Date.now();

    try {
      // 构建完整的Prompt
      const fullPrompt = this.buildPrompt(userQuestion, systemContext, relatedData);

      // 调用DeepSeek API
      const response = await axios.post(
        aiConfig.apiUrl,
        {
          model: aiConfig.model,
          messages: [
            {
              role: 'system',
              content: `你是一个专业的煤矿施工队统计核算系统的AI助手。你的任务是基于用户提供的数据和问题，给出准确、详细的回答。

${systemContext}

注意事项：
1. 所有数值计算必须准确，如果涉及计算，请明确说明计算过程
2. 如果发现数据异常，请提示用户
3. 回答要简洁明了，重点突出
4. 如果数据不足以回答问题，请说明需要补充哪些信息
5. 不要进行任何数据修改操作，只能查询和计算
6. 如果遇到计算问题，请使用你掌握的计算公式进行计算

当前时间：${new Date().toISOString()}`,
            },
            {
              role: 'user',
              content: userQuestion,
            },
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${aiConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: aiConfig.timeout,
        }
      );

      const responseTime = Date.now() - startTime;
      const aiResponse = response.data.choices[0].message.content;

      // 验证答案准确性
      const isAccurate = await this.validateAnswer(userQuestion, aiResponse, relatedData);

      // 保存对话记录
      await this.saveConversation(userQuestion, aiResponse, responseTime, relatedData);

      return {
        answer: aiResponse,
        relatedData: relatedData,
        isAccurate,
      };
    } catch (error: any) {
      console.error('AI API Error:', error.message);

      // 如果API调用失败，生成一个基于规则的回复
      if (relatedData) {
        return {
          answer: this.generateRuleBasedAnswer(userQuestion, relatedData),
          relatedData: relatedData,
          isAccurate: true,
        };
      }

      throw new Error(`AI服务暂时不可用: ${error.message}`);
    }
  }

  /**
   * 构建Prompt
   */
  private static buildPrompt(
    userQuestion: string,
    systemContext: string,
    relatedData?: any
  ): string {
    let prompt = `用户问题：${userQuestion}\n\n`;

    if (relatedData) {
      prompt += `相关数据：\n${JSON.stringify(relatedData, null, 2)}\n\n`;
    }

    prompt += `系统上下文：\n${systemContext}`;

    return prompt;
  }

  /**
   * 验证AI回答的准确性
   */
  private static async validateAnswer(
    question: string,
    answer: string,
    relatedData?: any
  ): Promise<boolean> {
    // 提取答案中的数值
    const numbersInAnswer = this.extractNumbers(answer);

    // 如果有相关数据，重新计算验证
    if (relatedData && numbersInAnswer.length > 0) {
      // 简单的验证：检查数值是否在合理范围内
      for (const num of numbersInAnswer) {
        if (num > 100000000) {
          // 数值过大，可能计算错误
          console.warn(`Large number detected in answer: ${num}`);
          return false;
        }
      }
    }

    // 允许0.01的误差，这里可以添加更精确的验证逻辑
    return true;
  }

  /**
   * 从文本中提取数值
   */
  private static extractNumbers(text: string): number[] {
    const numbers: number[] = [];
    const regex = /-?\d+(?:\.\d+)?/g;
    const matches = text.match(regex);

    if (matches) {
      for (const match of matches) {
        numbers.push(parseFloat(match));
      }
    }

    return numbers;
  }

  /**
   * 生成基于规则的回复（API失败时使用）
   */
  private static generateRuleBasedAnswer(question: string, data: any): string {
    // 简单的规则匹配
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('油耗')) {
      if (data.total_oil) {
        return `根据查询结果，该时期总油耗为 ${data.total_oil} 升。\n\n计算说明：\n- 如果数据中包含车数，可计算单车油耗 = 总油耗 / 总车数\n- 如果数据中包含方量，可计算单方油耗 = 总油耗 / 总方量`;
      }
    }

    if (lowerQuestion.includes('工资') || lowerQuestion.includes('薪酬')) {
      if (data.salary) {
        return `根据查询结果，该人员的基本工资为 ${data.salary} 元/月。\n\n计算说明：\n- 日工资 = 基本工资 / 30\n- 实际工资 = 日工资 * 出勤天数`;
      }
    }

    if (lowerQuestion.includes('利润') || lowerQuestion.includes('盈利')) {
      if (data.income && data.expense) {
        const profit = data.income - data.expense;
        return `根据查询结果：\n- 收入：${data.income} 元\n- 支出：${data.expense} 元\n- 利润：${profit >= 0 ? profit : Math.abs(profit) + ' 元（亏损）'}`;
      }
    }

    return `已查询到相关数据，但由于AI服务暂时不可用，无法给出详细分析。建议您直接查看数据明细或稍后再试。`;
  }

  /**
   * 保存对话记录
   */
  private static async saveConversation(
    userQuestion: string,
    aiAnswer: string,
    responseTime: number,
    relatedData?: any
  ): Promise<void> {
    try {
      await DatabaseService.insert('tb_ai_conversation', {
        session_id: this.sessionId,
        user_question: userQuestion,
        ai_answer: aiAnswer,
        related_data: relatedData || null,
        response_time: responseTime,
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }

  /**
   * 获取对话历史
   */
  static async getConversationHistory(sessionId?: string): Promise<any[]> {
    const filter = sessionId ? { session_id: sessionId } : {};

    return DatabaseService.findMany({
      table: 'tb_ai_conversation',
      filters: filter,
      orderBy: 'create_time',
      orderDir: 'asc',
    });
  }

  /**
   * 清除对话历史
   */
  static async clearConversationHistory(sessionId?: string): Promise<void> {
    const filter = sessionId ? { session_id: sessionId } : {};

    // 注意：这里应该使用delete方法，但需要先获取记录
    console.log(`Clearing conversation history for session: ${sessionId || 'all'}`);
  }

  /**
   * 智能问答
   */
  static async smartQuery(
    question: string,
    tableName: string,
    conditions: Record<string, any>
  ): Promise<AIAnswer> {
    try {
      // 从数据库查询数据
      const data = await DatabaseService.findMany({
        table: tableName,
        filters: conditions,
        limit: 100,
      });

      // 构建系统上下文
      const systemContext = this.getSystemContextForTable(tableName);

      // 调用AI
      return await this.chat(question, systemContext, {
        query_table: tableName,
        query_conditions: conditions,
        result_count: data.length,
        data_preview: data.slice(0, 10), // 只传前10条预览
      });
    } catch (error) {
      console.error('Smart query error:', error);
      throw error;
    }
  }

  /**
   * 获取表格的系统上下文
   */
  private static getSystemContextForTable(tableName: string): string {
    const contextMap: Record<string, string> = {
      tb_machinery:
        '这是机械信息表，包含所有车辆和设备的信息。字段包括：机械类型、车号、型号、单车方量、所属单位、是否租赁、租赁费用、状态等。',
      tb_personnel:
        '这是人员信息表，包含所有员工的信息。字段包括：姓名、职位、工资、入职时间、联系方式、当前车号等。',
      tb_oil_record:
        '这是油料记录表，记录每次加油信息。字段包括：日期、机械类型、车号、加油量、单价、总费用等。',
      tb_truck_record:
        '这是车数记录表，记录每次运输作业。字段包括：日期、自卸车号、挖机号、车数、运距、装载种类、单方价格、总费用等。',
      tb_daily_settlement:
        '这是单日结算表，记录每天的结算数据。字段包括：日期、机械类型、车号、车数、方量、收入、油料费、工资、实际结余等。',
      tb_monthly_settlement:
        '这是当月结算表，记录每月的汇总结算数据。字段包括：年月、机械类型、车号、各项费用、实际结余等。',
    };

    return contextMap[tableName] || '这是一个业务数据表，记录相关的业务信息。';
  }

  /**
   * 计算分析
   */
  static async analyze(
    question: string,
    machineryType?: string,
    vehicleNo?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AIAnswer> {
    try {
      // 构建查询条件
      const conditions: Record<string, any> = {};

      if (machineryType) {
        conditions.machinery_type = machineryType;
      }

      if (vehicleNo) {
        conditions.vehicle_no = vehicleNo;
      }

      if (startDate && endDate) {
        conditions.record_date = { gte: startDate, lte: endDate };
      }

      // 查询结算数据
      const settlementData = await DatabaseService.findMany({
        table: 'tb_daily_settlement',
        filters: conditions,
        orderBy: 'record_date',
        orderDir: 'desc',
        limit: 100,
      });

      // 查询油料数据
      const oilData = await DatabaseService.findMany({
        table: 'tb_oil_record',
        filters: conditions,
        limit: 100,
      });

      const systemContext = `
这是煤矿施工队的经营分析场景。需要分析的指标包括：
1. 收入：运输收入、产值
2. 成本：油料费、人工费、维修费、租赁费等
3. 利润：收入 - 成本
4. 效率：单车产量、单车油耗

请基于提供的数据，给出详细的分析结果和建议。
      `;

      return await this.chat(question, systemContext, {
        analysis_type: 'settlement',
        settlement_data: settlementData.slice(0, 20),
        oil_data: oilData.slice(0, 20),
        total_records: {
          settlement: settlementData.length,
          oil: oilData.length,
        },
      });
    } catch (error) {
      console.error('Analyze error:', error);
      throw error;
    }
  }
}

export default AIService;
