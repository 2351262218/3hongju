import { DatabaseService, PriceService, VehicleService, PersonnelService } from './database.service';
import { supabase } from '../config';

// 结算数据接口
export interface DailySettlementData {
  record_date: string;
  machinery_type: string;
  vehicle_no: string;
  truck_count: number;
  total_capacity: number;
  income: number;
  oil_amount: number;
  oil_fee: number;
  work_hours: number;
  shift_fee: number;
  balance: number;
  deduction: number;
  meal_fee: number;
  medical_fee: number;
  walkie_talkie_fee: number;
  bluetooth_card_fee: number;
  amplifier_fee: number;
  reflective_vest_fee: number;
  safety_insurance_fee: number;
  driver_salary: number;
  repair_fee: number;
  parts_fee: number;
  actual_balance: number;
}

// 核心计算服务
export class CalculationService {
  /**
   * 计算单日结算数据
   */
  static async calculateDailySettlement(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<DailySettlementData> {
    // 1. 从tb_truck_record获取车数和方量
    const truckData = await this.getTruckRecordData(recordDate, machineryType, vehicleNo);

    // 2. 从tb_oil_record获取油料数据
    const oilData = await this.getOilRecordData(recordDate, machineryType, vehicleNo);

    // 3. 从tb_shift_hours获取台班工时
    const shiftData = await this.getShiftHoursData(recordDate, machineryType, vehicleNo);

    // 4. 从tb_deduction获取扣车数据
    const deductionData = await this.getDeductionData(recordDate, machineryType, vehicleNo);

    // 5. 计算伙食费
    const mealFee = await this.calculateMealFee(recordDate, machineryType, vehicleNo);

    // 6. 计算杂项费用
    const miscFees = await this.calculateMiscFees(recordDate, machineryType, vehicleNo);

    // 7. 计算人员工资
    const driverSalary = await this.calculateDriverSalary(recordDate, machineryType, vehicleNo);

    // 8. 计算维修费用
    const repairData = await this.getRepairData(recordDate, machineryType, vehicleNo);

    // 9. 获取台班单价并计算台班费
    const shiftPrice = await PriceService.getShiftPrice(machineryType, recordDate);
    const shiftFee = shiftData.work_hours * shiftPrice;

    // 10. 计算余额
    const balance = truckData.income - oilData.oil_fee;

    // 11. 计算实际结余
    const actualBalance =
      balance -
      shiftFee -
      deductionData.deduction -
      mealFee -
      miscFees.medical_fee -
      miscFees.walkie_talkie_fee -
      miscFees.bluetooth_card_fee -
      miscFees.amplifier_fee -
      miscFees.reflective_vest_fee -
      miscFees.safety_insurance_fee -
      driverSalary -
      repairData.repair_fee -
      repairData.parts_fee;

    // 返回完整的结算数据
    return {
      record_date: recordDate,
      machinery_type: machineryType,
      vehicle_no: vehicleNo,
      truck_count: truckData.truck_count,
      total_capacity: truckData.total_capacity,
      income: truckData.income,
      oil_amount: oilData.oil_amount,
      oil_fee: oilData.oil_fee,
      work_hours: shiftData.work_hours,
      shift_fee: shiftFee,
      balance: balance,
      deduction: deductionData.deduction,
      meal_fee: mealFee,
      medical_fee: miscFees.medical_fee,
      walkie_talkie_fee: miscFees.walkie_talkie_fee,
      bluetooth_card_fee: miscFees.bluetooth_card_fee,
      amplifier_fee: miscFees.amplifier_fee,
      reflective_vest_fee: miscFees.reflective_vest_fee,
      safety_insurance_fee: miscFees.safety_insurance_fee,
      driver_salary: driverSalary,
      repair_fee: repairData.repair_fee,
      parts_fee: repairData.parts_fee,
      actual_balance: actualBalance,
    };
  }

  /**
   * 获取车数记录数据
   */
  private static async getTruckRecordData(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<{ truck_count: number; total_capacity: number; income: number }> {
    let truckCount = 0;
    let totalCapacity = 0;
    let income = 0;

    if (machineryType === '自卸车') {
      // 自卸车：从车数记录汇总
      const { data, error } = await supabase
        .from('tb_truck_record')
        .select('truck_count, total_capacity, total_fee')
        .eq('record_date', recordDate)
        .eq('truck_no', vehicleNo);

      if (error) throw error;

      if (data) {
        for (const row of data) {
          truckCount += row.truck_count || 0;
          totalCapacity += row.total_capacity || 0;
          income += row.total_fee || 0;
        }
      }
    } else if (machineryType === '挖掘机') {
      // 挖掘机：根据挖机号汇总车数，计算产值
      const { data: excavatorData, error: excavatorError } = await supabase
        .from('tb_truck_record')
        .select('truck_count, total_capacity')
        .eq('record_date', recordDate)
        .eq('excavator_no', vehicleNo);

      if (excavatorError) throw excavatorError;

      if (excavatorData) {
        for (const row of excavatorData) {
          truckCount += row.truck_count || 0;
          totalCapacity += row.total_capacity || 0;
        }
      }

      // 挖掘机产值 = 方量 * 产值系数
      const coefficient = await PriceService.getExcavatorCoefficient(recordDate);
      income = totalCapacity * coefficient;
    } else {
      // 推土机、装载机
      const { data: otherData, error: otherError } = await supabase
        .from('tb_truck_record')
        .select('truck_count, total_capacity, total_fee')
        .eq('record_date', recordDate)
        .eq('truck_no', vehicleNo);

      if (otherError) throw otherError;

      if (otherData) {
        for (const row of otherData) {
          truckCount += row.truck_count || 0;
          totalCapacity += row.total_capacity || 0;
          income += row.total_fee || 0;
        }
      }
    }

    return { truck_count: truckCount, total_capacity: totalCapacity, income };
  }

  /**
   * 获取油料记录数据
   */
  private static async getOilRecordData(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<{ oil_amount: number; oil_fee: number }> {
    const { data, error } = await supabase
      .from('tb_oil_record')
      .select('oil_amount, total_fee')
      .eq('record_date', recordDate)
      .eq('machinery_type', machineryType)
      .eq('vehicle_no', vehicleNo);

    if (error) throw error;

    let oilAmount = 0;
    let oilFee = 0;

    if (data) {
      for (const row of data) {
        oilAmount += row.oil_amount || 0;
        oilFee += row.total_fee || 0;
      }
    }

    return { oil_amount: oilAmount, oil_fee: oilFee };
  }

  /**
   * 获取台班工时数据
   */
  private static async getShiftHoursData(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<{ work_hours: number }> {
    const { data, error } = await supabase
      .from('tb_shift_hours')
      .select('work_hours')
      .eq('record_date', recordDate)
      .eq('machinery_type', machineryType)
      .eq('vehicle_no', vehicleNo)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return { work_hours: data?.work_hours || 0 };
  }

  /**
   * 获取扣车记录数据
   */
  private static async getDeductionData(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<{ deduction: number }> {
    const { data, error } = await supabase
      .from('tb_deduction')
      .select('deduction_amount')
      .eq('record_date', recordDate)
      .eq('machinery_type', machineryType)
      .eq('vehicle_no', vehicleNo);

    if (error) throw error;

    let deduction = 0;

    if (data) {
      for (const row of data) {
        deduction += row.deduction_amount || 0;
      }
    }

    return { deduction };
  }

  /**
   * 计算伙食费
   */
  private static async calculateMealFee(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<number> {
    // 获取该车的所有司机
    const drivers = await VehicleService.getDriversByVehicle(
      machineryType,
      vehicleNo,
      recordDate
    );

    if (drivers.length === 0) return 0;

    // 获取考勤明细
    const yearMonth = recordDate.substring(0, 7);
    const day = parseInt(recordDate.substring(8, 10), 10);

    // 获取考勤主表ID
    const { data: masterData } = await supabase
      .from('tb_attendance_master')
      .select('id')
      .eq('year_month', yearMonth)
      .single();

    if (!masterData) return 0;

    let totalMealFee = 0;

    for (const driver of drivers) {
      // 获取该司机的伙食状态
      const { data: attendanceData } = await supabase
        .from('tb_attendance_detail')
        .select('meal_status')
        .eq('master_id', masterData.id)
        .eq('personnel_id', driver.personnel_id)
        .eq('attendance_date', recordDate)
        .single();

      if (attendanceData) {
        const mealPrice = await PriceService.getMealPrice(
          attendanceData.meal_status,
          recordDate
        );
        totalMealFee += mealPrice;
      }
    }

    return totalMealFee;
  }

  /**
   * 计算杂项费用
   */
  private static async calculateMiscFees(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<{
    medical_fee: number;
    walkie_talkie_fee: number;
    bluetooth_card_fee: number;
    amplifier_fee: number;
    reflective_vest_fee: number;
    safety_insurance_fee: number;
  }> {
    const { data, error } = await supabase
      .from('tb_misc_fee')
      .select('fee_type, fee_amount')
      .eq('record_date', recordDate)
      .eq('machinery_type', machineryType)
      .eq('vehicle_no', vehicleNo);

    if (error) throw error;

    const result = {
      medical_fee: 0,
      walkie_talkie_fee: 0,
      bluetooth_card_fee: 0,
      amplifier_fee: 0,
      reflective_vest_fee: 0,
      safety_insurance_fee: 0,
    };

    if (data) {
      for (const row of data) {
        switch (row.fee_type) {
          case '体检费':
            result.medical_fee += row.fee_amount || 0;
            break;
          case '对讲机':
            result.walkie_talkie_fee += row.fee_amount || 0;
            break;
          case '蓝牙卡':
            result.bluetooth_card_fee += row.fee_amount || 0;
            break;
          case '放大号':
            result.amplifier_fee += row.fee_amount || 0;
            break;
          case '反光衣':
            result.reflective_vest_fee += row.fee_amount || 0;
            break;
          case '安责险':
            result.safety_insurance_fee += row.fee_amount || 0;
            break;
        }
      }
    }

    return result;
  }

  /**
   * 计算人员工资
   */
  private static async calculateDriverSalary(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<number> {
    // 获取该车的所有司机
    const drivers = await VehicleService.getDriversByVehicle(
      machineryType,
      vehicleNo,
      recordDate
    );

    if (drivers.length === 0) return 0;

    let totalSalary = 0;

    for (const driver of drivers) {
      totalSalary += driver.daily_salary || 0;
    }

    return totalSalary;
  }

  /**
   * 获取维修费用
   */
  private static async getRepairData(
    recordDate: string,
    machineryType: string,
    vehicleNo: string
  ): Promise<{ repair_fee: number; parts_fee: number }> {
    const { data, error } = await supabase
      .from('tb_repair_record')
      .select('repair_fee, parts_fee')
      .eq('record_date', recordDate)
      .eq('machinery_type', machineryType)
      .eq('vehicle_no', vehicleNo);

    if (error) throw error;

    let repairFee = 0;
    let partsFee = 0;

    if (data) {
      for (const row of data) {
        repairFee += row.repair_fee || 0;
        partsFee += row.parts_fee || 0;
      }
    }

    return { repair_fee: repairFee, parts_fee: partsFee };
  }
}

// 工资计算服务
export class SalaryCalculationService {
  /**
   * 计算月度工资
   */
  static async calculateMonthlySalary(
    yearMonth: string,
    personnelId: number
  ): Promise<{
    base_salary: number;
    attendance_days: number;
    actual_salary: number;
    payable_salary: number;
  }> {
    // 获取人员信息
    const personnel = await PersonnelService.getPersonnel(personnelId);
    if (!personnel) {
      throw new Error('人员不存在');
    }

    // 获取考勤数据
    const { data: masterData } = await supabase
      .from('tb_attendance_master')
      .select('id')
      .eq('year_month', yearMonth)
      .single();

    if (!masterData) {
      return {
        base_salary: personnel.salary,
        attendance_days: 0,
        actual_salary: 0,
        payable_salary: 0,
      };
    }

    // 统计出勤天数
    const { data: attendanceData, error } = await supabase
      .from('tb_attendance_detail')
      .select('attendance_status')
      .eq('master_id', masterData.id)
      .eq('personnel_id', personnelId)
      .in('attendance_status', ['出勤', '加班']);

    if (error) throw error;

    const attendanceDays = attendanceData?.length || 0;

    // 计算实际工资：基本工资/30 * 出勤天数
    const actualSalary = (personnel.salary / 30) * attendanceDays;

    return {
      base_salary: personnel.salary,
      attendance_days: attendanceDays,
      actual_salary: actualSalary,
      payable_salary: actualSalary, // 加班费和扣款在生成工资表时调整
    };
  }
}

// 油耗分析服务
export class FuelAnalysisService {
  /**
   * 计算单车油耗
   */
  static async calculatePerTruckOil(
    machineryType: string,
    vehicleNo: string,
    startDate: string,
    endDate: string
  ): Promise<{
    total_oil: number;
    total_trucks: number;
    per_truck_oil: number;
  }> {
    // 获取加油量
    const { data: oilData } = await supabase
      .from('tb_oil_record')
      .select('oil_amount')
      .eq('machinery_type', machineryType)
      .eq('vehicle_no', vehicleNo)
      .gte('record_date', startDate)
      .lte('record_date', endDate);

    let totalOil = 0;
    if (oilData) {
      for (const row of oilData) {
        totalOil += row.oil_amount || 0;
      }
    }

    // 获取车数
    const { data: truckData } = await supabase
      .from('tb_truck_record')
      .select('truck_count')
      .eq('record_date', startDate) // 简化处理，实际应按时间段汇总
      .eq('truck_no', vehicleNo);

    let totalTrucks = 0;
    if (truckData) {
      for (const row of truckData) {
        totalTrucks += row.truck_count || 0;
      }
    }

    const perTruckOil = totalTrucks > 0 ? totalOil / totalTrucks : 0;

    return {
      total_oil: totalOil,
      total_trucks: totalTrucks,
      per_truck_oil: perTruckOil,
    };
  }
}

export default {
  CalculationService,
  SalaryCalculationService,
  FuelAnalysisService,
};
