/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Obstacle, ObstacleType } from '../types/solar';
import { Boxes, X, Plus } from 'lucide-react';
import { NumberInput } from './NumberInput';

interface AddObstacleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (obstacle: Obstacle) => void;
  roofWidthMm: number;
  roofLengthMm: number;
}

const OBSTACLE_PRESETS: { type: ObstacleType; name: string; widthMm: number; lengthMm: number }[] = [
  { type: 'ac_outdoor', name: 'Cục Nóng Máy Lạnh (30×80cm)', widthMm: 300, lengthMm: 800 },
  { type: 'water_tank', name: 'Bồn Nước Sơn Hà 1500L', widthMm: 1200, lengthMm: 1800 },
  { type: 'skylight', name: 'Giếng Trời Lấy Sáng', widthMm: 1500, lengthMm: 1500 },
  { type: 'vent', name: 'Ống Hút Gió Thông Hơi', widthMm: 600, lengthMm: 600 },
  { type: 'chimney', name: 'Cột Kỹ Thuật / Khói', widthMm: 800, lengthMm: 800 },
  { type: 'shadow_tree', name: 'Vùng Đổ Bóng Cây Xanh', widthMm: 2500, lengthMm: 2500 },
];

export const AddObstacleModal: React.FC<AddObstacleModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  roofWidthMm,
  roofLengthMm,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [name, setName] = useState(OBSTACLE_PRESETS[0].name);
  const [type, setType] = useState<ObstacleType>(OBSTACLE_PRESETS[0].type);
  const [widthMm, setWidthMm] = useState(OBSTACLE_PRESETS[0].widthMm);
  const [lengthMm, setLengthMm] = useState(OBSTACLE_PRESETS[0].lengthMm);
  const [xMm, setXMm] = useState(1500);
  const [yMm, setYMm] = useState(1500);

  if (!isOpen) return null;

  const isInvalid = widthMm <= 0 || lengthMm <= 0;

  const handleSelectPreset = (idx: number) => {
    setSelectedPreset(idx);
    const p = OBSTACLE_PRESETS[idx];
    setName(p.name);
    setType(p.type);
    setWidthMm(p.widthMm);
    setLengthMm(p.lengthMm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) return;
    const newObstacle: Obstacle = {
      id: `obs_${Date.now()}`,
      name: name.trim() || 'Vật cản',
      type,
      xMm: Math.max(0, Math.min(xMm, Math.max(0, roofWidthMm - widthMm))),
      yMm: Math.max(0, Math.min(yMm, Math.max(0, roofLengthMm - lengthMm))),
      widthMm,
      lengthMm,
    };
    onAdd(newObstacle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Thêm Vật Cản Trên Mái</h3>
              <p className="text-xs text-slate-400">Tránh lắp tấm pin đè lên vùng cấm này</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Preset Buttons */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Chọn Mẫu Vật Cản Thường Gặp</label>
            <div className="grid grid-cols-2 gap-2">
              {OBSTACLE_PRESETS.map((p, idx) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedPreset === idx
                      ? 'bg-orange-500/10 border-orange-500/50 text-orange-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {p.widthMm} × {p.lengthMm} mm
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tên vật cản */}
          <div>
            <label className="block text-slate-400 mb-1">Tên Vật Cản</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Kích thước */}
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Chiều Rộng (mm)"
              value={widthMm}
              onChange={setWidthMm}
              unit="mm"
              step="50"
              min={100}
              max={10000}
              allowZero={false}
              errorMessage="Chiều rộng phải lớn hơn 0"
            />
            <NumberInput
              label="Chiều Dài (mm)"
              value={lengthMm}
              onChange={setLengthMm}
              unit="mm"
              step="50"
              min={100}
              max={10000}
              allowZero={false}
              errorMessage="Chiều dài phải lớn hơn 0"
            />
          </div>

          {/* Vị trí trên mái (mm) */}
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Tọa độ X từ mép trái (mm)"
              value={xMm}
              onChange={setXMm}
              unit="mm"
              step="100"
              min={0}
              max={roofWidthMm}
              allowZero={true}
            />
            <NumberInput
              label="Tọa độ Y từ mép trên (mm)"
              value={yMm}
              onChange={setYMm}
              unit="mm"
              step="100"
              min={0}
              max={roofLengthMm}
              allowZero={true}
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isInvalid}
              className={`flex items-center gap-1.5 px-4 py-2 text-slate-950 font-semibold rounded-lg transition-colors shadow-sm ${
                isInvalid
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-orange-400 hover:bg-orange-300'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Đặt Lên Mái</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
