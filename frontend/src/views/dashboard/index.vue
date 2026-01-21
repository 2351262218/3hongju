<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon" style="background: #409EFF;">
            <el-icon :size="32"><Van /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.vehicleCount }}</div>
            <div class="stat-label">在用车辆</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon" style="background: #67C23A;">
            <el-icon :size="32"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.personnelCount }}</div>
            <div class="stat-label">在职人员</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon" style="background: #E6A23C;">
            <el-icon :size="32"><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatNumber(stats.todayIncome) }}</div>
            <div class="stat-label">今日收入</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon" style="background: #F56C6C;">
            <el-icon :size="32"><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.unhandledAlerts }}</div>
            <div class="stat-label">未处理预警</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-section">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>近7天收入趋势</span>
            </div>
          </template>
          <div ref="incomeChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>近7天油耗趋势</span>
            </div>
          </template>
          <div ref="fuelChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-row :gutter="20" class="table-section">
      <el-col :span="12">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>今日结算明细</span>
              <el-button type="primary" link @click="$router.push('/daily-settlement')">
                查看更多
              </el-button>
            </div>
          </template>
          <el-table :data="todaySettlements" style="width: 100%" max-height="300">
            <el-table-column prop="vehicle_no" label="车号" width="100" />
            <el-table-column prop="truck_count" label="车数" width="80" />
            <el-table-column prop="income" label="收入">
              <template #default="{ row }">
                ¥{{ row.income?.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="oil_fee" label="油费">
              <template #default="{ row }">
                ¥{{ row.oil_fee?.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="actual_balance" label="结余">
              <template #default="{ row }">
                <span :class="{ 'text-danger': row.actual_balance < 0 }">
                  ¥{{ row.actual_balance?.toFixed(2) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>最新预警</span>
              <el-button type="primary" link @click="$router.push('/alerts')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-table :data="recentAlerts" style="width: 100%" max-height="300">
            <el-table-column prop="alert_time" label="时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.alert_time) }}
              </template>
            </el-table-column>
            <el-table-column prop="alert_type" label="类型" width="100" />
            <el-table-column prop="vehicle_no" label="车号" width="80" />
            <el-table-column prop="alert_level" label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="getAlertTagType(row.alert_level)" size="small">
                  {{ row.alert_level }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === '未处理' ? 'danger' : 'success'" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-card class="quick-actions">
      <template #header>
        <div class="card-header">
          <span>快捷操作</span>
        </div>
      </template>
      <div class="actions-grid">
        <div class="action-item" @click="$router.push('/oil-records')">
          <el-icon :size="40" color="#409EFF"><Edit /></el-icon>
          <span>油料录入</span>
        </div>
        <div class="action-item" @click="$router.push('/truck-records')">
          <el-icon :size="40" color="#67C23A"><Van /></el-icon>
          <span>车数录入</span>
        </div>
        <div class="action-item" @click="$router.push('/attendance')">
          <el-icon :size="40" color="#E6A23C"><Calendar /></el-icon>
          <span>考勤管理</span>
        </div>
        <div class="action-item" @click="$router.push('/daily-settlement')">
          <el-icon :size="40" color="#F56C6C"><Money /></el-icon>
          <span>结算查询</span>
        </div>
        <div class="action-item" @click="$router.push('/ai-assistant')">
          <el-icon :size="40" color="#909399"><ChatDotRound /></el-icon>
          <span>AI助手</span>
        </div>
        <div class="action-item" @click="$router.push('/reports')">
          <el-icon :size="40" color="#409EFF"><Document /></el-icon>
          <span>报表导出</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { settlementApi, analysisApi, machineryApi, personnelApi } from '@/api/services'

// 统计数据
const stats = ref({
  vehicleCount: 0,
  personnelCount: 0,
  todayIncome: 0,
  unhandledAlerts: 0,
})

// 今日结算数据
const todaySettlements = ref([])

// 最新预警
const recentAlerts = ref([])

// 图表ref
const incomeChartRef = ref<HTMLElement>()
const fuelChartRef = ref<HTMLElement>()
let incomeChart: echarts.ECharts | null = null
let fuelChart: echarts.ECharts | null = null

// 格式化数字
const formatNumber = (num: number) => {
  return num?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
}

// 格式化时间
const formatTime = (time: string) => {
  return dayjs(time).format('MM-DD HH:mm')
}

// 获取预警标签类型
const getAlertTagType = (level: string) => {
  const types: Record<string, string> = {
    高: 'danger',
    中: 'warning',
    低: 'info',
  }
  return types[level] || 'info'
}

// 初始化统计卡片数据
const initStats = async () => {
  try {
    const [vehicles, personnel, alerts] = await Promise.all([
      machineryApi.getActiveList(),
      personnelApi.getActiveList(),
      analysisApi.getAlertStats({}),
    ])

    stats.value = {
      vehicleCount: (vehicles as any[])?.length || 0,
      personnelCount: (personnel as any[])?.length || 0,
      todayIncome: 0,
      unhandledAlerts: (alerts as any)?.unhandled_alerts || 0,
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

// 初始化今日结算数据
const initTodaySettlements = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const data = await settlementApi.getDaily({
      record_date: today,
      limit: 10,
    })

    todaySettlements.value = (data as any[]) || []
    stats.value.todayIncome = todaySettlements.value.reduce(
      (sum, item) => sum + (item.income || 0),
      0
    )
  } catch (error) {
    console.error('Failed to load settlements:', error)
  }
}

// 初始化预警数据
const initAlerts = async () => {
  try {
    const data = await analysisApi.getAlerts({
      limit: 5,
    })

    recentAlerts.value = (data as any[]) || []
  } catch (error) {
    console.error('Failed to load alerts:', error)
  }
}

// 初始化图表
const initCharts = () => {
  // 收入趋势图
  if (incomeChartRef.value) {
    incomeChart = echarts.init(incomeChartRef.value)
    const dates = []
    const incomes = []
    const expenses = []

    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('MM-DD')
      dates.push(date)
      incomes.push(Math.random() * 10000 + 5000)
      expenses.push(Math.random() * 5000 + 2000)
    }

    incomeChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['收入', '支出'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value', axisLabel: { formatter: '¥{value}' } },
      series: [
        { name: '收入', type: 'bar', data: incomes, color: '#409EFF' },
        { name: '支出', type: 'bar', data: expenses, color: '#F56C6C' },
      ],
    })
  }

  // 油耗趋势图
  if (fuelChartRef.value) {
    fuelChart = echarts.init(fuelChartRef.value)
    const dates = []
    const oils = []

    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('MM-DD')
      dates.push(date)
      oils.push(Math.random() * 500 + 200)
    }

    fuelChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value', axisLabel: { formatter: '{value} L' } },
      series: [
        {
          name: '油耗',
          type: 'line',
          data: oils,
          smooth: true,
          areaStyle: { opacity: 0.3 },
          color: '#67C23A',
        },
      ],
    })
  }
}

// 窗口大小变化处理
const handleResize = () => {
  incomeChart?.resize()
  fuelChart?.resize()
}

onMounted(() => {
  initStats()
  initTodaySettlements()
  initAlerts()
  initCharts()

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  incomeChart?.dispose()
  fuelChart?.dispose()
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stat-cards {
    margin-bottom: 20px;

    .stat-card {
      .el-card__body {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 20px;
      }

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .stat-info {
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 5px;
        }
      }
    }
  }

  .chart-section {
    margin-bottom: 20px;

    .chart-card {
      .chart-container {
        height: 300px;
      }
    }
  }

  .table-section {
    margin-bottom: 20px;
  }

  .quick-actions {
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 20px;
      padding: 20px;

      .action-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 20px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          background-color: #f5f7fa;
          transform: translateY(-2px);
        }

        span {
          font-size: 14px;
          color: #606266;
        }
      }
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .text-danger {
    color: #f56c6c;
  }
}
</style>
