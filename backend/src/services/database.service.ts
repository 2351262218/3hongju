import { supabase, supabaseAdmin } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config';

// 通用查询选项
export interface QueryOptions {
  table: string;
  filters?: Record<string, any>;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  select?: string;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 基础数据库服务
export class DatabaseService {
  /**
   * 插入单条记录
   */
  static async insert<T>(table: string, data: Partial<T>): Promise<T | null> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`Insert error in ${table}:`, error);
      throw error;
    }

    return result;
  }

  /**
   * 批量插入记录
   */
  static async insertMany<T>(table: string, data: Partial<T>[]): Promise<T[]> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();

    if (error) {
      console.error(`Batch insert error in ${table}:`, error);
      throw error;
    }

    return result;
  }

  /**
   * 查询单条记录
   */
  static async findOne<T>(
    table: string,
    filters: Record<string, any>,
    select: string = '*'
  ): Promise<T | null> {
    let query = supabase.from(table).select(select);

    // 应用过滤条件
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error(`FindOne error in ${table}:`, error);
      throw error;
    }

    return data as T | null;
  }

  /**
   * 查询多条记录
   */
  static async findMany<T>(options: QueryOptions): Promise<T[]> {
    let query = supabase.from(options.table).select(options.select || '*');

    // 应用过滤条件
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });
    }

    // 排序
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDir !== 'desc' });
    }

    // 分页
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`FindMany error in ${options.table}:`, error);
      throw error;
    }

    return (data as T[]) || [];
  }

  /**
   * 分页查询
   */
  static async findWithPagination<T>(
    table: string,
    filters: Record<string, any>,
    page: number = 1,
    pageSize: number = 10,
    orderBy: string = 'create_time',
    orderDir: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResult<T>> {
    // 获取总数
    let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        countQuery = countQuery.eq(key, value);
      }
    });

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error(`Count error in ${table}:`, countError);
      throw countError;
    }

    // 获取数据
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending: orderDir === 'asc' })
      .range((page - 1) * pageSize, page * pageSize);

    if (error) {
      console.error(`Pagination error in ${table}:`, error);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  /**
   * 更新记录
   */
  static async update<T>(
    table: string,
    filters: Record<string, any>,
    data: Partial<T>
  ): Promise<T[]> {
    let query = supabase.from(table).update(data).select();

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query;

    if (error) {
      console.error(`Update error in ${table}:`, error);
      throw error;
    }

    return result || [];
  }

  /**
   * 删除记录
   */
  static async delete(table: string, filters: Record<string, any>): Promise<number> {
    let query = supabase.from(table).delete();

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { error } = await query;

    if (error) {
      console.error(`Delete error in ${table}:`, error);
      throw error;
    }

    return 1; // 删除成功
  }

  /**
   * 执行原生SQL查询（管理员权限）
   */
  static async rawQuery(sql: string): Promise<any> {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      console.error('Raw query error:', error);
      throw error;
    }

    return data;
  }

  /**
   * 事务处理（使用RPC函数）
   */
  static async transaction(
    callback: (supabase: typeof supabaseAdmin) => Promise<void>
  ): Promise<void> {
    try {
      await callback(supabaseAdmin);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }
}

// 专门的价格查询服务
export class PriceService {
  /**
   * 获取指定日期的油料单价
   */
  static async getOilPrice(
    oilType: string,
    recordDate: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('tb_oil_price')
      .select('price')
      .eq('oil_type', oilType)
      .lte('effective_date', recordDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`无法获取${oilType}的价格`);
    }

