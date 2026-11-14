/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PanelSpec } from '../types/solar';
import { Grid, X, Check } from 'lucide-react';
import { NumberInput } from './NumberInput';

interface ArrayGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (
    rows: number,
    cols: number,
    orientation: 'portrait' | 'landscape',
    rowGapMm: number,
    colGapMm: number,
    startX: number,
    startY: number
  ) => void;
  panelSpec: PanelSpec;
  roofSetbackMm: number;
}

export const ArrayGeneratorModal: React.FC<ArrayGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  panelSpec,
  roofSetbackMm,
}) => {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(6);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [rowGapMm, setRowGapMm] = useState(20);
  const [colGapMm, setColGapMm] = useState(20);
  const [startX] = useState(roofSetbackMm + 100);
  const [startY] = useState(roofSetbackMm + 100);

  if (!isOpen) return null;

  const isInvalid = rows <= 0 || cols <= 0 || rowGapMm < 20 || colGapMm < 20;
  const totalPanels = Math.max(0, rows * cols);
  const totalPowerKwp = ((totalPanels * panelSpec.powerWp) / 1000).toFixed(2);

  const panelW = orientation === 'portrait' ? panelSpec.widthMm : panelSpec.lengthMm;
  const panelH = orientation === 'portrait' ? panelSpec.lengthMm : panelSpec.widthMm;

  const arrayWidthM = cols > 0 ? (((cols * panelW + Math.max(0, cols - 1) * colGapMm)) / 1000).toFixed(2) : '0.00';
  const arrayLengthM = rows > 0 ? (((rows * panelH + Math.max(0, rows - 1) * rowGapMm)) / 1000).toFixed(2) : '0.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) return;
    onGenerate(rows, cols, orientation, Math.max(20, rowGapMm), Math.max(20, colGapMm), startX, startY);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tạo Mảng Pin Hàng Loạt (Array)</h3>
              <p className="text-xs text-slate-400">Tự động sắp xếp lưới ma trận hàng × cột</p>
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
          {/* Số hàng x Số cột */}
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Số Hàng (Dòng)"
              value={rows}
              onChange={setRows}
              min={1}
              max={30}
              allowZero={false}
              errorMessage="Số hàng phải lớn hơn 0"
            />
            <NumberInput
              label="Số Cột (Tấm/Hàng)"
              value={cols}
              onChange={setCols}
              min={1}
              max={50}
              allowZero={false}
              errorMessage="Số cột phải lớn hơn 0"
            />
          </div>

          {/* Hướng đặt pin (Dọc hay Ngang) */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Hướng Đặt Tấm Pin</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  orientation === 'portrait'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Đặt Dọc (Portrait - 0°)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  orientation === 'landscape'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Đặt Ngang (Landscape - 90°)
              </button>
            </div>
          </div>

          {/* Khoảng cách khe hở kẹp giữa (mm) */}
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Khoảng hở giữa các hàng (mm)"
              value={rowGapMm}
              onChange={setRowGapMm}
              unit="mm"
              min={20}
              max={500}
              allowZero={false}
              errorMessage="Tối thiểu 20mm"
            />
            <NumberInput
              label="Khe kẹp giữa các tấm (mm)"
              value={colGapMm}
              onChange={setColGapMm}
              unit="mm"
              min={20}
              max={200}
              allowZero={false}
              errorMessage="Tối thiểu 20mm"
            />
          </div>

          {/* Xem trước kết quả */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Tổng số tấm tạo mới:</span>
              <span className="font-mono text-sky-300 font-bold">{totalPanels} tấm</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Công suất sinh ra:</span>
              <span className="font-mono text-amber-400 font-bold">{totalPowerKwp} kWp</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Kích thước mảng pin:</span>
              <span className="font-mono text-slate-200">
                {arrayWidthM}m rộng × {arrayLengthM}m dài
              </span>
            </div>
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
                  : 'bg-sky-400 hover:bg-sky-300'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Chèn Vào Mặt Bằng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
