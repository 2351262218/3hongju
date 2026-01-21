import axios, { AxiosInstance, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

// 创建Axios实例
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加时间戳防止缓存
    config.params = {
      ...config.params,
      _t: Date.now(),
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data

    if (code === 200 || code === 201) {
      return data
    }

    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          ElMessage.error((data as any)?.message || '请求参数错误')
          break
        case 401:
          ElMessage.error('未登录或登录已过期')
          break
        case 403:
          ElMessage.error('没有权限')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        default:
          ElMessage.error('请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败')
    } else {
      ElMessage.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

export default api

// API方法封装
export const apiGet = <T>(url: string, params?: any): Promise<T> =>
  api.get(url, { params }).then((res) => res as T)

export const apiPost = <T>(url: string, data?: any): Promise<T> =>
  api.post(url, data).then((res) => res as T)

export const apiPut = <T>(url: string, data?: any): Promise<T> =>
  api.put(url, data).then((res) => res as T)

export const apiDelete = <T>(url: string, params?: any): Promise<T> =>
  api.delete(url, { params }).then((res) => res as T)
