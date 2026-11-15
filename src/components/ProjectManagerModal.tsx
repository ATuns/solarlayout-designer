/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  BatterySpec,
  InverterSpec,
  Obstacle,
  PanelSpec,
  PlacedPanel,
  RoofConfig,
  SavedSolarProject,
  SystemMetrics,
} from '../types/solar';
import {
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  Copy,
  CheckCircle2,
  Search,
  FileJson,
  Plus,
  Clock,
  MapPin,
  User,
  Sun,
  Layers,
  X,
  Edit3,
  FolderPlus,
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedProjects: SavedSolarProject[];
  activeProjectId: string | null;
  onSaveProject: (meta: {
    id?: string;
    name: string;
    customerName: string;
    address: string;
    notes: string;
    downloadJson?: boolean;
  }) => SavedSolarProject;
  onLoadProject: (project: SavedSolarProject) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (project: SavedSolarProject) => void;
  onImportProjectsFromJson: (projects: SavedSolarProject[], openFirst?: boolean) => void;
  onCreateNewBlankProject: () => void;
  currentRoof: RoofConfig;
  currentPanelSpec: PanelSpec;
  currentInverterSpec: InverterSpec;
  currentBatterySpec: BatterySpec;
  currentPanels: PlacedPanel[];
  currentObstacles: Obstacle[];
  currentMetrics: SystemMetrics;
  grossRoofAreaM2: number;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  savedProjects,
  activeProjectId,
  onSaveProject,
  onLoadProject,
  onDeleteProject,
  onDuplicateProject,
  onImportProjectsFromJson,
  onCreateNewBlankProject,
  currentRoof,
  currentPanelSpec,
  currentInverterSpec,
  currentBatterySpec,
  currentPanels,
  currentObstacles,
  currentMetrics,
  grossRoofAreaM2,
}) => {
  const activeProject = savedProjects.find((p) => p.id === activeProjectId) || null;

  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMessage(null);
    setConfirmDeleteId(null);
    if (activeProject) {
      setProjectName(activeProject.name);
      setCustomerName(activeProject.customerName || '');
      setAddress(activeProject.address || '');
      setNotes(activeProject.notes || '');
    } else {
      const dateStr = new Date().toLocaleDateString('vi-VN');
      setProjectName(
        `Dự án ${currentMetrics.totalDcPowerKwp}kWp (${currentRoof.widthM}x${currentRoof.lengthM}m) - ${dateStr}`
      );
      setCustomerName('');
      setAddress('');
      setNotes('');
    }
  }, [isOpen, activeProjectId]);

  if (!isOpen) return null;

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Xuất 1 dự án ra file .json tải trực tiếp về máy
  const downloadSingleProjectJson = (project: SavedSolarProject) => {
    const safeFileName = project.name
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '_');
    const payload = {
      format: 'SolarDesignPro_Project_v1',
      exportedAt: new Date().toISOString(),
      project,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName || 'Du-An-Solar'}.solar.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Xuất toàn bộ danh sách dự án ra 1 file Backup .json
  const handleExportAllProjectsJson = () => {
    if (savedProjects.length === 0) {
      showToast('error', 'Chưa có dự án nào trong danh sách để xuất file sao lưu.');
      return;
    }
    const payload = {
      format: 'SolarDesignPro_BackupList_v1',
      exportedAt: new Date().toISOString(),
      projects: savedProjects,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateTag = new Date().toISOString().slice(0, 10);
    a.download = `Sao-Luu-Tat-Ca-Du-An-Solar-${dateTag}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(
      'success',
      `Đã tải về file sao lưu gồm ${savedProjects.length} dự án (.json).`
    );
  };

  // Lưu đè vào dự án đang mở
  const handleUpdateCurrentProject = (andDownloadJson = false) => {
    if (!activeProject) return;
    const trimmedName = projectName.trim() || activeProject.name;
    const saved = onSaveProject({
      id: activeProject.id,
      name: trimmedName,
      customerName: customerName.trim(),
      address: address.trim(),
      notes: notes.trim(),
      downloadJson: andDownloadJson,
    });
    if (andDownloadJson) {
      downloadSingleProjectJson(saved);
      showToast('success', `Đã cập nhật dự án "${saved.name}" và tải file .JSON về máy!`);
    } else {
      showToast('success', `Đã lưu cập nhật vào dự án "${saved.name}" thành công!`);
    }
  };

  // Lưu thành dự án mới hoàn toàn
  const handleSaveAsNewProject = (andDownloadJson = false) => {
    const trimmedName =
      projectName.trim() ||
      `Dự án ${currentMetrics.totalDcPowerKwp}kWp (${currentRoof.widthM}x${currentRoof.lengthM}m)`;
    const saved = onSaveProject({
      name: trimmedName,
      customerName: customerName.trim(),
      address: address.trim(),
      notes: notes.trim(),
      downloadJson: andDownloadJson,
    });
    if (andDownloadJson) {
      downloadSingleProjectJson(saved);
      showToast('success', `Đã lưu dự án mới "${saved.name}" và tải file .JSON về máy!`);
    } else {
      showToast('success', `Đã lưu dự án mới "${saved.name}" vào bộ nhớ máy!`);
    }
  };

  // Đọc file .json từ ổ cứng máy tính / điện thoại
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawText = String(reader.result || '');
        const parsed = JSON.parse(rawText);

        // Trường hợp 1: File chứa 1 dự án chuẩn SolarDesignPro_Project_v1
        if (parsed && parsed.project && parsed.project.roof && Array.isArray(parsed.project.panels)) {
          const proj: SavedSolarProject = {
            ...parsed.project,
            id: parsed.project.id || `proj_${Date.now()}`,
            updatedAt: new Date().toISOString(),
          };
          onImportProjectsFromJson([proj], true);
          showToast('success', `Đã mở và nạp dự án "${proj.name}" từ file JSON thành công!`);
          return;
        }

        // Trường hợp 2: File chứa danh sách nhiều dự án (Backup)
        if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          onImportProjectsFromJson(parsed.projects, true);
          showToast(
            'success',
            `Đã khôi phục ${parsed.projects.length} dự án từ file JSON và mở dự án đầu tiên!`
          );
          return;
        }

        // Trường hợp 3: File JSON trực tiếp là đối tượng dự án hoặc state thô
        if (parsed && parsed.roof && Array.isArray(parsed.panels)) {
          const panelSpec: PanelSpec = parsed.panelSpec || currentPanelSpec;
          const totalPanels = parsed.panels.length;
          const totalDcPowerKwp = Number(((totalPanels * panelSpec.powerWp) / 1000).toFixed(2));
          const proj: SavedSolarProject = {
            id: parsed.id || `proj_${Date.now()}`,
            name:
              parsed.name ||
              file.name.replace(/(\.solar)?\.json$/i, '') ||
              `Dự án nhập từ file (${totalDcPowerKwp}kWp)`,
            customerName: parsed.customerName || '',
            address: parsed.address || '',
            notes: parsed.notes || '',
            createdAt: parsed.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            roof: parsed.roof,
            panelSpec,
            inverterSpec: parsed.inverterSpec || currentInverterSpec,
            batterySpec: parsed.batterySpec || currentBatterySpec,
            panels: parsed.panels,
            obstacles: Array.isArray(parsed.obstacles) ? parsed.obstacles : [],
            dailyCriticalLoadKwh:
              typeof parsed.dailyCriticalLoadKwh === 'number' ? parsed.dailyCriticalLoadKwh : 5,
            isSnapEnabled: typeof parsed.isSnapEnabled === 'boolean' ? parsed.isSnapEnabled : true,
            summary: parsed.summary || {
              totalPanels,
              totalDcPowerKwp,
              dailyGenerationKwh: Number((totalDcPowerKwp * 3.8).toFixed(1)),
              roofAreaM2: Number((parsed.roof.widthM * parsed.roof.lengthM).toFixed(1)),
            },
          };
          onImportProjectsFromJson([proj], true);
          showToast('success', `Đã mở dự án "${proj.name}" từ file JSON thành công!`);
          return;
        }

        showToast('error', 'File JSON không đúng định dạng dự án Đức Vinh SolarDesign.');
      } catch {
        showToast('error', 'Không thể đọc file JSON. Vui lòng kiểm tra lại file của bạn.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const filteredProjects = savedProjects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.customerName || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q)
    );
  });

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Quản Lý & Lưu Dự Án Offline (JSON Trên Máy)</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-md">
                  {savedProjects.length} dự án đã lưu
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Lưu dự án trực tiếp trên máy hoặc xuất/nhập file .JSON để mở lại chỉnh sửa bất kỳ lúc nào (không cần mạng)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo trạng thái */}
        {statusMessage && (
          <div
            className={`mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Nội dung chính chia 2 cột trên màn hình lớn */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          {/* CỘT TRÁI (5/12): LƯU DỰ ÁN ĐANG THIẾT KẾ HIỆN TẠI */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Save className="w-4 h-4" />
                  <span>1. LƯU BẢN VẼ HIỆN TẠI</span>
                </div>
                {activeProject && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                    Đang sửa dự án cũ
                  </span>
                )}
              </div>

              {/* Tóm tắt thông số bản vẽ đang mở */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/90 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Hệ giàn pin:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {currentMetrics.totalPanels} tấm ({currentMetrics.totalDcPowerKwp} kWp)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Kích thước mái:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {currentRoof.widthM}m × {currentRoof.lengthM}m ({grossRoofAreaM2.toFixed(1)}m²)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Vật cản trên mái:</span>
                  <span className="font-mono font-semibold text-orange-300">
                    {currentObstacles.length} vị trí
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Sản lượng điện:</span>
                  <span className="font-mono font-semibold text-emerald-300">
                    {currentMetrics.dailyGenerationKwh} kWh/ngày
                  </span>
                </div>
              </div>

              {/* Form nhập thông tin dự án */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tên dự án / công trình *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="VD: Nhà anh Minh - Quận 7 - 10kWp"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 mb-1">Khách hàng / Chủ đầu tư</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="VD: Anh Nguyễn Văn Minh"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Địa chỉ công trình</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="VD: TP. Hồ Chí Minh"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Ghi chú kỹ thuật</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="VD: Mái tôn nhà dân dùng Bát Z + Minirail, chừa lối đi bảo trì..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Các nút Lưu dự án */}
              <div className="space-y-2 pt-1">
                {activeProject ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentProject(false)}
                      className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/10"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu Cập Nhật Vào Dự Án Đang Mở</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAsNewProject(false)}
                        className="py-2 px-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Lưu Thành Dự Án Mới</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentProject(true)}
                        className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Lưu & Tải File .JSON</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveAsNewProject(false)}
                      className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/10"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu Dự Án Vào Máy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveAsNewProject(true)}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Lưu & Tải File Dự Án (.JSON) Về Ổ Cứng</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Khung Mở / Nhập File JSON từ ổ cứng máy tính */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
              <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                <FileJson className="w-4 h-4" />
                <span>2. MỞ / SAO LƯU FILE .JSON TRÊN Ổ CỨNG</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bạn có thể mở lại bất kỳ file <code className="text-slate-200">.json</code> dự án nào đã lưu trên máy tính để chỉnh sửa tiếp.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Mở File .JSON Từ Máy</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAllProjectsJson}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  title="Tải toàn bộ danh sách dự án đã lưu ra 1 file JSON để sao lưu"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sao Lưu Tất Cả (.JSON)</span>
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (7/12): DANH SÁCH DỰ ÁN TỪNG LÀM TRÊN MÁY (MỞ LẠI & SỬA TIẾP) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-950/90 border border-slate-800 rounded-xl p-4 min-h-[380px]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="font-bold text-slate-100 flex items-center gap-1.5 text-xs sm:text-sm">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>DANH SÁCH DỰ ÁN TỪNG LÀM TRÊN MÁY ({savedProjects.length})</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onCreateNewBlankProject();
                  onClose();
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1 text-[11px] transition-colors"
                title="Khởi tạo một mặt bằng dự án mới hoàn toàn"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Tạo Dự Án Mới Trống</span>
              </button>
            </div>

            {/* Thanh tìm kiếm dự án */}
            <div className="relative my-3">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên dự án, tên khách hàng hoặc địa chỉ..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Danh sách các thẻ dự án */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[420px]">
              {filteredProjects.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-400">
                  <FolderOpen className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300 mb-1">
                    {savedProjects.length === 0
                      ? 'Chưa có dự án nào được lưu trên máy'
                      : 'Không tìm thấy dự án phù hợp'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Hãy nhập tên dự án ở cột bên trái và nhấn &ldquo;Lưu Dự Án Vào Máy&rdquo; hoặc mở từ file .JSON có sẵn.
                  </p>
                </div>
              ) : (
                filteredProjects.map((proj) => {
                  const isCurrent = proj.id === activeProjectId;
                  const isConfirmingDelete = confirmDeleteId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-md'
                          : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-100 text-xs sm:text-sm truncate">
                              {proj.name}
                            </h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-400 text-slate-950 rounded-full">
                                Đang mở
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                            {proj.customerName && (
                              <span className="flex items-center gap-1 text-slate-300">
                                <User className="w-3 h-3 text-amber-400" />
                                {proj.customerName}
                              </span>
                            )}
                            {proj.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-sky-400" />
                                {proj.address}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              Sửa lúc: {formatDateTime(proj.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Thông số kỹ thuật tóm tắt của dự án */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-amber-300 font-semibold flex items-center gap-1">
                            <Sun className="w-3 h-3" />
                            {proj.summary.totalDcPowerKwp} kWp ({proj.summary.totalPanels} tấm)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-slate-300 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-sky-400" />
                            Mái {proj.roof.widthM}×{proj.roof.lengthM}m ({proj.summary.roofAreaM2}m²)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-emerald-300">
                            {proj.summary.dailyGenerationKwh} kWh/ngày
                          </span>
                        </div>

                        {/* Các nút thao tác: Mở để sửa lại, Xuất JSON, Nhân bản, Xóa */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onLoadProject(proj);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg flex items-center gap-1 text-xs transition-colors shadow-sm"
                            title="Mở dự án này lên để xem và chỉnh sửa lại"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Mở / Sửa Lại</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              downloadSingleProjectJson(proj);
                              showToast('success', `Đã tải file "${proj.name}.solar.json" về máy.`);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg transition-colors"
                            title="Tải dự án này thành file .JSON về máy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onDuplicateProject(proj);
                              showToast('success', `Đã tạo bản sao của dự án "${proj.name}".`);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                            title="Nhân bản dự án này"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {!isConfirmingDelete ? (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(proj.id)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-lg transition-colors"
                              title="Xóa dự án"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-rose-950 border border-rose-500/50 rounded-lg px-1.5 py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteProject(proj.id);
                                  setConfirmDeleteId(null);
                                  showToast('success', `Đã xóa dự án "${proj.name}".`);
                                }}
                                className="text-[10px] font-bold text-rose-300 hover:text-white px-1"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] text-slate-400 hover:text-white px-1"
                              >
                                Hủy
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {proj.notes && (
                        <div className="mt-2 text-[11px] text-slate-400 italic bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/60">
                          Ghi chú: {proj.notes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Mọi dữ liệu dự án được lưu trữ cục bộ (Offline) ngay trên thiết bị này và định dạng file <code className="text-amber-300">.solar.json</code>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
