-- =====================================================
-- 露天煤矿施工队统计核算系统 - 初始化数据
-- 创建时间: 2024-01-21
-- =====================================================

-- =====================================================
-- 油料单价初始数据
-- =====================================================
INSERT INTO tb_oil_price (oil_type, price, effective_date, create_time, remark)
VALUES 
    ('柴油', 7.50, '2024-01-01', NOW(), '初始油价');

-- =====================================================
-- 伙食费单价初始数据
-- =====================================================
INSERT INTO tb_meal_price (meal_type, price, effective_date, create_time, remark)
VALUES 
    ('正常', 30.00, '2024-01-01', NOW(), '正常伙食费'),
    ('吃一顿', 15.00, '2024-01-01', NOW(), '吃一顿伙食费');

-- =====================================================
-- 挖掘机产值系数初始数据
-- =====================================================
INSERT INTO tb_excavator_coefficient (coefficient, effective_date, create_time, remark)
VALUES 
    (3.50, '2024-01-01', NOW(), '初始产值系数');

-- =====================================================
-- 台班单价初始数据
-- =====================================================
INSERT INTO tb_shift_price (machinery_type, price_per_hour, effective_date, create_time, remark)
VALUES 
    ('自卸车', 150.00, '2024-01-01', NOW(), '自卸车台班费'),
    ('挖掘机', 200.00, '2024-01-01', NOW(), '挖掘机台班费'),
    ('推土机', 180.00, '2024-01-01', NOW(), '推土机台班费');

-- =====================================================
-- 装载种类初始数据
-- =====================================================
INSERT INTO tb_load_type (type_name, status, create_time, remark)
VALUES 
    ('煤', '启用', NOW(), '煤炭'),
    ('土', '启用', NOW(), '土壤'),
    ('矸石', '启用', NOW(), '矸石'),
    ('剥离物', '启用', NOW(), '剥离物');

-- =====================================================
-- 运距价格初始数据
-- =====================================================

-- 获取装载种类ID
DO $$
DECLARE
    coal_id BIGINT;
    soil_id BIGINT;
    gangue_id BIGINT;
    strip_id BIGINT;
BEGIN
    SELECT id INTO coal_id FROM tb_load_type WHERE type_name = '煤';
    SELECT id INTO soil_id FROM tb_load_type WHERE type_name = '土';
    SELECT id INTO gangue_id FROM tb_load_type WHERE type_name = '矸石';
    SELECT id INTO strip_id FROM tb_load_type WHERE type_name = '剥离物';
    
    -- 煤的运距价格
    INSERT INTO tb_distance_price (load_type_id, base_distance, base_price, extra_distance, extra_price, effective_date, create_time, remark)
    VALUES 
        (coal_id, 1000, 5.00, 100, 0.50, '2024-01-01', NOW(), '煤基础运距价格'),
        (coal_id, 2000, 5.50, 100, 0.50, '2024-01-01', NOW(), '煤远距离运距价格');
    
    -- 土的运距价格
    INSERT INTO tb_distance_price (load_type_id, base_distance, base_price, extra_distance, extra_price, effective_date, create_time, remark)
    VALUES 
        (soil_id, 1000, 4.00, 100, 0.40, '2024-01-01', NOW(), '土基础运距价格'),
        (soil_id, 2000, 4.50, 100, 0.40, '2024-01-01', NOW(), '土远距离运距价格');
    
    -- 矸石的运距价格
    INSERT INTO tb_distance_price (load_type_id, base_distance, base_price, extra_distance, extra_price, effective_date, create_time, remark)
    VALUES 
        (gangue_id, 1000, 4.50, 100, 0.45, '2024-01-01', NOW(), '矸石基础运距价格'),
        (gangue_id, 2000, 5.00, 100, 0.45, '2024-01-01', NOW(), '矸石远距离运距价格');
    
    -- 剥离物的运距价格
    INSERT INTO tb_distance_price (load_type_id, base_distance, base_price, extra_distance, extra_price, effective_date, create_time, remark)
    VALUES 
        (strip_id, 1000, 3.50, 100, 0.35, '2024-01-01', NOW(), '剥离物基础运距价格'),
        (strip_id, 2000, 4.00, 100, 0.35, '2024-01-01', NOW(), '剥离物远距离运距价格');
END;
$$;

-- =====================================================
-- 爆破材料单价初始数据
-- =====================================================
INSERT INTO tb_blast_price (material_type, price, unit, effective_date, create_time, remark)
VALUES 
    ('大乳', 15.00, '公斤', '2024-01-01', NOW(), '乳化炸药大包'),
    ('小乳', 12.00, '公斤', '2024-01-01', NOW(), '乳化炸药小包'),
    ('铵油', 10.00, '公斤', '2024-01-01', NOW(), '铵油炸药'),
    ('雷管10米', 5.00, '根', '2024-01-01', NOW(), '10米雷管'),
    ('雷管15米', 6.00, '根', '2024-01-01', NOW(), '15米雷管'),
    ('电线', 2.00, '米', '2024-01-01', NOW(), '爆破电线');

-- =====================================================
-- 打眼费用单价初始数据
-- =====================================================
INSERT INTO tb_drilling_price (price, effective_date, create_time, remark)
VALUES 
    (25.00, '2024-01-01', NOW(), '初始打眼费用');

