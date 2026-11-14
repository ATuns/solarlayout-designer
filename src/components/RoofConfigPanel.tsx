/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RoofConfig, RoofMaterial, RoofShape, VietnamRegion } from '../types/solar';
import { ROOF_MATERIALS, REGIONAL_SOLAR_HOURS } from '../data/solar-presets';
import { Home, Compass, ShieldAlert, Layers, MapPin, Sliders } from 'lucide-react';
import { NumberInput } from './NumberInput';

interface RoofConfigPanelProps {
  roof: RoofConfig;
  onChange: (updated: Partial<RoofConfig>) => void;
  grossAreaM2: number;
}

export const RoofConfigPanel: React.FC<RoofConfigPanelProps> = ({
  roof,
  onChange,
  grossAreaM2,
}) => {
  const currentMaterial = ROOF_MATERIALS[roof.material];

  return (
    <div className="space-y-5 text-sm">
      {/* 1. Kích thước & Hình dáng mái */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Home className="w-4 h-4 text-amber-400" />
            <span>Kích Thước Mái Nhà</span>
          </div>
          <span className="font-mono text-xs text-amber-400 font-semibold tabular-nums">
            {grossAreaM2.toFixed(1)} m²
          </span>
        </div>

        {/* Chọn hình dạng mái */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Hình Dạng Mặt Bằng Mái
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'rectangle', label: 'Hình Chữ Nhật' },
              { id: 'l_shape', label: 'Chữ L / Khuyết' },
              { id: 'trapezoid', label: 'Hình Thang' },
            ].map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => onChange({ shape: shape.id as RoofShape })}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center ${
                  roof.shape === shape.id
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kích thước mét */}
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Chiều rộng W (mét)"
            value={roof.widthM}
            onChange={(val) => onChange({ widthM: val })}
            unit="m"
            step="0.5"
            min={1}
            allowZero={false}
            errorMessage="Chiều rộng mái phải lớn hơn 0"
          />

          <NumberInput
            label="Chiều dài L (mét)"
            value={roof.lengthM}
            onChange={(val) => onChange({ lengthM: val })}
            unit="m"
            step="0.5"
            min={1}
            allowZero={false}
            errorMessage="Chiều dài mái phải lớn hơn 0"
          />
        </div>

        {/* Tùy chỉnh khuyết cho chữ L */}
        {roof.shape === 'l_shape' && (
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg space-y-2">
            <span className="text-xs text-amber-300 font-medium">Kích thước góc khuyết chữ L</span>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Rộng khuyết (m)"
                value={roof.cutWidthM || 3}
                onChange={(val) => onChange({ cutWidthM: val })}
                unit="m"
                step="0.5"
                min={0.1}
                allowZero={false}
                errorMessage="Rộng khuyết phải lớn hơn 0"
              />
              <NumberInput
                label="Dài khuyết (m)"
                value={roof.cutLengthM || 3}
                onChange={(val) => onChange({ cutLengthM: val })}
                unit="m"
                step="0.5"
                min={0.1}
                allowZero={false}
                errorMessage="Dài khuyết phải lớn hơn 0"
              />
            </div>
          </div>
        )}

        {/* Tùy chỉnh đáy trên cho hình thang */}
        {roof.shape === 'trapezoid' && (
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg">
            <NumberInput
              label="Chiều rộng cạnh đỉnh trên (mét)"
              value={roof.topWidthM || Number((roof.widthM * 0.6).toFixed(1))}
              onChange={(val) => onChange({ topWidthM: val })}
              unit="m"
              step="0.5"
              min={0.1}
              allowZero={false}
              errorMessage="Cạnh đỉnh trên phải lớn hơn 0"
            />
          </div>
        )}

        {/* Khoảng lùi mép an toàn (Setback) */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Khoảng Lùi Mép An Toàn (Setback)
            </span>
            <span className="font-mono text-slate-200">{roof.setbackM} m</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.5"
            step="0.1"
            value={roof.setbackM}
            onChange={(e) => onChange({ setbackM: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Khuyến nghị lùi tối thiểu 0.5m để đi dây, bảo trì và giảm áp lực gió giật mép mái.
          </p>
        </div>
      </div>

      {/* 2. Loại vật liệu mái (Yêu cầu chính) */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Vật Liệu Mái Làm Bằng Gì?</span>
          </div>
        </div>

        <div className="space-y-2">
          {(Object.keys(ROOF_MATERIALS) as RoofMaterial[]).map((key) => {
            const mat = ROOF_MATERIALS[key];
            const isSelected = roof.material === key;
            return (
              <div
                key={key}
                onClick={() => onChange({ material: key })}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/50 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
                    {mat.name}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: mat.color }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                  {mat.description}
                </p>
                <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1 pt-1.5 border-t border-slate-700/40">
                  <span>Phụ kiện: <strong className="text-slate-300">{mat.mountType}</strong></span>
                  <span>Chịu gió: <strong className="text-slate-300">{mat.windResistance}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Độ dốc & Hướng Mái & Khu Vực Địa Lý */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3.5">
        <div className="flex items-center gap-2 text-slate-200 font-semibold border-b border-slate-700/60 pb-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Độ Dốc & Bức Xạ Vùng Miền</span>
        </div>

        {/* Khu vực */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            Khu vực lắp đặt tại Việt Nam
          </label>
          <select
            value={roof.region}
            onChange={(e) => onChange({ region: e.target.value as VietnamRegion })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            {Object.entries(REGIONAL_SOLAR_HOURS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name} ({val.peakSunHours} kWh/m²/ngày)
              </option>
            ))}
          </select>
        </div>

        {/* Độ dốc mái */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Độ Dốc Mái (Góc Nghiêng)</span>
            <span className="font-mono text-emerald-300 font-semibold">{roof.slopeDeg}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="45"
            step="1"
            value={roof.slopeDeg}
            onChange={(e) => onChange({ slopeDeg: parseInt(e.target.value) || 0 })}
            className="w-full accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0° (Bằng phẳng)</span>
            <span className="text-emerald-400">12° - 15° (Tối ưu VN)</span>
            <span>45° (Dốc đứng)</span>
          </div>
        </div>

        {/* Hướng nhà / Hướng mái */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium text-slate-300">Hướng Nhà / Mái (Góc Phương Vị)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="360"
                value={roof.azimuthDeg}
                onChange={(e) => onChange({ azimuthDeg: (parseInt(e.target.value) || 0) % 360 })}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-emerald-300 font-bold"
              />
              <span className="text-xs font-mono text-emerald-400">°</span>
            </div>
          </div>

          {/* Slider 360 độ */}
          <input
            type="range"
            min="0"
            max="359"
            step="1"
            value={roof.azimuthDeg}
            onChange={(e) => onChange({ azimuthDeg: parseInt(e.target.value) || 0 })}
            className="w-full accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer mb-2"
          />

          {/* 8 hướng phong thủy & kỹ thuật */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { deg: 180, label: 'Nam', sub: 'Tối ưu 100%' },
              { deg: 135, label: 'Đông Nam', sub: 'Nắng sớm' },
              { deg: 225, label: 'Tây Nam', sub: 'Nắng chiều' },
              { deg: 90, label: 'Đông', sub: 'Nắng sáng' },
              { deg: 270, label: 'Tây', sub: 'Nắng gắt' },
              { deg: 45, label: 'Đông Bắc', sub: 'Mát mẻ' },
              { deg: 315, label: 'Tây Bắc', sub: 'Nắng xiên' },
              { deg: 0, label: 'Bắc', sub: 'Bức xạ thấp' },
            ].map((dir) => (
              <button
                key={dir.deg}
                type="button"
                onClick={() => onChange({ azimuthDeg: dir.deg })}
                className={`py-1.5 px-1 rounded border text-xs transition-colors ${
                  roof.azimuthDeg === dir.deg
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">{dir.label}</div>
                <div className="text-[9px] text-slate-500 font-mono">{dir.deg}°</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Mẹo: Bạn cũng có thể chạm tay hoặc kéo chuột trực tiếp lên đồng hồ La Bàn trên bản vẽ để xoay hướng nhà.
          </p>
        </div>
      </div>
    </div>
  );
};
