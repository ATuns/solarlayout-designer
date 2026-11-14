/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BatterySpec, InverterSpec, PanelSpec } from '../types/solar';
import { PRESET_PANELS, PRESET_INVERTERS, PRESET_BATTERIES } from '../data/solar-presets';
import {
  SunMedium,
  Zap,
  BatteryCharging,
  Maximize2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { NumberInput } from './NumberInput';

interface EquipmentPanelProps {
  panelSpec: PanelSpec;
  onPanelSpecChange: (spec: Partial<PanelSpec>) => void;
  inverterSpec: InverterSpec;
  onInverterSpecChange: (spec: Partial<InverterSpec>) => void;
  batterySpec: BatterySpec;
  onBatterySpecChange: (spec: Partial<BatterySpec>) => void;
  dailyCriticalLoadKwh: number;
  onCriticalLoadChange: (load: number) => void;
}

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
  panelSpec,
  onPanelSpecChange,
  inverterSpec,
  onInverterSpecChange,
  batterySpec,
  onBatterySpecChange,
  dailyCriticalLoadKwh,
  onCriticalLoadChange,
}) => {
  const [activeSection, setActiveSection] = useState<'panel' | 'inverter' | 'battery'>('panel');
  const isGridTie = inverterSpec.type === 'grid_tie';

  return (
    <div className="space-y-4 text-sm">
      {/* Tab bar inside Equipment Panel */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveSection('panel')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
            activeSection === 'panel'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SunMedium className="w-3.5 h-3.5" />
          <span className="truncate">Tấm Pin PV</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('inverter')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
            activeSection === 'inverter'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="truncate">Máy Inverter</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('battery')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
            activeSection === 'battery'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          } ${isGridTie ? 'opacity-70' : ''}`}
        >
          <BatteryCharging className="w-3.5 h-3.5" />
          <span className="truncate">
            Pin Lưu Trữ {isGridTie ? '(Không Dùng)' : ''}
          </span>
        </button>
      </div>

      {/* 1. TẤM PIN MẶT TRỜI */}
      {activeSection === 'panel' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <SunMedium className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-100">Kích Thước & Thông Số Tấm Pin</span>
            </div>
            <span className="text-xs text-amber-400 font-mono">
              {(panelSpec.lengthMm / 1000).toFixed(2)}m × {(panelSpec.widthMm / 1000).toFixed(2)}m
            </span>
          </div>

          {/* Preset nhanh */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Chọn Mẫu Tấm Pin Phổ Biến (Hoặc Tự Nhập Bên Dưới)
            </label>
            <select
              value={panelSpec.id}
              onChange={(e) => {
                const found = PRESET_PANELS.find((p) => p.id === e.target.value);
                if (found) onPanelSpecChange(found);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {PRESET_PANELS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.powerWp}Wp ({p.lengthMm} × {p.widthMm} mm)
                </option>
              ))}
              <option value="custom">-- Tự nhập kích thước & thông số khác --</option>
            </select>
          </div>

          {/* Tên & Hãng tấm pin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tên Tấm Pin / Model</label>
              <input
                type="text"
                value={panelSpec.name}
                onChange={(e) => onPanelSpecChange({ id: 'custom', name: e.target.value })}
                placeholder="VD: AE Solar Aurora 630W..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hãng Sản Xuất</label>
              <input
                type="text"
                value={panelSpec.brand}
                onChange={(e) => onPanelSpecChange({ brand: e.target.value })}
                placeholder="VD: AE Solar, Longi, Canadian..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Chiều dài & Chiều rộng (Cho phép xóa hết để nhập số mới, báo lỗi khi bằng 0) */}
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Kích Thước Vật Lý Tấm Pin (Bắt Buộc Nhập)</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <NumberInput
                label="Chiều Dài (mm)"
                value={panelSpec.lengthMm}
                onChange={(val) => onPanelSpecChange({ lengthMm: val })}
                unit="mm"
                step="1"
                min={100}
                allowZero={false}
                errorMessage="Chiều dài phải lớn hơn 0"
              />

              <NumberInput
                label="Chiều Rộng (mm)"
                value={panelSpec.widthMm}
                onChange={(val) => onPanelSpecChange({ widthMm: val })}
                unit="mm"
                step="1"
                min={100}
                allowZero={false}
                errorMessage="Chiều rộng phải lớn hơn 0"
              />

              <NumberInput
                label="Độ Dày (mm)"
                value={panelSpec.thicknessMm}
                onChange={(val) => onPanelSpecChange({ thicknessMm: val })}
                unit="mm"
                step="1"
                min={10}
                allowZero={false}
                errorMessage="Độ dày phải lớn hơn 0"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Diện tích 1 tấm pin:{' '}
              <strong className="text-amber-300 font-mono">
                {((panelSpec.lengthMm * panelSpec.widthMm) / 1_000_000).toFixed(2)} m²
              </strong>
            </p>
          </div>

          {/* Công suất điện Wp, Hiệu suất, Trọng lượng */}
          <div className="grid grid-cols-3 gap-2.5">
            <NumberInput
              label="Công Suất (Wp)"
              value={panelSpec.powerWp}
              onChange={(val) => onPanelSpecChange({ powerWp: val })}
              unit="Wp"
              step="5"
              min={50}
              allowZero={false}
              errorMessage="Công suất phải lớn hơn 0"
            />

            <NumberInput
              label="Hiệu Suất (%)"
              value={panelSpec.efficiencyPct}
              onChange={(val) => onPanelSpecChange({ efficiencyPct: val })}
              unit="%"
              step="0.1"
              min={1}
              allowZero={false}
              errorMessage="Hiệu suất phải lớn hơn 0"
            />

            <NumberInput
              label="Trọng Lượng (kg)"
              value={panelSpec.weightKg}
              onChange={(val) => onPanelSpecChange({ weightKg: val })}
              unit="kg"
              step="0.5"
              min={1}
              allowZero={false}
              errorMessage="Trọng lượng phải lớn hơn 0"
            />
          </div>
        </div>
      )}

      {/* 2. MÁY BIẾN TẦN INVERTER */}
      {activeSection === 'inverter' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-slate-100">Máy Biến Tần Inverter (Bắt Buộc Nhập)</span>
            </div>
            <span className="text-xs text-sky-400 font-mono font-semibold">
              {inverterSpec.ratedPowerKw} kW AC
            </span>
          </div>

          {/* Mẫu có sẵn */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              Chọn Mẫu Biến Tần Có Sẵn (Hoặc Tự Nhập Tên & Công Suất Bên Dưới)
            </label>
            <select
              value={inverterSpec.name}
              onChange={(e) => {
                const found = PRESET_INVERTERS.find((inv) => inv.name === e.target.value);
                if (found) onInverterSpecChange(found);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {PRESET_INVERTERS.map((inv) => (
                <option key={inv.name} value={inv.name}>
                  {inv.name} — {inv.ratedPowerKw}kW ({inv.type === 'hybrid' ? 'Hybrid' : 'Hòa Lưới'})
                </option>
              ))}
              <option value="custom">-- Tự nhập tên & thông số máy khác --</option>
            </select>
          </div>

          {/* Tên máy & Hãng & Công suất định mức */}
          <div className="p-3 bg-sky-500/5 border border-sky-500/20 rounded-xl space-y-3">
            <div>
              <label className="block text-xs text-sky-300 font-semibold mb-1">
                Tên Máy Biến Tần / Model Inverter (Bắt Buộc)
              </label>
              <input
                type="text"
                value={inverterSpec.name}
                onChange={(e) => onInverterSpecChange({ name: e.target.value })}
                placeholder="VD: SolaX X3-Hybrid G4 10kW..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Công Suất Định Mức AC (kW)"
                value={inverterSpec.ratedPowerKw}
                onChange={(val) => onInverterSpecChange({ ratedPowerKw: val })}
                unit="kW"
                step="0.5"
                min={0.5}
                allowZero={false}
                errorMessage="Công suất AC phải lớn hơn 0"
              />

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Hãng Sản Xuất
                </label>
                <input
                  type="text"
                  value={inverterSpec.brand}
                  onChange={(e) => onInverterSpecChange({ brand: e.target.value })}
                  placeholder="SolaX Power, Deye, Huawei..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Loại biến tần & Thông số DC */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Loại Hệ Thống Inverter
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'grid_tie', label: 'Hòa Lưới Bám Tải', sub: 'Không lưu trữ (Zero-export)' },
                { id: 'hybrid', label: 'Hybrid Lưu Trữ', sub: 'Tối ưu có pin' },
                { id: 'off_grid', label: 'Độc Lập Off-Grid', sub: 'Không nối lưới' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onInverterSpecChange({ type: t.id as any })}
                  className={`py-2 px-1 text-center rounded-lg border text-xs transition-all ${
                    inverterSpec.type === t.id
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-semibold'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>{t.label}</div>
                  <div className="text-[10px] text-slate-500">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <NumberInput
              label="Max DC In (kW)"
              value={inverterSpec.maxDcPowerKw}
              onChange={(val) => onInverterSpecChange({ maxDcPowerKw: val })}
              unit="kW"
              step="0.5"
              min={0.5}
              allowZero={false}
              errorMessage="Max DC phải lớn hơn 0"
            />

            <NumberInput
              label="Số Kênh MPPT"
              value={inverterSpec.mpptCount}
              onChange={(val) => onInverterSpecChange({ mpptCount: val })}
              step="1"
              min={1}
              allowZero={false}
              errorMessage="Số MPPT phải lớn hơn 0"
            />

            <NumberInput
              label="Hiệu Suất (%)"
              value={inverterSpec.efficiencyPct}
              onChange={(val) => onInverterSpecChange({ efficiencyPct: val })}
              unit="%"
              step="0.1"
              min={50}
              allowZero={false}
              errorMessage="Hiệu suất phải lớn hơn 0"
            />
          </div>
        </div>
      )}

      {/* 3. PIN LƯU TRỮ */}
      {activeSection === 'battery' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-100">Pin Lưu Trữ Năng Lượng</span>
            </div>
            {!isGridTie && (
              <span className="text-xs text-emerald-400 font-mono font-semibold">
                {(batterySpec.capacityKwh * batterySpec.quantity).toFixed(2)} kWh Tổng
              </span>
            )}
          </div>

          {/* Thông báo nếu biến tần đang chọn là bám tải / không lưu trữ */}
          {isGridTie ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center space-y-2.5">
              <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto" />
              <h3 className="text-sm font-semibold text-amber-300">
                Biến Tần Đang Chọn Là Hòa Lưới Bám Tải (Không Lưu Trữ)
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Khi sử dụng Biến tần hòa lưới bám tải (Zero-Export), hệ thống không kết nối pin lưu trữ và phần báo cáo sản lượng sẽ tự động xóa bỏ thông số pin lưu trữ.
              </p>
              <button
                type="button"
                onClick={() => onInverterSpecChange({ type: 'hybrid' })}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Chuyển Sang Biến Tần Hybrid Có Lưu Trữ</span>
              </button>
            </div>
          ) : (
            <>
              {/* Mẫu có sẵn */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Chọn Mẫu Pin Phổ Biến (Hoặc Tự Nhập Tên & Dung Lượng Bên Dưới)
                </label>
                <select
                  value={batterySpec.name}
                  onChange={(e) => {
                    const found = PRESET_BATTERIES.find((b) => b.name === e.target.value);
                    if (found) onBatterySpecChange(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {PRESET_BATTERIES.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} — {b.capacityKwh}kWh ({b.voltageV}V / {b.capacityAh}Ah)
                    </option>
                  ))}
                  <option value="custom">-- Tự nhập tên & dung lượng bộ lưu trữ khác --</option>
                </select>
              </div>

              {/* Tên & Dung Lượng */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-emerald-300 font-semibold mb-1">
                      Tên Bộ Pin Lưu Trữ / Model (Bắt Buộc)
                    </label>
                    <input
                      type="text"
                      value={batterySpec.name}
                      onChange={(e) => onBatterySpecChange({ name: e.target.value })}
                      placeholder="VD: SolaX LD160 16kWh..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hãng Sản Xuất</label>
                    <input
                      type="text"
                      value={batterySpec.brand}
                      onChange={(e) => onBatterySpecChange({ brand: e.target.value })}
                      placeholder="SolaX Power, Dyness, BYD..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label="Dung Lượng Tổng 1 Pack (kWh)"
                    value={batterySpec.capacityKwh}
                    onChange={(val) => {
                      onBatterySpecChange({
                        capacityKwh: val,
                        usableCapacityKwh: Number(((val * (batterySpec.maxDodPct || 90)) / 100).toFixed(2)),
                      });
                    }}
                    unit="kWh"
                    step="0.1"
                    min={0.5}
                    allowZero={false}
                    errorMessage="Dung lượng pin phải lớn hơn 0"
                  />

                  <NumberInput
                    label="Số Lượng Pack Pin (Bộ)"
                    value={batterySpec.quantity || 1}
                    onChange={(val) => onBatterySpecChange({ quantity: val })}
                    step="1"
                    min={1}
                    allowZero={false}
                    errorMessage="Số lượng pack pin phải lớn hơn 0"
                  />
                </div>
              </div>

              {/* Điện áp & Dung lượng Ah & DoD */}
              <div className="grid grid-cols-3 gap-2.5">
                <NumberInput
                  label="Điện Áp (V)"
                  value={batterySpec.voltageV}
                  onChange={(val) => onBatterySpecChange({ voltageV: val })}
                  unit="V"
                  step="0.1"
                  min={1}
                  allowZero={false}
                  errorMessage="Điện áp phải lớn hơn 0"
                />

                <NumberInput
                  label="Dung Lượng (Ah)"
                  value={batterySpec.capacityAh}
                  onChange={(val) => onBatterySpecChange({ capacityAh: val })}
                  unit="Ah"
                  step="1"
                  min={1}
                  allowZero={false}
                  errorMessage="Dung lượng Ah phải lớn hơn 0"
                />

                <NumberInput
                  label="Độ Xả Sâu DoD (%)"
                  value={batterySpec.maxDodPct}
                  onChange={(val) => {
                    onBatterySpecChange({
                      maxDodPct: val,
                      usableCapacityKwh: Number(((batterySpec.capacityKwh * val) / 100).toFixed(2)),
                    });
                  }}
                  unit="%"
                  step="1"
                  min={10}
                  max={100}
                  allowZero={false}
                  errorMessage="DoD phải lớn hơn 0"
                />
              </div>

              {/* Cấu hình tải tiêu thụ dự phòng */}
              <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">
                    Nhu Cầu Phụ Tải Thiết Yếu (kWh/ngày)
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">
                    {dailyCriticalLoadKwh} kWh/ngày
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={dailyCriticalLoadKwh}
                  onChange={(e) => onCriticalLoadChange(parseInt(e.target.value) || 5)}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Phụ tải thiết yếu khi cúp điện: Đèn chiếu sáng, quạt, tủ lạnh, camera an ninh, modem wifi (~10-15 kWh/ngày).
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