    return data.price;
  }

  /**
   * 获取指定日期的爆破材料单价
   */
  static async getBlastPrice(
    materialType: string,
    recordDate: string
  ): Promise<{ price: number; unit: string }> {
    const { data, error } = await supabase
      .from('tb_blast_price')
      .select('price, unit')
      .eq('material_type', materialType)
      .lte('effective_date', recordDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`无法获取${materialType}的价格`);
    }

    return { price: data.price, unit: data.unit };
  }

  /**
   * 获取指定日期的打眼单价
   */
  static async getDrillingPrice(recordDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('tb_drilling_price')
      .select('price')
      .lte('effective_date', recordDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('无法获取打眼单价');
    }

    return data.price;
  }

  /**
   * 获取指定日期的伙食费单价
   */
  static async getMealPrice(
    mealType: string,
    recordDate: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('tb_meal_price')
      .select('price')
      .eq('meal_type', mealType)
      .lte('effective_date', recordDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`无法获取${mealType}的伙食费`);
    }

    return data.price;
  }

  /**
   * 获取指定日期的挖掘机产值系数
   */
  static async getExcavatorCoefficient(recordDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('tb_excavator_coefficient')
      .select('coefficient')
      .lte('effective_date', recordDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('无法获取挖掘机产值系数');
    }

    return data.coefficient;
  }

  /**
   * 获取指定日期的台班单价
   */
  static async getShiftPrice(
    machineryType: string,
    recordDate: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('tb_shift_price')
      .select('price_per_hour')
      .eq('machinery_type', machineryType)
      .lte('effective_date', recordDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`无法获取${machineryType}的台班单价`);
    }

    return data.price_per_hour;
  }

  /**
   * 获取指定日期和装载种类的运距价格
   */
  static async getDistancePrice(
    loadTypeId: number,
    distance: number,
    recordDate: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('tb_distance_price')
      .select('*')
      .eq('load_type_id', loadTypeId)
      .lte('effective_date', recordDate)
      .order('effective_date', { ascending: false })
      .order('base_distance', { ascending: false });

    if (error || !data || data.length === 0) {
      throw new Error('无法获取运距价格');
    }

    // 查找匹配的运距价格
    for (const price of data) {
      if (distance <= price.base_distance) {
        return price.base_price;
      } else {
        // 计算超出部分的价格
        const extraDistance = distance - price.base_distance;
        const extraTimes = Math.ceil(extraDistance / price.extra_distance);
        return price.base_price + extraTimes * price.extra_price;
      }
    }

    // 默认返回第一个价格
    return data[0].base_price;
  }
}

// 车辆信息查询服务
export class VehicleService {
  /**
   * 获取车辆信息
   */
  static async getVehicleInfo(
    machineryType: string,
    vehicleNo: string
  ): Promise<any> {
    return DatabaseService.findOne('tb_machinery', {
      machinery_type: machineryType,
      vehicle_no: vehicleNo,
    });
  }

  /**
   * 获取某日期某车的所有司机
   */
  static async getDriversByVehicle(
    machineryType: string,
    vehicleNo: string,
    recordDate: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('v_vehicle_driver')
      .select('*')
      .eq('machinery_type', machineryType)
      .eq('vehicle_no', vehicleNo)
      .lte('start_date', recordDate)
      .or(`end_date.is.null,end_date.gte.${recordDate}`);

    if (error) {
      console.error('Error getting drivers:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * 获取所有在用车辆
   */
  static async getActiveVehicles(
    machineryType?: string
  ): Promise<any[]> {
    const filters: Record<string, any> = {
      status: '在用',
    };

    if (machineryType) {
      filters.machinery_type = machineryType;
    }

    return DatabaseService.findMany({
      table: 'tb_machinery',
      filters,
      orderBy: 'vehicle_no',
      orderDir: 'asc',
    });
  }
}

// 人员信息查询服务
export class PersonnelService {
  /**
   * 获取人员信息
   */
  static async getPersonnel(id: number): Promise<any> {
    return DatabaseService.findOne('tb_personnel', { id });
  }

  /**
   * 获取所有在职人员
   */
  static async getActivePersonnel(): Promise<any[]> {
    return DatabaseService.findMany({
      table: 'tb_personnel',
      filters: { status: '在职' },
      orderBy: 'name',
    });
  }

  /**
   * 获取指定日期指定人员的历史车辆记录
   */
  static async getPersonnelVehicleHistory(
    personnelId: number,
    recordDate: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from('tb_personnel_vehicle_history')
      .select('*')
      .eq('personnel_id', personnelId)
      .lte('start_date', recordDate)
      .or(`end_date.is.null,end_date.gte.${recordDate}`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }
}

export default {
  DatabaseService,
  PriceService,
  VehicleService,
  PersonnelService,
};
