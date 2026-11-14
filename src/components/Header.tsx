/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  FileText,
  RotateCcw,
  FolderOpen,
  Save,
  Check,
  Menu,
  ChevronDown,
  X,
} from 'lucide-react';

interface HeaderProps {
  onOpenProjectManager: () => void;
  savedProjectsCount?: number;
  activeProjectName?: string | null;
  onQuickSaveActiveProject?: () => void;
  onExportDrawing: () => void;
  onReset: () => void;
  activeTab: 'designer' | 'specs' | 'analysis';
  setActiveTab: (tab: 'designer' | 'specs' | 'analysis') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProjectManager,
  savedProjectsCount = 0,
  activeProjectName,
  onQuickSaveActiveProject,
  onExportDrawing,
  onReset,
  activeTab,
  setActiveTab,
}) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setIsActionMenuOpen(false);
      }
    };
    if (isActionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionMenuOpen]);

  const handleQuickSaveClick = () => {
    if (!onQuickSaveActiveProject) return;
    onQuickSaveActiveProject();
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      setIsActionMenuOpen(false);
    }, 1000);
  };

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-900 border-b border-slate-800 shrink-0 z-30">
      {/* Zone 1: Brand Wordmark + Active Project Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
              SolarDesign Pro
            </span>
            {activeProjectName && (
              <span
                onClick={onOpenProjectManager}
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-md truncate max-w-[220px] cursor-pointer hover:bg-emerald-500/25 transition-colors"
                title={`Đang chỉnh sửa dự án: ${activeProjectName}`}
              >
                <FolderOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{activeProjectName}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 hidden xl:block whitespace-nowrap">
            Thiết Kế Điện Mặt Trời & Lưu Trữ
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links / Primary Tabs */}
      <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
        <button
          onClick={() => setActiveTab('designer')}
          className={`px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'designer'
              ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Mặt Bằng
        </button>
        <button
          onClick={() => setActiveTab('specs')}
          className={`px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'specs'
              ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Thông Số
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'analysis'
              ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          Sản Lượng
        </button>
      </nav>

      {/* Zone 3: Nút Menu 3 gạch Đóng/Mở chứa Lưu / Mở Dự Án, Lưu Cập Nhật & Xuất Bản Vẽ */}
      <div ref={menuContainerRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setIsActionMenuOpen((prev) => !prev)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all shadow-sm ${
            isActionMenuOpen
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
          }`}
          title="Menu Lưu / Mở dự án, Lưu cập nhật và Xuất bản vẽ PDF/Ảnh"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isActionMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 space-y-1.5 z-50 animate-fade-in">
            <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu Dự Án & Bản Vẽ
              </span>
              <button
                type="button"
                onClick={() => setIsActionMenuOpen(false)}
                className="p-0.5 text-slate-400 hover:text-white rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeProjectName && (
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 mb-1">
                <span className="text-slate-500 block text-[10px]">Đang mở dự án:</span>
                <span className="font-semibold text-emerald-300 truncate block">
                  {activeProjectName}
                </span>
              </div>
            )}

            {/* 1. Nút Lưu Cập Nhật (hiện khi đang mở dự án cũ) */}
            {activeProjectName && onQuickSaveActiveProject && (
              <button
                type="button"
                onClick={handleQuickSaveClick}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${
                  justSaved
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {justSaved ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <Save className="w-4 h-4 shrink-0" />
                )}
                <span>{justSaved ? 'Đã Lưu Cập Nhật!' : 'Lưu Cập Nhật Dự Án'}</span>
              </button>
            )}

            {/* 2. Nút Lưu / Mở Dự Án (JSON Offline) */}
            <button
              type="button"
              onClick={() => {
                setIsActionMenuOpen(false);
                onOpenProjectManager();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Lưu / Mở Dự Án</span>
              </span>
              {savedProjectsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-mono">
                  {savedProjectsCount}
                </span>
              )}
            </button>

            {/* 3. Nút Xuất Bản Vẽ (PDF / Ảnh) */}
            <button
              type="button"
              onClick={() => {
                setIsActionMenuOpen(false);
                onExportDrawing();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Xuất Bản Vẽ (PDF / Ảnh)</span>
            </button>

            {/* 4. Khôi phục mặc định */}
            <div className="pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsActionMenuOpen(false);
                  onReset();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Khôi Phục Mặc Định</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};