-- =====================================================
-- 智能提示配置初始数据
-- =====================================================
INSERT INTO tb_smart_prompt_config (prompt_type, threshold_type, threshold_value, is_enabled, create_time, update_time)
VALUES 
    ('加油量异常', '倍数', 10.0, true, NOW(), NOW()),
    ('车数异常', '倍数', 10.0, true, NOW(), NOW()),
    ('维修费用异常', '倍数', 5.0, true, NOW(), NOW());

-- =====================================================
-- AI知识库初始数据
-- =====================================================

-- 计算公式知识
INSERT INTO tb_ai_knowledge (knowledge_type, title, content, keywords, create_time, update_time)
VALUES 
    ('计算公式', '单车油耗计算公式', '单车油耗等于加油量除以车数', '油耗,单车,计算', NOW(), NOW()),
    ('计算公式', '单方油耗计算公式', '单方油耗等于加油量除以方量', '油耗,单方,计算', NOW(), NOW()),
    ('计算公式', '运输费用计算公式', '运输费用等于单方价格乘以单车方量乘以车数', '运输,费用,计算', NOW(), NOW()),
    ('计算公式', '台班费计算公式', '台班费等于工作小时数乘以台班单价', '台班,费用,计算', NOW(), NOW()),
    ('计算公式', '打眼费用计算公式', '打眼费用等于总米数乘以单价每米，总米数等于米数规格乘以孔数', '打眼,费用,计算', NOW(), NOW()),
    ('计算公式', '维修费用计算公式', '维修总费用等于修理费加配件费加轮胎费', '维修,费用,计算', NOW(), NOW()),
    ('计算公式', '实际结余计算公式', '实际结余等于余额减台班费减扣车减伙食费减杂项费用减人员工资减维修费用', '结余,利润,计算', NOW(), NOW()),
    ('计算公式', '运距价格计算公式', '如果实际运距小于等于基础距离，单方价格等于基础价格；否则超出距离等于实际运距减基础距离，超出次数等于向上取整（超出距离除以超出后每增加距离），单方价格等于基础价格加（超出次数乘以超出后每增加价格）', '运距,价格,计算', NOW(), NOW());

-- 业务规则知识
INSERT INTO tb_ai_knowledge (knowledge_type, title, content, keywords, create_time, update_time)
VALUES 
    ('业务规则', '伙食费计入机械成本', '伙食费不从司机工资中扣除，计入机械成本', '伙食费,机械成本', NOW(), NOW()),
    ('业务规则', '一车两司机', '一台车配备两名司机，工资分别计算', '司机,工资', NOW(), NOW()),
    ('业务规则', '价格历史记录', '所有价格更改后立即生效，但之前的数据不受影响', '价格,历史', NOW(), NOW()),
    ('业务规则', '司机换车规则', '司机换车时更新人员表中的车号，同时在历史表中新增记录，旧记录的结束日期设为换车日期前一天', '换车,司机', NOW(), NOW()),
    ('业务规则', '自动计算规则', '基础数据只录入，具体计算由系统自动完成，所有计算字段灰色显示不可编辑', '自动计算,录入', NOW(), NOW()),
    ('业务规则', '实时刷新规则', '支持手动刷新当日数据和生成当月结算表，当月数据是临时的，历史月份数据保存到数据库', '刷新,结算', NOW(), NOW());

-- 常见问题知识
INSERT INTO tb_ai_knowledge (knowledge_type, title, content, keywords, create_time, update_time)
VALUES 
    ('常见问题', '如何录入油料数据', '在油料录入界面选择日期、机械类型、车号，填写加油量，系统自动计算总费用并保存', '油料,录入', NOW(), NOW()),
    ('常见问题', '如何录入车数数据', '先在当日挖机运距设置中录入挖机号、运距、装载种类，然后在车数录入中填写自卸车号、挖机号、车数，系统自动计算相关数据', '车数,录入', NOW(), NOW()),
    ('常见问题', '如何生成当月结算表', '在当月结算表查询界面选择年月，点击生成当月结算表按钮，当月数据临时生成，历史月份数据保存到数据库', '结算,生成', NOW(), NOW()),
    ('常见问题', '如何修改司机车号', '在人员信息管理中修改车号，系统会自动更新历史记录并重新计算相关结算数据', '修改,车号', NOW(), NOW()),
    ('常见问题', '为什么连续几天未加油没有提示', '系统会智能判断，如果前次加油量充足，即使连续几天未加油也不会提示。只有当前次加油量不足以支撑这几天的用油时才会提示', '未加油,提示', NOW(), NOW()),
    ('常见问题', 'AI助手能做什么', 'AI助手可以进行数据查询、数据计算、数据分析、对比分析、决策建议、异常诊断、预测分析，但不能修改数据', 'AI,功能', NOW(), NOW());

-- =====================================================
-- 初始化完成提示
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Initialization data created successfully!';
    RAISE NOTICE 'Oil price: 1 record';
    RAISE NOTICE 'Meal price: 2 records';
    RAISE NOTICE 'Excavator coefficient: 1 record';
    RAISE NOTICE 'Shift price: 3 records';
    RAISE NOTICE 'Load type: 4 records';
    RAISE NOTICE 'Distance price: 8 records';
    RAISE NOTICE 'Blast price: 6 records';
    RAISE NOTICE 'Drilling price: 1 record';
    RAISE NOTICE 'Smart prompt config: 3 records';
    RAISE NOTICE 'AI knowledge: 20 records';
END;
$$;
