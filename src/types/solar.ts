/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoofMaterial =
  | 'ton_nha_dan' // Mái tôn nhà dân (Bát Z, Minirail, Biên - Giữa)
  | 'ton_song'    // Mái tôn sóng vuông / Cliplock
  | 'seamlock'    // Mái tôn Seamlock công nghiệp
  | 'ngoi'        // Mái ngói kèo thép
  | 'be_tong'     // Mái bằng bê tông cốt thép
  | 'khung_thep';  // Mái sàn khung thép nâng cao

export interface MaterialInfo {
  id: RoofMaterial;
  name: string;
  description: string;
  mountType: string;
  windResistance: string;
  weightLimit: string;
  color: string;
}

export type RoofShape = 'rectangle' | 'l_shape' | 'trapezoid';

export type VietnamRegion = 'north' | 'central' | 'south';

export interface RoofConfig {
  shape: RoofShape;
  widthM: number;      // Chiều rộng mái (mét)
  lengthM: number;     // Chiều dài mái (mét)
  cutWidthM?: number;  // Góc khuyết cho mái chữ L (mét)
  cutLengthM?: number; // Chiều dài khuyết chữ L (mét)
  topWidthM?: number;  // Cạnh đáy trên cho mái hình thang
  slopeDeg: number;    // Độ dốc mái (độ 0 - 60°)
  azimuthDeg: number;  // Góc phương vị (180° = Chính Nam, 135° = Đông Nam, 225° = Tây Nam)
  material: RoofMaterial;
  setbackM: number;    // Khoảng lùi an toàn mép mái (mét, e.g. 0.5m)
  region: VietnamRegion; // Miền Bắc, Miền Trung, Miền Nam
}

export interface PanelSpec {
  id: string;
  name: string;           // Tên model tấm pin
  brand: string;          // Hãng sản xuất (Longi, Canadian, Jinko, Custom...)
  lengthMm: number;       // Chiều dài tấm pin (mm)
  widthMm: number;        // Chiều rộng tấm pin (mm)
  thicknessMm: number;    // Độ dày (mm)
  powerWp: number;        // Công suất đỉnh (Wp)
  efficiencyPct: number;  // Hiệu suất quang năng (%)
  voc: number;            // Điện áp hở mạch (V)
  isc: number;            // Dòng ngắn mạch (A)
  weightKg: number;       // Trọng lượng (kg)
}

export interface PlacedPanel {
  id: string;
  xMm: number;            // Vị trí X tính theo mm từ gốc (0,0)
  yMm: number;            // Vị trí Y tính theo mm
  rotationDeg: number;    // Góc quay: 0 (dọc), 90 (ngang), 180, 270
  stringId?: number;      // Chuỗi string điện
  isInvalid?: boolean;    // Cảnh báo nằm ngoài mái hoặc va chạm chướng ngại vật
}

export type ObstacleType = 'ac_outdoor' | 'water_tank' | 'skylight' | 'vent' | 'chimney' | 'shadow_tree' | 'custom';

export interface Obstacle {
  id: string;
  name: string;
  type: ObstacleType;
  xMm: number;
  yMm: number;
  widthMm: number;
  lengthMm: number;
  heightMm?: number;
  rotationDeg?: number;   // Góc xoay vật cản (độ)
}

export type InverterType = 'grid_tie' | 'hybrid' | 'off_grid';

export interface InverterSpec {
  name: string;           // Tên model máy biến tần
  brand: string;          // Hãng biến tần (Deye, Huawei, GoodWe, Growatt...)
  ratedPowerKw: number;   // Công suất định mức AC (kW)
  type: InverterType;     // Loại: Hòa lưới bám tải, Hybrid có lưu trữ, Độc lập
  maxDcPowerKw: number;   // Công suất tấm pin DC tối đa cho phép (kW)
  mpptCount: number;      // Số cổng MPPT độc lập
  efficiencyPct: number;  // Hiệu suất biến tần (%)
  maxDcVoltageV: number;  // Điện áp DC tối đa (V)
  startVoltageV: number;  // Điện áp khởi động (V)
}

export type BatteryChemistry = 'lifepo4' | 'lithium_nmc' | 'lead_carbon' | 'gel';

export interface BatterySpec {
  name: string;             // Tên bộ pin lưu trữ
  brand: string;            // Hãng sản xuất (Dyness, BYD, Pylontech, Deye, Custom...)
  capacityKwh: number;      // Dung lượng tổng (kWh)
  usableCapacityKwh: number;// Dung lượng khả dụng thực tế (kWh)
  voltageV: number;         // Điện áp danh định (V)
  capacityAh: number;       // Dung lượng danh định (Ah)
  chemistry: BatteryChemistry; // Hóa học pin (LiFePO4 an toàn chống cháy nổ)
  maxDodPct: number;        // Độ xả sâu tối đa DoD (%)
  cycleLife: number;        // Số chu kỳ nạp xả (cycles)
  maxDischargeKw: number;   // Công suất xả liên tục tối đa (kW)
  quantity: number;         // Số lượng pack pin
}

export interface SystemMetrics {
  totalPanels: number;
  totalDcPowerKwp: number;
  totalPanelAreaM2: number;
  roofGrossAreaM2: number;
  roofNetUsableAreaM2: number;
  coveragePct: number;
  dcAcRatio: number;
  dcAcStatus: 'under' | 'optimal' | 'high' | 'overload';
  dailyPeakSunHours: number;
  dailyGenerationKwh: number;
  monthlyGenerationKwh: number;
  annualGenerationKwh: number;
  annualCo2ReductionKg: number;
  equivalentTreesPlanted: number;
  batteryTotalKwh: number;
  batteryUsableKwh: number;
  batteryAutonomyHours: number;
  estimatedAnnualSavingsVnd: number;
}

export interface BillOfMaterialItem {
  id: string;
  category: 'panel' | 'inverter' | 'battery' | 'mounting' | 'electrical' | 'service';
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number;
  totalVnd: number;
}

export interface SavedSolarProject {
  id: string;
  name: string;
  customerName?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  roof: RoofConfig;
  panelSpec: PanelSpec;
  inverterSpec: InverterSpec;
  batterySpec: BatterySpec;
  panels: PlacedPanel[];
  obstacles: Obstacle[];
  dailyCriticalLoadKwh: number;
  isSnapEnabled: boolean;
  summary: {
    totalPanels: number;
    totalDcPowerKwp: number;
    dailyGenerationKwh: number;
    roofAreaM2: number;
  };
}

