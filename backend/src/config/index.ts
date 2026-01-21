import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 创建Supabase客户端
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 创建服务角色客户端（用于后台操作）
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 数据库配置
export const dbConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceRoleKey: supabaseServiceRoleKey,
};

// AI配置
export const aiConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-reasoner',
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
};

// 服务器配置
export const serverConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};

// 日志配置
export const logConfig = {
  level: process.env.LOG_LEVEL || 'debug',
  filePath: process.env.LOG_FILE_PATH || './logs',
};

// 文件上传配置
export const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};

// 验证配置
export function validateConfig(): boolean {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'DEEPSEEK_API_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      return false;
    }
  }

  return true;
}

export default {
  supabase,
  supabaseAdmin,
  dbConfig,
  aiConfig,
  serverConfig,
  logConfig,
  uploadConfig,
  validateConfig,
};
