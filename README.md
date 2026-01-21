# 露天煤矿施工队统计核算系统

## 项目概述

本系统是一个基于Web的露天煤矿施工队统计核算系统，为统计兼会计人员设计，实现日常业务录入、自动计算、报表生成、结算管理、智能分析等功能。

## 技术栈

### 前端
- **框架**: Vue.js 3 + TypeScript
- **UI组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **图表**: ECharts
- **构建工具**: Vite

### 后端
- **运行时**: Node.js 18+
- **框架**: Express.js + TypeScript
- **数据库**: Supabase PostgreSQL
- **AI服务**: DeepSeek API

## 项目结构

```
open-pit-coal-mine-system/
├── frontend/                 # 前端应用
│   ├── src/
│   │   ├── api/             # API接口封装
│   │   ├── components/      # 公共组件
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia状态管理
│   │   ├── views/           # 页面组件
│   │   ├── styles/          # 样式文件
│   │   ├── App.vue          # 根组件
│   │   └── main.ts          # 入口文件
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                  # 后端应用
│   ├── src/
│   │   ├── config/          # 配置信息
│   │   ├── controllers/     # 控制器
│   │   ├── jobs/            # 定时任务
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由定义
│   │   ├── services/        # 业务逻辑
│   │   ├── utils/           # 工具函数
│   │   └── index.ts         # 入口文件
│   ├── sql/                 # 数据库脚本
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
└── README.md
```

## 功能模块

### 1. 基础数据管理
- 机械信息管理（车辆、设备）
- 人员信息管理
- 单价标准设置
- 运距与装载种类管理

### 2. 日常业务录入
- 油料录入
- 车数录入
- 挖机运距设置
- 维修记录
- 爆破记录
- 打眼记录
- 台班工时
- 杂项费用
- 扣车记录

### 3. 考勤管理
- 考勤表生成
- 考勤状态管理
- 伙食状态管理
- 考勤统计

### 4. 结算管理
- 单日结算表查询
- 单日结算手动刷新
- 当月结算表生成
- 结算数据导出

### 5. 工资管理
- 工资表生成
- 工资审核
- 工资发放记录

### 6. 数据查询
- 综合查询
- 数据导入
- 报表导出

### 7. 智能分析
- 油耗分析
- 利润分析
- 异常预警中心
- 油量余额追踪

### 8. AI智能助手
- 自然语言对话
- 数据查询
- 数据分析
- 决策建议

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 配置环境变量

```bash
# 后端配置
cd backend
cp .env.example .env
# 编辑 .env 文件，填入必要的配置

# 前端配置
# 前端使用 Vite代理，无需单独配置
```

### 启动开发环境

```bash
# 启动后端（端口3000）
cd backend
npm run dev

# 启动前端（端口3001）
cd frontend
npm run dev
```

访问 http://localhost:3001 即可使用系统。

## 数据库设置

### 创建数据库表

登录 Supabase 控制台，执行以下操作：

1. 在 SQL 编辑器中执行 `backend/sql/schema.sql` 创建所有表
2. 执行 `backend/sql/init_data.sql` 初始化基础数据

### 环境变量配置

在 Supabase 项目设置中获取以下信息：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

在 DeepSeek 官网获取 API Key：
- `DEEPSEEK_API_KEY`

## 部署

### 后端部署

推荐使用 Vercel 或 Railway：

1. 连接 GitHub 仓库
2. 设置环境变量
3. 自动部署

### 前端部署

推荐使用 Vercel 或 Netlify：

1. 连接 GitHub 仓库
2. 设置构建命令：`npm run build`
3. 设置输出目录：`dist`
4. 自动部署

### 定时任务

系统使用 node-cron 实现定时任务：

- 每天凌晨00:00：生成单日结算表
- 每月1号凌晨00:00：生成上月结算表、考勤表、分析基准
- 每天凌晨01:00：检测异常数据
- 每天凌晨02:00：计算油量余额

## API文档

### 基础数据管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/machinery | 获取机械列表 |
| POST | /api/v1/machinery | 创建机械 |
| PUT | /api/v1/machinery/:id | 更新机械 |
| DELETE | /api/v1/machinery/:id | 删除机械 |

### 日常业务

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/oil | 获取油料记录 |
| POST | /api/v1/oil | 创建油料记录 |
| PUT | /api/v1/oil/:id | 更新油料记录 |
| DELETE | /api/v1/oil/:id | 删除油料记录 |

### 结算管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/settlement/daily | 获取单日结算 |
| POST | /api/v1/settlement/daily/refresh | 刷新单日结算 |
| GET | /api/v1/settlement/monthly | 获取当月结算 |
| POST | /api/v1/settlement/monthly/generate | 生成当月结算 |

### AI助手

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/ai/chat | 发送对话 |
| GET | /api/v1/ai/conversations | 获取对话历史 |

## 业务规则

### 强关联性
- 每个车型的车号是唯一的
- 不同车型车号可以重复
- 通过 `machinery_type + vehicle_no` 组合唯一标识

### 价格历史记录
- 所有价格更改后立即生效
- 之前的数据不受影响
- 通过 `effective_date` 字段实现

### 自动计算
- 基础数据只录入
- 具体计算由系统自动完成
- 计算字段灰色显示，不可手动编辑

### 一车两司机
- 支持一台车配备两名司机
- 工资分别计算
- 根据历史表的时间段分配到对应的车上

## 维护

### 日志查看
- 后端日志保存在 `backend/logs` 目录
- 使用 `npm run dev` 启动时可在控制台查看

### 数据备份
- Supabase 自动进行数据库备份
- 可在 Supabase 控制台手动备份

### 监控
- 建议使用 Supabase 提供的监控功能
- 定期检查 API 响应时间

## 许可证

本项目仅供内部使用。
