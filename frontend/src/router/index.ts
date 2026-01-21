import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/index.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/machinery',
      name: 'Machinery',
      component: () => import('@/views/basic/machinery/index.vue'),
      meta: { title: '机械信息管理' },
    },
    {
      path: '/personnel',
      name: 'Personnel',
      component: () => import('@/views/basic/personnel/index.vue'),
      meta: { title: '人员信息管理' },
    },
    {
      path: '/price-settings',
      name: 'PriceSettings',
      component: () => import('@/views/basic/price-settings/index.vue'),
      meta: { title: '单价标准设置' },
    },
    {
      path: '/distance-settings',
      name: 'DistanceSettings',
      component: () => import('@/views/basic/distance-settings/index.vue'),
      meta: { title: '运距与装载种类' },
    },
    {
      path: '/oil-records',
      name: 'OilRecords',
      component: () => import('@/views/daily/oil-records/index.vue'),
      meta: { title: '油料录入' },
    },
    {
      path: '/truck-records',
      name: 'TruckRecords',
      component: () => import('@/views/daily/truck-records/index.vue'),
      meta: { title: '车数录入' },
    },
    {
      path: '/excavator-distance',
      name: 'ExcavatorDistance',
      component: () => import('@/views/daily/excavator-distance/index.vue'),
      meta: { title: '挖机运距设置' },
    },
    {
      path: '/repair-records',
      name: 'RepairRecords',
      component: () => import('@/views/daily/repair-records/index.vue'),
      meta: { title: '维修记录' },
    },
    {
      path: '/blast-records',
      name: 'BlastRecords',
      component: () => import('@/views/daily/blast-records/index.vue'),
      meta: { title: '爆破记录' },
    },
    {
      path: '/drilling-records',
      name: 'DrillingRecords',
      component: () => import('@/views/daily/drilling-records/index.vue'),
      meta: { title: '打眼记录' },
    },
    {
      path: '/shift-records',
      name: 'ShiftRecords',
      component: () => import('@/views/daily/shift-records/index.vue'),
      meta: { title: '台班工时' },
    },
    {
      path: '/misc-fees',
      name: 'MiscFees',
      component: () => import('@/views/daily/misc-fees/index.vue'),
      meta: { title: '杂项费用' },
    },
    {
      path: '/deductions',
      name: 'Deductions',
      component: () => import('@/views/daily/deductions/index.vue'),
      meta: { title: '扣车记录' },
    },
    {
      path: '/attendance',
      name: 'Attendance',
      component: () => import('@/views/attendance/index.vue'),
      meta: { title: '考勤管理' },
    },
    {
      path: '/daily-settlement',
      name: 'DailySettlement',
      component: () => import('@/views/settlement/daily-settlement.vue'),
      meta: { title: '单日结算表' },
    },
    {
      path: '/monthly-settlement',
      name: 'MonthlySettlement',
      component: () => import('@/views/settlement/monthly-settlement.vue'),
      meta: { title: '当月结算表' },
    },
    {
      path: '/salary',
      name: 'Salary',
      component: () => import('@/views/salary/index.vue'),
      meta: { title: '工资管理' },
    },
    {
      path: '/query',
      name: 'Query',
      component: () => import('@/views/query/index.vue'),
      meta: { title: '综合查询' },
    },
    {
      path: '/data-import',
      name: 'DataImport',
      component: () => import('@/views/query/data-import.vue'),
      meta: { title: '数据导入' },
    },
    {
      path: '/reports',
      name: 'Reports',
      component: () => import('@/views/query/reports.vue'),
      meta: { title: '报表导出' },
    },
    {
      path: '/fuel-analysis',
      name: 'FuelAnalysis',
      component: () => import('@/views/analysis/fuel-analysis.vue'),
      meta: { title: '油耗分析' },
    },
    {
      path: '/profit-analysis',
      name: 'ProfitAnalysis',
      component: () => import('@/views/analysis/profit-analysis.vue'),
      meta: { title: '利润分析' },
    },
    {
      path: '/alerts',
      name: 'Alerts',
      component: () => import('@/views/analysis/alerts.vue'),
      meta: { title: '异常预警中心' },
    },
    {
      path: '/fuel-balance',
      name: 'FuelBalance',
      component: () => import('@/views/analysis/fuel-balance.vue'),
      meta: { title: '油量余额追踪' },
    },
    {
      path: '/ai-assistant',
      name: 'AIAssistant',
      component: () => import('@/views/ai-assistant/index.vue'),
      meta: { title: 'AI智能助手' },
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '页面'} - 露天煤矿施工队统计核算系统`
  next()
})

export default router
