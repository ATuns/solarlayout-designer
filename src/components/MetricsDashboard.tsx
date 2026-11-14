/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BatterySpec, InverterSpec, PanelSpec, RoofConfig, SystemMetrics } from '../types/solar';
import {
  Zap,
  Sun,
  BatteryCharging,
  PieChart,
  Leaf,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface MetricsDashboardProps {
  metrics: SystemMetrics;
  panelSpec: PanelSpec;
  inverterSpec: InverterSpec;
  batterySpec: BatterySpec;
  roof: RoofConfig;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  panelSpec,
  inverterSpec,
  batterySpec,
  roof,
}) => {
  const isGridTie = inverterSpec.type === 'grid_tie';

  return (
    <div className="space-y-4">
      {/* 1. Các chỉ số kỹ thuật chính (KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Công suất giàn pin */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Công Suất Giàn Pin
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              {metrics.totalDcPowerKwp}
            </span>
            <span className="text-xs font-semibold text-slate-400">kWp</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.totalPanels} tấm × {panelSpec.powerWp}W
          </div>
        </div>

        {/* Card 2: Tỷ lệ DC/AC Inverter Sizing Ratio */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              Tỷ Lệ DC / AC
            </span>
            {metrics.dcAcStatus === 'optimal' ? (
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Chuẩn
              </span>
            ) : metrics.dcAcStatus === 'high' ? (
              <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Cao
              </span>
            ) : metrics.dcAcStatus === 'overload' ? (
              <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Quá Tải
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Thấp</span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-sky-300 tabular-nums">
              {(metrics.dcAcRatio * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-slate-400 font-mono">({metrics.dcAcRatio}:1)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate" title={inverterSpec.name}>
            Biến tần: {inverterSpec.ratedPowerKw} kW AC
          </div>
        </div>

        {/* Card 3: Nếu là Biến tần Hòa lưới bám tải -> Hiển thị Sản Lượng Ngày. Nếu Hybrid/Độc lập -> Hiển thị Pin Lưu Trữ */}
        {isGridTie ? (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Sản Lượng Bình Quân Ngày
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
                {metrics.dailyGenerationKwh}
              </span>
              <span className="text-xs font-semibold text-slate-400">kWh / ngày</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Bức xạ: {metrics.dailyPeakSunHours} giờ nắng/ngày
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                Dung Lượng Pin Lưu Trữ
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
                {metrics.batteryTotalKwh}
              </span>
              <span className="text-xs font-semibold text-slate-400">kWh</span>
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Dự phòng: <strong>{metrics.batteryAutonomyHours}h</strong> liên tục</span>
            </div>
          </div>
        )}

        {/* Card 4: Sản lượng điện năm */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              Sản Lượng Điện Năm
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-purple-300 tabular-nums">
              {metrics.annualGenerationKwh.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs font-semibold text-slate-400">kWh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ~ {metrics.monthlyGenerationKwh.toLocaleString('vi-VN')} kWh / tháng
          </div>
        </div>
      </div>

      {/* 2. Chi tiết phân tích kỹ thuật: Khai thác mặt bằng & Sản lượng môi trường */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Khai thác diện tích mặt bằng */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-amber-400" />
              Mức Độ Khai Thác Diện Tích Mái
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold tabular-nums">
              {metrics.coveragePct}% Mái
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Tổng diện tích mặt bằng mái:</span>
              <span className="font-mono">{metrics.roofGrossAreaM2} m²</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Diện tích khả dụng (trừ khoảng lùi {roof.setbackM}m):</span>
              <span className="font-mono">{metrics.roofNetUsableAreaM2} m²</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Tổng diện tích giàn pin chiếm dụng:</span>
              <span className="font-mono text-amber-300 font-semibold">{metrics.totalPanelAreaM2} m²</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Diện tích mái còn trống:</span>
              <span className="font-mono text-slate-400">
                {Math.max(0, metrics.roofGrossAreaM2 - metrics.totalPanelAreaM2).toFixed(1)} m²
              </span>
            </div>
          </div>

          {/* Progress bar độ phủ */}
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mt-2">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.coveragePct)}%` }}
            />
          </div>
        </div>

        {/* Báo cáo Sản lượng năng lượng & Môi trường (Không chứa báo giá) */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-400" />
              Hiệu Quả Năng Lượng & Môi Trường
            </span>
            <span className="text-xs text-emerald-400 font-medium">Bình quân 25 năm</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Sản lượng điện trung bình ngày:</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">
                {metrics.dailyGenerationKwh} kWh / ngày
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Sản lượng điện trung bình tháng:</span>
              <span className="font-mono text-emerald-300 tabular-nums">
                {metrics.monthlyGenerationKwh.toLocaleString('vi-VN')} kWh / tháng
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Sản lượng điện phát cả năm:</span>
              <span className="font-mono text-purple-300 font-bold tabular-nums">
                {metrics.annualGenerationKwh.toLocaleString('vi-VN')} kWh / năm
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400 flex items-center gap-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                Giảm phát thải CO2 hàng năm:
              </span>
              <span className="font-mono text-slate-200">
                {(metrics.annualCo2ReductionKg / 1000).toFixed(1)} tấn CO2 / năm
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Tương đương hấp thụ:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {metrics.equivalentTreesPlanted} cây xanh / năm
              </span>
            </div>

            {/* Nếu có lưu trữ (Hybrid / Off-Grid) thì hiển thị chi tiết pin */}
            {!isGridTie && metrics.batteryTotalKwh > 0 && (
              <div className="pt-2 border-t border-slate-700/60 mt-2 flex justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  Dung lượng lưu trữ khả dụng:
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {metrics.batteryUsableKwh} kWh ({batterySpec.name})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
