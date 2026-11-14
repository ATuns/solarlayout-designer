/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Plus,
  Grid,
  Wand2,
  RotateCw,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  AlertTriangle,
  Boxes,
  Eye,
  AlignVerticalSpaceAround,
  PanelLeft,
  Maximize2,
  Menu,
} from 'lucide-react';

interface CanvasToolbarProps {
  isLeftSidebarOpen?: boolean;
  onToggleLeftSidebar?: () => void;
  onAddSinglePanel: () => void;
  onOpenArrayModal: () => void;
  onAutoFill: () => void;
  onOpenObstacleModal: () => void;
  selectedPanelId: string | null;
  onRotateSelected: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  selectedObstacleId: string | null;
  onRotateSelectedObstacle: () => void;
  onDeleteSelectedObstacle: () => void;
  isSnapEnabled: boolean;
  onToggleSnap: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  totalPanels: number;
  invalidCount: number;
  showDimensions: boolean;
  onToggleDimensions: () => void;
  onToggleFullscreen?: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isLeftSidebarOpen,
  onToggleLeftSidebar,
  onAddSinglePanel,
  onOpenArrayModal,
  onAutoFill,
  onOpenObstacleModal,
  selectedPanelId,
  onRotateSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onClearAll,
  selectedObstacleId,
  onRotateSelectedObstacle,
  onDeleteSelectedObstacle,
  isSnapEnabled,
  onToggleSnap,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  totalPanels,
  invalidCount,
  showDimensions,
  onToggleDimensions,
  onToggleFullscreen,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl">
      {/* Group 1: Đóng/Mở Menu Cấu Hình Mái + Thêm và Bố Trí Pin & Vật Cản */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {onToggleLeftSidebar && (
          <button
            type="button"
            onClick={onToggleLeftSidebar}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors shrink-0 ${
              isLeftSidebarOpen
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
            }`}
            title="Đóng / mở menu cấu hình mái nhà & dự án"
            aria-label="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onAddSinglePanel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          title="Thêm 1 tấm pin vào giữa mái"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm 1 Tấm</span>
        </button>

        <button
          type="button"
          onClick={onOpenArrayModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          title="Tạo mảng pin nhiều hàng x cột (vd: 2 hàng x 8 cột)"
        >
          <Grid className="w-3.5 h-3.5 text-sky-400" />
          <span>Tạo Mảng Pin</span>
        </button>

        <button
          type="button"
          onClick={onAutoFill}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap"
          title="Tự động tính toán xếp tối đa số tấm pin phủ kín diện tích mái an toàn"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Tự Động Xếp Mái</span>
        </button>

        <button
          type="button"
          onClick={onOpenObstacleModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          title="Thêm vật cản (Bồn nước, giếng trời, ống thông gió...)"
        >
          <Boxes className="w-3.5 h-3.5 text-orange-400" />
          <span>+ Vật Cản</span>
        </button>

        {/* Nút bật/tắt Tự Động Khớp/Hút Dính (Magnetic Snap 20mm - Không khớp 0mm) */}
        <button
          type="button"
          onClick={onToggleSnap}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
            isSnapEnabled
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Bật/tắt chế độ tự động hút khớp cạnh ở khoảng cách chuẩn 20mm (không khớp 0mm)"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isSnapEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span>Tự Khớp 20mm ({isSnapEnabled ? 'Bật' : 'Tắt'})</span>
        </button>
      </div>

      {/* Group 2: Thao tác tấm pin HOẶC vật cản đang chọn */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Nút cho Vật Cản nếu đang chọn vật cản */}
        {selectedObstacleId && (
          <>
            <button
              type="button"
              onClick={onRotateSelectedObstacle}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 rounded-lg transition-colors whitespace-nowrap"
              title="Xoay vật cản 90 độ"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Xoay Vật Cản 90°</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSelectedObstacle}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30 rounded-lg transition-colors whitespace-nowrap"
              title="Xóa vật cản đang chọn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Vật Cản</span>
            </button>
          </>
        )}

        {/* Nút cho Tấm Pin nếu đang chọn tấm pin */}
        {selectedPanelId && (
          <>
            <button
              type="button"
              onClick={onRotateSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white rounded-lg transition-colors whitespace-nowrap"
              title="Xoay tấm pin 90 độ (Dọc / Ngang)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Xoay 90°</span>
            </button>

            <button
              type="button"
              onClick={onDuplicateSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              title="Nhân bản tấm pin đang chọn"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Nhân Bản</span>
            </button>

            <button
              type="button"
              onClick={onDeleteSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors whitespace-nowrap"
              title="Xóa tấm pin đang chọn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Tấm</span>
            </button>
          </>
        )}

        {totalPanels > 0 && !selectedPanelId && !selectedObstacleId && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            title="Xóa sạch toàn bộ các tấm pin trên mái"
          >
            Xóa Hết Pin
          </button>
        )}
      </div>

      {/* Group 3: View & Status Indicator */}
      <div className="flex items-center gap-2">
        {/* Cảnh báo pin sai vị trí nếu có */}
        {invalidCount > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-lg text-xs"
            title="Có tấm pin vượt ra khỏi khoảng lùi an toàn hoặc va chạm chướng ngại vật"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono font-medium">{invalidCount} tấm cảnh báo</span>
          </div>
        )}

        {/* Toggle kích thước thước đo */}
        <button
          type="button"
          onClick={onToggleDimensions}
          className={`p-1.5 rounded-lg border transition-colors ${
            showDimensions
              ? 'bg-slate-800 border-amber-500/40 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Bật/Tắt hiển thị kích thước mm trên bản vẽ"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 rounded-lg p-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-700"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 px-1.5 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-700"
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-700 ml-0.5 border-l border-slate-700"
            title="Vừa khít màn hình (100%)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nút Phóng To Toàn Màn Hình chỉ riêng vùng vẽ */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            title="Phóng to vùng vẽ toàn màn hình (Ẩn toàn bộ thanh công cụ và menu cho Laptop, Máy tính bảng, Điện thoại)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Toàn Màn Hình</span>
          </button>
        )}
      </div>
    </div>
  );
};
