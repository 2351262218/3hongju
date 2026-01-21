import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { validateConfig } from './config';
import { ScheduledTaskService } from './jobs/scheduled-tasks';

// 加载环境变量
dotenv.config();

// 验证配置
if (!validateConfig()) {
  console.error('Configuration validation failed!');
  process.exit(1);
}

// 创建Express应用
const app: Application = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API版本
const API_VERSION = 'v1';

// 导入路由
import machineryRoutes from './routes/machinery.routes';
import personnelRoutes from './routes/personnel.routes';
import oilRoutes from './routes/oil.routes';
import truckRoutes from './routes/truck.routes';
import settlementRoutes from './routes/settlement.routes';
import attendanceRoutes from './routes/attendance.routes';
import salaryRoutes from './routes/salary.routes';
import analysisRoutes from './routes/analysis.routes';
import aiRoutes from './routes/ai.routes';
import reportRoutes from './routes/report.routes';

// API路由
app.use(`/api/${API_VERSION}/machinery`, machineryRoutes);
app.use(`/api/${API_VERSION}/personnel`, personnelRoutes);
app.use(`/api/${API_VERSION}/oil`, oilRoutes);
app.use(`/api/${API_VERSION}/truck`, truckRoutes);
app.use(`/api/${API_VERSION}/settlement`, settlementRoutes);
app.use(`/api/${API_VERSION}/attendance`, attendanceRoutes);
app.use(`/api/${API_VERSION}/salary`, salaryRoutes);
app.use(`/api/${API_VERSION}/analysis`, analysisRoutes);
app.use(`/api/${API_VERSION}/ai`, aiRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    code: statusCode,
    message: message,
    data: null,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: 'Not Found',
    data: null,
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // 初始化定时任务（仅在生产环境）
  if (process.env.NODE_ENV === 'production') {
    ScheduledTaskService.initialize();
    console.log('Scheduled tasks initialized');
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  ScheduledTaskService.stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  ScheduledTaskService.stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
