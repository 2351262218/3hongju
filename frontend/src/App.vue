<template>
  <el-config-provider :locale="locale">
    <el-container class="app-container">
      <!-- 侧边栏 -->
      <el-aside :width="isCollapsed ? '64px' : '220px'" class="app-sidebar">
        <div class="logo">
          <img src="@/assets/logo.svg" alt="Logo" />
          <span v-show="!isCollapsed">煤矿统计系统</span>
        </div>
        <el-scrollbar>
          <el-menu
            :default-active="currentRoute"
            :collapse="isCollapsed"
            router
            background-color="#304156"
            text-color="#bfcbd9"
            active-text-color="#409EFF"
          >
            <el-menu-item index="/dashboard">
              <el-icon><Odometer /></el-icon>
              <span>首页</span>
            </el-menu-item>

            <el-sub-menu index="basic">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>基础数据管理</span>
              </template>
              <el-menu-item index="/machinery">机械信息管理</el-menu-item>
              <el-menu-item index="/personnel">人员信息管理</el-menu-item>
              <el-menu-item index="/price-settings">单价标准设置</el-menu-item>
              <el-menu-item index="/distance-settings">运距与装载种类</el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="daily">
              <template #title>
                <el-icon><Edit /></el-icon>
                <span>日常业务录入</span>
              </template>
              <el-menu-item index="/oil-records">油料录入</el-menu-item>
              <el-menu-item index="/truck-records">车数录入</el-menu-item>
              <el-menu-item index="/excavator-distance">挖机运距设置</el-menu-item>
              <el-menu-item index="/repair-records">维修记录</el-menu-item>
              <el-menu-item index="/blast-records">爆破记录</el-menu-item>
              <el-menu-item index="/drilling-records">打眼记录</el-menu-item>
              <el-menu-item index="/shift-records">台班工时</el-menu-item>
              <el-menu-item index="/misc-fees">杂项费用</el-menu-item>
              <el-menu-item index="/deductions">扣车记录</el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="attendance">
              <template #title>
                <el-icon><Calendar /></el-icon>
                <span>考勤管理</span>
              </template>
              <el-menu-item index="/attendance">考勤管理</el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="settlement">
              <template #title>
                <el-icon><Money /></el-icon>
                <span>结算管理</span>
              </template>
              <el-menu-item index="/daily-settlement">单日结算表</el-menu-item>
              <el-menu-item index="/monthly-settlement">当月结算表</el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="salary">
              <template #title>
                <el-icon><Wallet /></el-icon>
                <span>工资管理</span>
              </template>
              <el-menu-item index="/salary">工资管理</el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="query">
              <template #title>
                <el-icon><Search /></el-icon>
                <span>数据查询</span>
              </template>
              <el-menu-item index="/query">综合查询</el-menu-item>
              <el-menu-item index="/data-import">数据导入</el-menu-item>
              <el-menu-item index="/reports">报表导出</el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="analysis">
              <template #title>
                <el-icon><TrendCharts /></el-icon>
                <span>智能分析</span>
              </template>
              <el-menu-item index="/fuel-analysis">油耗分析</el-menu-item>
              <el-menu-item index="/profit-analysis">利润分析</el-menu-item>
              <el-menu-item index="/alerts">异常预警中心</el-menu-item>
              <el-menu-item index="/fuel-balance">油量余额追踪</el-menu-item>
            </el-sub-menu>

            <el-menu-item index="/ai-assistant">
              <el-icon><ChatDotRound /></el-icon>
              <span>AI智能助手</span>
            </el-menu-item>
          </el-menu>
        </el-scrollbar>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <el-icon class="collapse-btn" @click="toggleSidebar">
              <Fold v-if="!isCollapsed" />
              <Expand v-else />
            </el-icon>
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>首页</el-breadcrumb-item>
              <el-breadcrumb-item>{{ currentMenuTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-button type="primary" @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
            <el-dropdown>
              <el-avatar :size="32" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>个人中心</el-dropdown-item>
                  <el-dropdown-item>修改密码</el-dropdown-item>
                  <el-dropdown-item divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="app-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

const route = useRoute()
const appStore = useAppStore()

const locale = zhCn
const isCollapsed = computed(() => appStore.sidebarCollapsed)

const currentRoute = computed(() => route.path)
const currentMenuTitle = computed(() => {
  const titles: Record<string, string> = {
    '/dashboard': '首页',
    '/machinery': '机械信息管理',
    '/personnel': '人员信息管理',
    '/price-settings': '单价标准设置',
    '/distance-settings': '运距与装载种类',
    '/oil-records': '油料录入',
    '/truck-records': '车数录入',
    '/excavator-distance': '挖机运距设置',
    '/repair-records': '维修记录',
    '/blast-records': '爆破记录',
    '/drilling-records': '打眼记录',
    '/shift-records': '台班工时',
    '/misc-fees': '杂项费用',
    '/deductions': '扣车记录',
    '/attendance': '考勤管理',
    '/daily-settlement': '单日结算表',
    '/monthly-settlement': '当月结算表',
    '/salary': '工资管理',
    '/query': '综合查询',
    '/data-import': '数据导入',
    '/reports': '报表导出',
    '/fuel-analysis': '油耗分析',
    '/profit-analysis': '利润分析',
    '/alerts': '异常预警中心',
    '/fuel-balance': '油量余额追踪',
    '/ai-assistant': 'AI智能助手',
  }
  return titles[route.path] || '页面'
})

const toggleSidebar = () => {
  appStore.toggleSidebar()
}

const handleRefresh = () => {
  // 触发刷新
  window.location.reload()
}
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;
}

.app-sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #fff;
    font-size: 16px;
    font-weight: bold;
    background-color: #263445;

    img {
      width: 32px;
      height: 32px;
    }
  }

  :deep(.el-menu) {
    border-right: none;
  }
}

.app-header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;

    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      color: #409EFF;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;

    .user-avatar {
      cursor: pointer;
      background-color: #409EFF;
    }
  }
}

.app-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow: auto;
}
</style>
