import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 侧边栏折叠状态
  const sidebarCollapsed = ref(false)

  // 当前日期
  const currentDate = ref(new Date().toISOString().split('T')[0])

  // 加载状态
  const loading = ref(false)

  // 消息提示
  const message = ref('')

  // 切换侧边栏
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 设置当前日期
  function setCurrentDate(date: string) {
    currentDate.value = date
  }

  // 设置加载状态
  function setLoading(state: boolean) {
    loading.value = state
  }

  // 设置消息
  function showMessage(msg: string) {
    message.value = msg
    // 3秒后清除消息
    setTimeout(() => {
      message.value = ''
    }, 3000)
  }

  return {
    sidebarCollapsed,
    currentDate,
    loading,
    message,
    toggleSidebar,
    setCurrentDate,
    setLoading,
    showMessage,
  }
})
