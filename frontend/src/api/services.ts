import { apiGet, apiPost, apiPut, apiDelete } from './index'

// 机械信息相关API
export const machineryApi = {
  // 获取机械列表
  getList: (params?: any) =>
    apiGet('/machinery', params),

  // 获取单个机械
  getById: (id: number) =>
    apiGet(`/machinery/${id}`),

  // 检查车号是否存在
  checkVehicleNo: (machinery_type: string, vehicle_no: string) =>
    apiGet('/machinery/check/vehicle-no', { machinery_type, vehicle_no }),

  // 获取在用车辆列表
  getActiveList: (machinery_type?: string) =>
    apiGet('/machinery/active/list', { machinery_type }),

  // 创建机械
  create: (data: any) =>
    apiPost('/machinery', data),

  // 更新机械
  update: (id: number, data: any) =>
    apiPut(`/machinery/${id}`, data),

  // 删除机械
  delete: (id: number) =>
    apiDelete(`/machinery/${id}`),

  // 批量删除
  batchDelete: (ids: number[]) =>
    apiPost('/machinery/batch-delete', { ids }),

  // 统计信息
  getStats: () =>
    apiGet('/machinery/stats/summary'),
}

// 人员信息相关API
export const personnelApi = {
  // 获取人员列表
  getList: (params?: any) =>
    apiGet('/personnel', params),

  // 获取单个人员
  getById: (id: number) =>
    apiGet(`/personnel/${id}`),

  // 检查电话是否存在
  checkPhone: (phone: string) =>
    apiGet('/personnel/check/phone', { phone }),

  // 获取在职人员列表
  getActiveList: (position?: string) =>
    apiGet('/personnel/active/list', { position }),

  // 创建人员
  create: (data: any) =>
    apiPost('/personnel', data),

  // 更新人员
  update: (id: number, data: any) =>
    apiPut(`/personnel/${id}`, data),

  // 删除人员
  delete: (id: number) =>
    apiDelete(`/personnel/${id}`),

  // 获取车辆变更历史
  getVehicleHistory: (id: number) =>
    apiGet(`/personnel/${id}/vehicle-history`),

  // 统计信息
  getStats: () =>
    apiGet('/personnel/stats/summary'),
}

// 油料记录相关API
export const oilApi = {
  // 获取油料记录
  getList: (params?: any) =>
    apiGet('/oil', params),

  // 获取单个记录
  getById: (id: number) =>
    apiGet(`/oil/${id}`),

  // 获取当日油价
  getPrice: (date: string) =>
    apiGet('/oil/price/diesel', { date }),

  // 创建油料记录
  create: (data: any) =>
    apiPost('/oil', data),

  // 批量创建
  batchCreate: (records: any[]) =>
    apiPost('/oil/batch', { records }),

  // 更新记录
  update: (id: number, data: any) =>
    apiPut(`/oil/${id}`, data),

  // 删除记录
  delete: (id: number) =>
    apiDelete(`/oil/${id}`),

  // 统计消耗
  getConsumptionStats: (params?: any) =>
    apiGet('/oil/stats/consumption', params),
}

// 结算相关API
export const settlementApi = {
  // 获取单日结算
  getDaily: (params?: any) =>
    apiGet('/settlement/daily', params),

  // 获取单日结算详情
  getDailyDetail: (params: any) =>
    apiGet('/settlement/daily/detail', params),

  // 刷新单日结算
  refreshDaily: (data: any) =>
    apiPost('/settlement/daily/refresh', data),

  // 批量刷新
  refreshAllDaily: (record_date: string) =>
    apiPost('/settlement/daily/refresh-all', { record_date }),

  // 获取当月结算
  getMonthly: (params?: any) =>
    apiGet('/settlement/monthly', params),

  // 生成当月结算
  generateMonthly: (year_month: string) =>
    apiPost('/settlement/monthly/generate', { year_month }),

  // 统计汇总
  getStats: (params?: any) =>
    apiGet('/settlement/stats/summary', params),
}

// 考勤相关API
export const attendanceApi = {
  // 获取考勤主表
  getMasterList: (params?: any) =>
    apiGet('/attendance/master', params),

  // 获取考勤明细
  getDetailList: (params?: any) =>
    apiGet('/attendance/detail', params),

  // 生成考勤表
  generate: (year_month: string) =>
    apiPost('/attendance/generate', { year_month }),

  // 更新考勤明细
  updateDetail: (id: number, data: any) =>
    apiPut(`/attendance/detail/${id}`, data),

  // 批量更新
  batchUpdateDetail: (updates: any[]) =>
    apiPut('/attendance/detail/batch', { updates }),

  // 一键填充
  fillAll: (master_id: number, attendance_status?: string, meal_status?: string) =>
    apiPost('/attendance/detail/fill-all', { master_id, attendance_status, meal_status }),

  // 锁定考勤表
  lock: (id: number) =>
    apiPut(`/attendance/master/${id}/lock`),

  // 考勤统计
  getStats: (year_month: string) =>
    apiGet('/attendance/stats/monthly', { year_month }),
}

// 智能分析API
export const analysisApi = {
  // 获取预警列表
  getAlerts: (params?: any) =>
    apiGet('/analysis/alerts', params),

  // 更新预警状态
  updateAlert: (id: number, data: any) =>
    apiPut(`/analysis/alerts/${id}`, data),

  // 批量更新预警
  batchUpdateAlerts: (ids: number[], status: string, handle_remark?: string) =>
    apiPut('/analysis/alerts/batch/update', { ids, status, handle_remark }),

  // 预警统计
  getAlertStats: (params?: any) =>
    apiGet('/analysis/alerts/stats', params),

  // 获取分析基准
  getBaselines: (params?: any) =>
    apiGet('/analysis/baselines', params),

  // 油耗分析
  getFuelAnalysis: (params?: any) =>
    apiGet('/analysis/fuel-analysis', params),

  // 利润分析
  getProfitAnalysis: (params?: any) =>
    apiGet('/analysis/profit-analysis', params),
}

// AI助手API
export const aiApi = {
  // 发送对话
  chat: (question: string, options?: any) =>
    apiPost('/ai/chat', { question, ...options }),

  // 获取对话历史
  getConversations: (session_id?: string) =>
    apiGet('/ai/conversations', { session_id }),

  // 清除对话
  clearConversations: (session_id?: string) =>
    apiDelete('/ai/conversations', { session_id } ? { session_id } : undefined),

  // 获取常见问题示例
  getExamples: () =>
    apiGet('/ai/examples'),

  // 获取知识库
  getKnowledge: (knowledge_type?: string) =>
    apiGet('/ai/knowledge', { knowledge_type }),

  // 添加知识
  addKnowledge: (data: any) =>
    apiPost('/ai/knowledge', data),

  // 智能查询-油耗
  queryOil: (params: any) =>
    apiPost('/ai/query/oil', params),

  // 智能查询-利润
  queryProfit: (params: any) =>
    apiPost('/ai/query/profit', params),
}
