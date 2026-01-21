-- =====================================================
-- 露天煤矿施工队统计核算系统 - 数据库表结构
-- 创建时间: 2024-01-21
-- =====================================================

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 基础数据表
-- =====================================================

-- 表1：机械信息表 tb_machinery
CREATE TABLE IF NOT EXISTS tb_machinery (
    id BIGSERIAL PRIMARY KEY,
    machinery_type VARCHAR(50) NOT NULL CHECK (machinery_type IN ('自卸车', '挖掘机', '推土机', '装载机')),
    vehicle_no VARCHAR(20) NOT NULL,
    model VARCHAR(100),
    capacity DECIMAL(10, 2),
    owner_unit VARCHAR(100) NOT NULL,
    is_rental BOOLEAN NOT NULL DEFAULT false,
    rental_fee DECIMAL(10, 2),
    rental_unit VARCHAR(10) CHECK (rental_unit IN ('月', '天')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('在用', '停用', '维修中')),
    remark TEXT,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 唯一性约束：machinery_type加vehicle_no组合唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_machinery_type_vehicle_no ON tb_machinery(machinery_type, vehicle_no);

-- 索引
CREATE INDEX IF NOT EXISTS idx_machinery_type ON tb_machinery(machinery_type);
CREATE INDEX IF NOT EXISTS idx_machinery_vehicle_no ON tb_machinery(vehicle_no);
CREATE INDEX IF NOT EXISTS idx_machinery_status ON tb_machinery(status);

-- =====================================================

-- 表2：人员信息表 tb_personnel
CREATE TABLE IF NOT EXISTS tb_personnel (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    position VARCHAR(50) NOT NULL CHECK (position IN ('司机', '机修工', '爆破工', '统计员')),
    salary DECIMAL(10, 2) NOT NULL,
    daily_salary DECIMAL(10, 2) NOT NULL,
    entry_date DATE NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    bank_account VARCHAR(50),
    machinery_type VARCHAR(50),
    vehicle_no VARCHAR(20),
    vehicle_change_date DATE,
    remark TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('在职', '离职')),
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_personnel_name ON tb_personnel(name);
CREATE INDEX IF NOT EXISTS idx_personnel_position ON tb_personnel(position);
CREATE INDEX IF NOT EXISTS idx_personnel_status ON tb_personnel(status);
CREATE INDEX IF NOT EXISTS idx_personnel_phone ON tb_personnel(phone);
CREATE INDEX IF NOT EXISTS idx_personnel_machinery ON tb_personnel(machinery_type, vehicle_no);

-- =====================================================

-- 表3：人员车辆变更历史表 tb_personnel_vehicle_history
CREATE TABLE IF NOT EXISTS tb_personnel_vehicle_history (
    id BIGSERIAL PRIMARY KEY,
    personnel_id BIGINT NOT NULL REFERENCES tb_personnel(id) ON DELETE CASCADE,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    change_reason TEXT,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_vehicle_history_personnel ON tb_personnel_vehicle_history(personnel_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_start_date ON tb_personnel_vehicle_history(start_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_end_date ON tb_personnel_vehicle_history(end_date);

-- =====================================================

-- 表4：油料单价表 tb_oil_price
CREATE TABLE IF NOT EXISTS tb_oil_price (
    id BIGSERIAL PRIMARY KEY,
    oil_type VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_oil_price_type ON tb_oil_price(oil_type);
CREATE INDEX IF NOT EXISTS idx_oil_price_date ON tb_oil_price(effective_date);

-- =====================================================

-- 表5：爆破材料单价表 tb_blast_price
CREATE TABLE IF NOT EXISTS tb_blast_price (
    id BIGSERIAL PRIMARY KEY,
    material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('大乳', '小乳', '铵油', '雷管10米', '雷管15米', '电线')),
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('公斤', '米', '根')),
    effective_date DATE NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_blast_price_type ON tb_blast_price(material_type);
CREATE INDEX IF NOT EXISTS idx_blast_price_date ON tb_blast_price(effective_date);

-- =====================================================

-- 表6：打眼费用单价表 tb_drilling_price
CREATE TABLE IF NOT EXISTS tb_drilling_price (
    id BIGSERIAL PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_drilling_price_date ON tb_drilling_price(effective_date);

-- =====================================================

-- 表7：伙食费单价表 tb_meal_price
CREATE TABLE IF NOT EXISTS tb_meal_price (
    id BIGSERIAL PRIMARY KEY,
    meal_type VARCHAR(50) NOT NULL CHECK (meal_type IN ('正常', '吃一顿')),
    price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_meal_price_type ON tb_meal_price(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_price_date ON tb_meal_price(effective_date);

-- =====================================================

-- 表8：挖掘机产值系数表 tb_excavator_coefficient
CREATE TABLE IF NOT EXISTS tb_excavator_coefficient (
    id BIGSERIAL PRIMARY KEY,
    coefficient DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    create_timeTIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_excavator_coef_date ON tb_excavator_coefficient(effective_date);

-- =====================================================

-- 表9：台班单价表 tb_shift_price
CREATE TABLE IF NOT EXISTS tb_shift_price (
    id BIGSERIAL PRIMARY KEY,
    machinery_type VARCHAR(50) NOT NULL CHECK (machinery_type IN ('自卸车', '挖掘机', '推土机')),
    price_per_hour DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_shift_price_type ON tb_shift_price(machinery_type);
CREATE INDEX IF NOT EXISTS idx_shift_price_date ON tb_shift_price(effective_date);

-- =====================================================

-- 表10：装载种类表 tb_load_type
CREATE TABLE IF NOT EXISTS tb_load_type (
    id BIGSERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL CHECK (type_name IN ('煤', '土', '矸石', '剥离物')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('启用', '停用')),
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_load_type_name ON tb_load_type(type_name);
CREATE INDEX IF NOT EXISTS idx_load_type_status ON tb_load_type(status);

-- =====================================================

-- 表11：运距价格表 tb_distance_price
CREATE TABLE IF NOT EXISTS tb_distance_price (
    id BIGSERIAL PRIMARY KEY,
    load_type_id BIGINT NOT NULL REFERENCES tb_load_type(id),
    base_distance INTEGER NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    extra_distance INTEGER NOT NULL,
    extra_price DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_distance_price_load_type ON tb_distance_price(load_type_id);
CREATE INDEX IF NOT EXISTS idx_distance_price_date ON tb_distance_price(effective_date);

-- =====================================================
-- 日常业务录入表
-- =====================================================

-- 表12：油料记录表 tb_oil_record
CREATE TABLE IF NOT EXISTS tb_oil_record (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    oil_amount DECIMAL(10, 2) NOT NULL,
    oil_price DECIMAL(10, 2) NOT NULL,
    total_fee DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_oil_record_date ON tb_oil_record(record_date);
CREATE INDEX IF NOT EXISTS idx_oil_record_machinery ON tb_oil_record(machinery_type, vehicle_no);

-- =====================================================

-- 表13：当日挖机运距表 tb_daily_excavator_distance
CREATE TABLE IF NOT EXISTS tb_daily_excavator_distance (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    excavator_no VARCHAR(20) NOT NULL,
    distance INTEGER NOT NULL,
    load_type_id BIGINT NOT NULL REFERENCES tb_load_type(id),
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_excavator_distance_date ON tb_daily_excavator_distance(record_date);
CREATE INDEX IF NOT EXISTS idx_excavator_distance_no ON tb_daily_excavator_distance(excavator_no);

-- =====================================================

-- 表14：车数记录表 tb_truck_record
CREATE TABLE IF NOT EXISTS tb_truck_record (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    truck_no VARCHAR(20) NOT NULL,
    excavator_no VARCHAR(20) NOT NULL,
    truck_count INTEGER NOT NULL,
    distance INTEGER NOT NULL,
    load_type_id BIGINT NOT NULL REFERENCES tb_load_type(id),
    capacity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_capacity DECIMAL(10, 2) NOT NULL,
    total_fee DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_truck_record_date ON tb_truck_record(record_date);
CREATE INDEX IF NOT EXISTS idx_truck_record_truck ON tb_truck_record(truck_no);
CREATE INDEX IF NOT EXISTS idx_truck_record_excavator ON tb_truck_record(excavator_no);

-- =====================================================

-- 表15：炸药消耗记录表 tb_blast_record
CREATE TABLE IF NOT EXISTS tb_blast_record (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    explosive_type VARCHAR(50) NOT NULL,
    explosive_amount DECIMAL(10, 2),
    explosive_price DECIMAL(10, 2) NOT NULL,
    detonator_type VARCHAR(50) NOT NULL,
    detonator_amount INTEGER,
    detonator_price DECIMAL(10, 2) NOT NULL,
    wire_length DECIMAL(10, 2),
    wire_price DECIMAL(10, 2) NOT NULL,
    total_fee DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_blast_record_date ON tb_blast_record(record_date);

-- =====================================================

-- 表16：打眼记录表 tb_drilling_record
CREATE TABLE IF NOT EXISTS tb_drilling_record (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    specification DECIMAL(10, 2) NOT NULL,
    hole_count INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_meters DECIMAL(10, 2) NOT NULL,
    total_fee DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_drilling_record_date ON tb_drilling_record(record_date);

-- =====================================================

-- 表17：维修记录表 tb_repair_record
CREATE TABLE IF NOT EXISTS tb_repair_record (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    repair_content TEXT NOT NULL,
    repair_fee DECIMAL(10, 2),
    parts_fee DECIMAL(10, 2),
    tire_fee DECIMAL(10, 2),
    total_fee DECIMAL(10, 2) NOT NULL,
    repair_shop VARCHAR(100) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_repair_record_date ON tb_repair_record(record_date);
CREATE INDEX IF NOT EXISTS idx_repair_record_machinery ON tb_repair_record(machinery_type, vehicle_no);

-- =====================================================

-- 表18：台班工时表 tb_shift_hours
CREATE TABLE IF NOT EXISTS tb_shift_hours (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    work_hours DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_shift_hours_date ON tb_shift_hours(record_date);
CREATE INDEX IF NOT EXISTS idx_shift_hours_machinery ON tb_shift_hours(machinery_type, vehicle_no);

-- =====================================================

-- 表19：杂项费用表 tb_misc_fee
CREATE TABLE IF NOT EXISTS tb_misc_fee (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    fee_type VARCHAR(50) NOT NULL CHECK (fee_type IN ('体检费', '对讲机', '蓝牙卡', '放大号', '反光衣', '安责险')),
    fee_amount DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_misc_fee_date ON tb_misc_fee(record_date);
CREATE INDEX IF NOT EXISTS idx_misc_fee_machinery ON tb_misc_fee(machinery_type, vehicle_no);
CREATE INDEX IF NOT EXISTS idx_misc_fee_type ON tb_misc_fee(fee_type);

-- =====================================================

-- 表20：扣车记录表 tb_deduction
CREATE TABLE IF NOT EXISTS tb_deduction (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    deduction_amount DECIMAL(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_deduction_date ON tb_deduction(record_date);
CREATE INDEX IF NOT EXISTS idx_deduction_machinery ON tb_deduction(machinery_type, vehicle_no);

-- =====================================================
-- 考勤管理表
-- =====================================================

-- 表21：考勤主表 tb_attendance_master
CREATE TABLE IF NOT EXISTS tb_attendance_master (
    id BIGSERIAL PRIMARY KEY,
    year_month VARCHAR(10) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('编辑中', '已锁定'))
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_master_month ON tb_attendance_master(year_month);

-- =====================================================

-- 表22：考勤明细表 tb_attendance_detail
CREATE TABLE IF NOT EXISTS tb_attendance_detail (
    id BIGSERIAL PRIMARY KEY,
    master_id BIGINT NOT NULL REFERENCES tb_attendance_master(id) ON DELETE CASCADE,
    personnel_id BIGINT NOT NULL REFERENCES tb_personnel(id),
    attendance_date DATE NOT NULL,
    attendance_status VARCHAR(20) NOT NULL CHECK (attendance_status IN ('出勤', '缺勤', '请假', '加班')),
    meal_status VARCHAR(20) NOT NULL CHECK (meal_status IN ('正常', '吃一顿', '不吃')),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_attendance_detail_master ON tb_attendance_detail(master_id);
CREATE INDEX IF NOT EXISTS idx_attendance_detail_personnel ON tb_attendance_detail(personnel_id);
CREATE INDEX IF NOT EXISTS idx_attendance_detail_date ON tb_attendance_detail(attendance_date);

-- =====================================================
-- 结算管理表
-- =====================================================

-- 表23：单日结算主表 tb_daily_settlement
CREATE TABLE IF NOT EXISTS tb_daily_settlement (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    truck_count INTEGER NOT NULL,
    total_capacity DECIMAL(10, 2) NOT NULL,
    income DECIMAL(10, 2) NOT NULL,
    oil_amount DECIMAL(10, 2) NOT NULL,
    oil_fee DECIMAL(10, 2) NOT NULL,
    work_hours DECIMAL(10, 2) NOT NULL,
    shift_fee DECIMAL(10, 2) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL,
    deduction DECIMAL(10, 2) NOT NULL,
    meal_fee DECIMAL(10, 2) NOT NULL,
    medical_fee DECIMAL(10, 2) NOT NULL,
    walkie_talkie_fee DECIMAL(10, 2) NOT NULL,
    bluetooth_card_fee DECIMAL(10, 2) NOT NULL,
    amplifier_fee DECIMAL(10, 2) NOT NULL,
    reflective_vest_fee DECIMAL(10, 2) NOT NULL,
    safety_insurance_fee DECIMAL(10, 2) NOT NULL,
    driver_salary DECIMAL(10, 2) NOT NULL,
    repair_fee DECIMAL(10, 2) NOT NULL,
    parts_fee DECIMAL(10, 2) NOT NULL,
    actual_balance DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_refresh_time TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_settlement_date ON tb_daily_settlement(record_date);
CREATE INDEX IF NOT EXISTS idx_daily_settlement_machinery ON tb_daily_settlement(machinery_type, vehicle_no);

-- =====================================================

-- 表24：当月结算主表 tb_monthly_settlement
CREATE TABLE IF NOT EXISTS tb_monthly_settlement (
    id BIGSERIAL PRIMARY KEY,
    year_month VARCHAR(10) NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    truck_count INTEGER NOT NULL,
    total_capacity DECIMAL(10, 2) NOT NULL,
    income DECIMAL(10, 2) NOT NULL,
    oil_amount DECIMAL(10, 2) NOT NULL,
    oil_fee DECIMAL(10, 2) NOT NULL,
    work_hours DECIMAL(10, 2) NOT NULL,
    shift_fee DECIMAL(10, 2) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL,
    deduction DECIMAL(10, 2) NOT NULL,
    meal_fee DECIMAL(10, 2) NOT NULL,
    medical_fee DECIMAL(10, 2) NOT NULL,
    walkie_talkie_fee DECIMAL(10, 2) NOT NULL,
    bluetooth_card_fee DECIMAL(10, 2) NOT NULL,
    amplifier_fee DECIMAL(10, 2) NOT NULL,
    reflective_vest_fee DECIMAL(10, 2) NOT NULL,
    safety_insurance_fee DECIMAL(10, 2) NOT NULL,
    driver_salary DECIMAL(10, 2) NOT NULL,
    repair_fee DECIMAL(10, 2) NOT NULL,
    parts_fee DECIMAL(10, 2) NOT NULL,
    rental_fee DECIMAL(10, 2) NOT NULL,
    actual_balance DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_monthly_settlement_month ON tb_monthly_settlement(year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_settlement_machinery ON tb_monthly_settlement(machinery_type, vehicle_no);

-- =====================================================
-- 工资管理表
-- =====================================================

-- 表25：工资记录表 tb_salary_record
CREATE TABLE IF NOT EXISTS tb_salary_record (
    id BIGSERIAL PRIMARY KEY,
    year_month VARCHAR(10) NOT NULL,
    personnel_id BIGINT NOT NULL REFERENCES tb_personnel(id),
    base_salary DECIMAL(10, 2) NOT NULL,
    attendance_days INTEGER NOT NULL,
    actual_salary DECIMAL(10, 2) NOT NULL,
    overtime_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deduction DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payable_salary DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('待审核', '已审核', '已发放')),
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    remark TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_salary_record_month ON tb_salary_record(year_month);
CREATE INDEX IF NOT EXISTS idx_salary_record_personnel ON tb_salary_record(personnel_id);

-- =====================================================
-- 数据查询模块相关表
-- =====================================================

-- 表26：查询历史表 tb_query_history
CREATE TABLE IF NOT EXISTS tb_query_history (
    id BIGSERIAL PRIMARY KEY,
    query_type VARCHAR(100) NOT NULL,
    query_conditions JSONB NOT NULL,
    result_count INTEGER NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id BIGINT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_query_history_type ON tb_query_history(query_type);
CREATE INDEX IF NOT EXISTS idx_query_history_time ON tb_query_history(create_time);

-- =====================================================

-- 表27：导出记录表 tb_export_history
CREATE TABLE IF NOT EXISTS tb_export_history (
    id BIGSERIAL PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    export_format VARCHAR(20) NOT NULL CHECK (export_format IN ('Excel', 'PDF')),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    export_conditions JSONB NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id BIGINT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_export_history_type ON tb_export_history(report_type);
CREATE INDEX IF NOT EXISTS idx_export_history_format ON tb_export_history(export_format);
CREATE INDEX IF NOT EXISTS idx_export_history_time ON tb_export_history(create_time);

-- =====================================================
-- 智能分析模块相关表
-- =====================================================

-- 表28：异常预警表 tb_alert
CREATE TABLE IF NOT EXISTS tb_alert (
    id BIGSERIAL PRIMARY KEY,
    alert_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('油耗异常', '利润异常', '车数异常', '维修费用异常', '加油异常')),
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    alert_content TEXT NOT NULL,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('高', '中', '低')),
    related_date DATE NOT NULL,
    related_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('未处理', '已处理', '已忽略')),
    handle_time TIMESTAMP WITH TIME ZONE,
    handle_remark TEXT,
create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_alert_time ON tb_alert(alert_time);
CREATE INDEX IF NOT EXISTS idx_alert_type ON tb_alert(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_machinery ON tb_alert(machinery_type, vehicle_no);
CREATE INDEX IF NOT EXISTS idx_alert_status ON tb_alert(status);

-- =====================================================

-- 表29：分析基准表 tb_analysis_baseline
CREATE TABLE IF NOT EXISTS tb_analysis_baseline (
    id BIGSERIAL PRIMARY KEY,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    indicator_type VARCHAR(50) NOT NULL CHECK (indicator_type IN ('单车油耗', '单方油耗', '日均利润')),
    avg_value DECIMAL(10, 2) NOT NULL,
    std_deviation DECIMAL(10, 2) NOT NULL,
    min_value DECIMAL(10, 2) NOT NULL,
    max_value DECIMAL(10, 2) NOT NULL,
    sample_count INTEGER NOT NULL,
    calculation_date DATE NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_baseline_machinery ON tb_analysis_baseline(machinery_type, vehicle_no);
CREATE INDEX IF NOT EXISTS idx_baseline_indicator ON tb_analysis_baseline(indicator_type);
CREATE INDEX IF NOT EXISTS idx_baseline_date ON tb_analysis_baseline(calculation_date);

-- =====================================================
-- AI智能助手模块相关表
-- =====================================================

-- 表30：AI对话记录表 tb_ai_conversation
CREATE TABLE IF NOT EXISTS tb_ai_conversation (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_question TEXT NOT NULL,
    ai_answer TEXT NOT NULL,
    related_sql TEXT,
    related_data JSONB,
    response_time INTEGER NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id BIGINT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ai_conversation_session ON tb_ai_conversation(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_time ON tb_ai_conversation(create_time);

-- =====================================================

-- 表31：AI知识库表 tb_ai_knowledge
CREATE TABLE IF NOT EXISTS tb_ai_knowledge (
    id BIGSERIAL PRIMARY KEY,
    knowledge_type VARCHAR(50) NOT NULL CHECK (knowledge_type IN ('计算公式', '业务规则', '常见问题')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    keywords VARCHAR(500) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_type ON tb_ai_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_keywords ON tb_ai_knowledge(keywords);

-- =====================================================
-- 智能提示功能相关表
-- =====================================================

-- 表32：智能提示配置表 tb_smart_prompt_config
CREATE TABLE IF NOT EXISTS tb_smart_prompt_config (
    id BIGSERIAL PRIMARY KEY,
    prompt_type VARCHAR(50) NOT NULL CHECK (prompt_type IN ('加油量异常', '车数异常', '维修费用异常')),
    threshold_type VARCHAR(20) NOT NULL CHECK (threshold_type IN ('倍数', '绝对值', '标准差')),
    threshold_value DECIMAL(10, 2) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_smart_prompt_type ON tb_smart_prompt_config(prompt_type);
CREATE INDEX IF NOT EXISTS idx_smart_prompt_enabled ON tb_smart_prompt_config(is_enabled);

-- =====================================================

-- 表33：智能提示记录表 tb_smart_prompt_log
CREATE TABLE IF NOT EXISTS tb_smart_prompt_log (
    id BIGSERIAL PRIMARY KEY,
    prompt_type VARCHAR(50) NOT NULL,
    prompt_content TEXT NOT NULL,
    related_table VARCHAR(100) NOT NULL,
    related_data JSONB NOT NULL,
    user_action VARCHAR(20) NOT NULL CHECK (user_action IN ('修改', '确认', '取消')),
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id BIGINT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_smart_prompt_log_type ON tb_smart_prompt_log(prompt_type);
CREATE INDEX IF NOT EXISTS idx_smart_prompt_log_time ON tb_smart_prompt_log(create_time);

-- =====================================================
-- 油量追踪功能相关表
-- =====================================================

-- 表34：油量余额表 tb_fuel_balance
CREATE TABLE IF NOT EXISTS tb_fuel_balance (
    id BIGSERIAL PRIMARY KEY,
    record_date DATE NOT NULL,
    machinery_type VARCHAR(50) NOT NULL,
    vehicle_no VARCHAR(20) NOT NULL,
    opening_balance DECIMAL(10, 2) NOT NULL,
    refuel_amount DECIMAL(10, 2) NOT NULL,
    consumption_amount DECIMAL(10, 2) NOT NULL,
    closing_balance DECIMAL(10, 2) NOT NULL,
    theoretical_consumption DECIMAL(10, 2) NOT NULL,
    consumption_difference DECIMAL(10, 2) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_fuel_balance_date ON tb_fuel_balance(record_date);
CREATE INDEX IF NOT EXISTS idx_fuel_balance_machinery ON tb_fuel_balance(machinery_type, vehicle_no);

-- =====================================================
-- 触发器和函数
-- =====================================================

-- 函数：自动更新daily_salary
CREATE OR REPLACE FUNCTION update_daily_salary()
RETURNS TRIGGER AS $$
BEGIN
    NEW.daily_salary = NEW.salary / 30;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器：在更新salary时自动更新daily_salary
DROP TRIGGER IF EXISTS trg_update_daily_salary ON tb_personnel;
CREATE TRIGGER trg_update_daily_salary
    BEFORE INSERT OR UPDATE OF salary ON tb_personnel
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_salary();

-- 函数：自动计算维修总费用
CREATE OR REPLACE FUNCTION calculate_repair_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_fee = COALESCE(NEW.repair_fee, 0) + COALESCE(NEW.parts_fee, 0) + COALESCE(NEW.tire_fee, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器：在更新维修记录时自动计算总费用
DROP TRIGGER IF EXISTS trg_calculate_repair_total ON tb_repair_record;
CREATE TRIGGER trg_calculate_repair_total
    BEFORE INSERT OR UPDATE OF repair_fee, parts_fee, tire_fee ON tb_repair_record
    FOR EACH ROW
    EXECUTE FUNCTION calculate_repair_total();

-- 函数：自动计算打眼记录的总米数和金额
CREATE OR REPLACE FUNCTION calculate_drilling()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_meters = NEW.specification * NEW.hole_count;
    NEW.total_fee = NEW.total_meters * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器：在更新打眼记录时自动计算
DROP TRIGGER IF EXISTS trg_calculate_drilling ON tb_drilling_record;
CREATE TRIGGER trg_calculate_drilling
    BEFORE INSERT OR UPDATE OF specification, hole_count, unit_price ON tb_drilling_record
    FOR EACH ROW
    EXECUTE FUNCTION calculate_drilling();

-- 函数：自动计算炸药记录的总金额
CREATE OR REPLACE FUNCTION calculate_blast_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_fee = 
        COALESCE(NEW.explosive_amount, 0) * NEW.explosive_price +
        COALESCE(NEW.detonator_amount, 0) * NEW.detonator_price +
        COALESCE(NEW.wire_length, 0) * NEW.wire_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器：在更新炸药记录时自动计算总金额
DROP TRIGGER IF EXISTS trg_calculate_blast_total ON tb_blast_record;
CREATE TRIGGER trg_calculate_blast_total
    BEFORE INSERT OR UPDATE OF explosive_amount, explosive_price, detonator_amount, detonator_price, wire_length, wire_price ON tb_blast_record
    FOR EACH ROW
    EXECUTE FUNCTION calculate_blast_total();

-- =====================================================
-- 视图
-- =====================================================

-- 视图：车辆和司机关联视图
CREATE OR REPLACE VIEW v_vehicle_driver AS
SELECT 
    ph.machinery_type,
    ph.vehicle_no,
    p.id as personnel_id,
    p.name,
    p.position,
    p.phone,
    ph.start_date,
    ph.end_date,
    ph.change_reason
FROM tb_personnel_vehicle_history ph
JOIN tb_personnel p ON ph.personnel_id = p.id
WHERE p.status = '在职';

-- 视图：月度汇总统计视图
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT 
    year_month,
    machinery_type,
    COUNT(DISTINCT vehicle_no) as vehicle_count,
    SUM(truck_count) as total_truck_count,
    SUM(total_capacity) as total_capacity,
    SUM(income) as total_income,
    SUM(oil_fee) as total_oil_fee,
    SUM(driver_salary) as total_driver_salary,
    SUM(actual_balance) as total_actual_balance
FROM tb_monthly_settlement
GROUP BY year_month, machinery_type;

-- =====================================================
-- 完成提示
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Total tables: 34';
    RAISE NOTICE 'Total triggers: 5';
    RAISE NOTICE 'Total views: 2';
END;
$$;
