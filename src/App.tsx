/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  BatterySpec,
  InverterSpec,
  Obstacle,
  PanelSpec,
  PlacedPanel,
  RoofConfig,
  SavedSolarProject,
} from './types/solar';
import {
  PRESET_PANELS,
  PRESET_INVERTERS,
  PRESET_BATTERIES,
  ROOF_MATERIALS,
} from './data/solar-presets';
import {
  calculateRoofArea,
  calculateSystemMetrics,
  generatePanelGrid,
  autoFillRoofPanels,
  isPanelWithinRoof,
  doesPanelCollideWithObstacles,
  doesPanelCollideWithOtherPanels,
  resolvePanelOverlap,
  resolveObstacleOverlap,
  getPanelDimensions,
} from './utils/solar-calculations';
import { Header } from './components/Header';
import { RoofConfigPanel } from './components/RoofConfigPanel';
import { EquipmentPanel } from './components/EquipmentPanel';
import { RoofCanvas } from './components/RoofCanvas';
import { CanvasToolbar } from './components/CanvasToolbar';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ArrayGeneratorModal } from './components/ArrayGeneratorModal';
import { AddObstacleModal } from './components/AddObstacleModal';
import { ExportDrawingModal } from './components/ExportDrawingModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import {
  Layers,
  Sun,
  Zap,
  BatteryCharging,
  Maximize2,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Save,
  FileText,
  X,
  Menu,
} from 'lucide-react';

const OFFLINE_STORAGE_KEY = 'solar_design_offline_state_v1';
const SAVED_PROJECTS_STORAGE_KEY = 'solar_saved_projects_list_v1';

function loadSavedOfflineState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadSavedProjectsList(): SavedSolarProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const savedState = useMemo(() => loadSavedOfflineState(), []);

  // Danh sách các dự án từng làm được lưu Offline trên máy
  const [savedProjects, setSavedProjects] = useState<SavedSolarProject[]>(() =>
    loadSavedProjectsList()
  );
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    () => savedState?.activeProjectId || null
  );
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // 1. Cấu hình Mái Nhà (Mái tôn sóng, ngói, bê tông, kích thước mét)
  const [roof, setRoof] = useState<RoofConfig>(() =>
    savedState?.roof || {
      shape: 'rectangle',
      widthM: 12,
      lengthM: 8,
      cutWidthM: 3,
      cutLengthM: 3,
      topWidthM: 8,
      slopeDeg: 15,
      azimuthDeg: 180, // Chính Nam
      material: 'ton_nha_dan',
      setbackM: 0.5,
      region: 'south',
    }
  );

  // 2. Cấu hình Tấm Pin Năng Lượng Mặt Trời (Mặc định: AE Solar 630W)
  const [panelSpec, setPanelSpec] = useState<PanelSpec>(
    () => savedState?.panelSpec || PRESET_PANELS[0]
  );

  // 3. Cấu hình Máy Biến Tần Inverter (Mặc định: SolaX X3-Hybrid G4 10kW 3 Pha)
  const [inverterSpec, setInverterSpec] = useState<InverterSpec>(
    () => savedState?.inverterSpec || PRESET_INVERTERS[0]
  );

  // 4. Cấu hình Pin Lưu Trữ Năng Lượng (Mặc định: SolaX LD160 16kWh LiFePO4 CTP)
  const [batterySpec, setBatterySpec] = useState<BatterySpec>(
    () => savedState?.batterySpec || PRESET_BATTERIES[0]
  );

  // 5. Danh sách các tấm pin đã đặt trên mái
  const [panels, setPanels] = useState<PlacedPanel[]>(() => {
    if (Array.isArray(savedState?.panels)) {
      return savedState.panels;
    }
    return generatePanelGrid(2, 4, 800, 800, PRESET_PANELS[0], 0, 20, 20);
  });

  // 6. Danh sách vật cản trên mái (Bồn nước, Cục nóng máy lạnh 30x80cm...)
  const [obstacles, setObstacles] = useState<Obstacle[]>(() =>
    Array.isArray(savedState?.obstacles)
      ? savedState.obstacles
      : [
          {
            id: 'obs_default_tank',
            name: 'Bồn Nước 1500L',
            type: 'water_tank',
            xMm: 9500,
            yMm: 3200,
            widthMm: 1200,
            lengthMm: 1800,
          },
          {
            id: 'obs_default_ac',
            name: 'Cục Nóng Máy Lạnh (30×80cm)',
            type: 'ac_outdoor',
            xMm: 9600,
            yMm: 1500,
            widthMm: 300,
            lengthMm: 800,
          },
        ]
  );

  // Phụ tải thiết yếu khi cúp điện
  const [dailyCriticalLoadKwh, setDailyCriticalLoadKwh] = useState<number>(
    () => savedState?.dailyCriticalLoadKwh ?? 10
  );

  // Giao diện & Thao tác
  const [activeTab, setActiveTab] = useState<'designer' | 'specs' | 'analysis'>('designer');
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [isSnapEnabled, setIsSnapEnabled] = useState<boolean>(
    () => savedState?.isSnapEnabled ?? true
  );
  const [zoom, setZoom] = useState<number>(1);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  // Menu cấu hình bên trái có thể đóng/mở (mặc định tự thu gọn trên màn hình nhỏ/dọc để ưu tiên vùng vẽ)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  // Chế độ phóng to toàn màn hình chỉ còn đúng phần vẽ (cho Laptop, Máy tính bảng & Điện thoại)
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState<boolean>(false);

  // Modals
  const [isArrayModalOpen, setIsArrayModalOpen] = useState(false);
  const [isObstacleModalOpen, setIsObstacleModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Kiểm tra tính hợp lệ của từng tấm pin
  const validatedPanels = useMemo(() => {
    return panels.map((p) => {
      const inBounds = isPanelWithinRoof(p, panelSpec, roof);
      const collides = doesPanelCollideWithObstacles(p, panelSpec, obstacles);
      const collidesPanel = doesPanelCollideWithOtherPanels(p, panelSpec, panels);
      return {
        ...p,
        isInvalid: !inBounds || collides || collidesPanel,
      };
    });
  }, [panels, panelSpec, roof, obstacles]);

  const invalidCount = useMemo(() => {
    return validatedPanels.filter((p) => p.isInvalid).length;
  }, [validatedPanels]);

  // Tính toán các chỉ số kỹ thuật hệ thống
  const metrics = useMemo(() => {
    return calculateSystemMetrics(
      roof,
      validatedPanels,
      panelSpec,
      inverterSpec,
      batterySpec,
      dailyCriticalLoadKwh
    );
  }, [roof, validatedPanels, panelSpec, inverterSpec, batterySpec, dailyCriticalLoadKwh]);

  const grossRoofAreaM2 = useMemo(() => calculateRoofArea(roof), [roof]);

  // Tự động lưu cấu hình và bản vẽ đang mở vào LocalStorage để dùng Offline trên máy
  useEffect(() => {
    try {
      window.localStorage.setItem(
        OFFLINE_STORAGE_KEY,
        JSON.stringify({
          activeProjectId,
          roof,
          panelSpec,
          inverterSpec,
          batterySpec,
          panels,
          obstacles,
          dailyCriticalLoadKwh,
          isSnapEnabled,
        })
      );
    } catch {
      // Bỏ qua nếu trình duyệt chặn LocalStorage
    }
  }, [
    activeProjectId,
    roof,
    panelSpec,
    inverterSpec,
    batterySpec,
    panels,
    obstacles,
    dailyCriticalLoadKwh,
    isSnapEnabled,
  ]);

  // Tự động lưu danh sách các dự án vào LocalStorage của máy
  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_PROJECTS_STORAGE_KEY, JSON.stringify(savedProjects));
    } catch {
      // Bỏ qua nếu bộ nhớ đầy
    }
  }, [savedProjects]);

  const activeProject = useMemo(
    () => savedProjects.find((p) => p.id === activeProjectId) || null,
    [savedProjects, activeProjectId]
  );

  // Lưu dự án mới hoặc cập nhật dự án đang mở
  const handleSaveProject = (meta: {
    id?: string;
    name: string;
    customerName: string;
    address: string;
    notes: string;
  }): SavedSolarProject => {
    const nowIso = new Date().toISOString();
    const existing = meta.id ? savedProjects.find((p) => p.id === meta.id) : undefined;
    const projectObj: SavedSolarProject = {
      id: existing ? existing.id : `proj_${Date.now()}`,
      name: meta.name,
      customerName: meta.customerName,
      address: meta.address,
      notes: meta.notes,
      createdAt: existing ? existing.createdAt : nowIso,
      updatedAt: nowIso,
      roof: { ...roof },
      panelSpec: { ...panelSpec },
      inverterSpec: { ...inverterSpec },
      batterySpec: { ...batterySpec },
      panels: panels.map((p) => ({ ...p })),
      obstacles: obstacles.map((o) => ({ ...o })),
      dailyCriticalLoadKwh,
      isSnapEnabled,
      summary: {
        totalPanels: metrics.totalPanels,
        totalDcPowerKwp: metrics.totalDcPowerKwp,
        dailyGenerationKwh: metrics.dailyGenerationKwh,
        roofAreaM2: Number(grossRoofAreaM2.toFixed(1)),
      },
    };

    setSavedProjects((prev) => {
      if (existing) {
        return prev.map((p) => (p.id === existing.id ? projectObj : p));
      }
      return [projectObj, ...prev];
    });
    setActiveProjectId(projectObj.id);
    return projectObj;
  };

  // Lưu nhanh 1 chạm khi đang sửa dự án cũ
  const handleQuickSaveActiveProject = () => {
    if (!activeProject) return;
    handleSaveProject({
      id: activeProject.id,
      name: activeProject.name,
      customerName: activeProject.customerName || '',
      address: activeProject.address || '',
      notes: activeProject.notes || '',
    });
  };

  // Mở / Nạp lại một dự án đã lưu để chỉnh sửa tiếp
  const handleLoadProject = (proj: SavedSolarProject) => {
    setRoof({ ...proj.roof });
    setPanelSpec({ ...proj.panelSpec });
    setInverterSpec({ ...proj.inverterSpec });
    setBatterySpec({ ...proj.batterySpec });
    setPanels((proj.panels || []).map((p) => ({ ...p })));
    setObstacles((proj.obstacles || []).map((o) => ({ ...o })));
    setDailyCriticalLoadKwh(proj.dailyCriticalLoadKwh ?? 10);
    setIsSnapEnabled(proj.isSnapEnabled ?? true);
    setSelectedPanelId(null);
    setSelectedObstacleId(null);
    setActiveProjectId(proj.id);
    setActiveTab('designer');
  };

  // Xóa dự án trong danh sách
  const handleDeleteProject = (id: string) => {
    setSavedProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
  };

  // Nhân bản dự án trong danh sách
  const handleDuplicateProject = (proj: SavedSolarProject) => {
    const nowIso = new Date().toISOString();
    const copyProj: SavedSolarProject = {
      ...proj,
      id: `proj_${Date.now()}`,
      name: `${proj.name} (Bản sao)`,
      createdAt: nowIso,
      updatedAt: nowIso,
      roof: { ...proj.roof },
      panelSpec: { ...proj.panelSpec },
      inverterSpec: { ...proj.inverterSpec },
      batterySpec: { ...proj.batterySpec },
      panels: proj.panels.map((p) => ({ ...p })),
      obstacles: proj.obstacles.map((o) => ({ ...o })),
    };
    setSavedProjects((prev) => [copyProj, ...prev]);
  };

  // Nhập dự án từ file .JSON trên máy tính
  const handleImportProjectsFromJson = (
    imported: SavedSolarProject[],
    openFirst = true
  ) => {
    if (imported.length === 0) return;
    setSavedProjects((prev) => {
      const map = new Map<string, SavedSolarProject>();
      imported.forEach((p) => map.set(p.id, p));
      prev.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p);
      });
      return Array.from(map.values());
    });
    if (openFirst) {
      handleLoadProject(imported[0]);
    }
  };

  // Tạo dự án mới trống
  const handleCreateNewBlankProject = () => {
    setActiveProjectId(null);
    setRoof({
      shape: 'rectangle',
      widthM: 12,
      lengthM: 8,
      cutWidthM: 3,
      cutLengthM: 3,
      topWidthM: 8,
      slopeDeg: 15,
      azimuthDeg: 180,
      material: 'ton_nha_dan',
      setbackM: 0.5,
      region: 'south',
    });
    setPanelSpec(PRESET_PANELS[0]);
    setInverterSpec(PRESET_INVERTERS[0]);
    setBatterySpec(PRESET_BATTERIES[0]);
    setPanels(generatePanelGrid(2, 4, 800, 800, PRESET_PANELS[0], 0, 20, 20));
    setObstacles([
      {
        id: 'obs_default_tank',
        name: 'Bồn Nước 1500L',
        type: 'water_tank',
        xMm: 9500,
        yMm: 3200,
        widthMm: 1200,
        lengthMm: 1800,
      },
      {
        id: 'obs_default_ac',
        name: 'Cục Nóng Máy Lạnh (30×80cm)',
        type: 'ac_outdoor',
        xMm: 9600,
        yMm: 1500,
        widthMm: 300,
        lengthMm: 800,
      },
    ]);
    setSelectedPanelId(null);
    setSelectedObstacleId(null);
  };

  // Thao tác chỉnh sửa tấm pin & vật cản
  const handleUpdatePanel = (id: string, updated: Partial<PlacedPanel>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  };

  const handleUpdateObstacle = (id: string, updated: Partial<Obstacle>) => {
    setObstacles((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
  };

  const handleDeleteObstacle = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
    if (selectedObstacleId === id) setSelectedObstacleId(null);
  };

  const handleRotateSelectedObstacle = () => {
    if (!selectedObstacleId) return;
    setObstacles((prev) =>
      prev.map((o) => {
        if (o.id === selectedObstacleId) {
          const nextDeg = ((o.rotationDeg || 0) + 90) % 360;
          const isSwappedOld = Math.round((o.rotationDeg || 0) / 90) % 2 !== 0;
          const oldW = isSwappedOld ? o.lengthMm : o.widthMm;
          const oldH = isSwappedOld ? o.widthMm : o.lengthMm;
          const isSwappedNew = Math.round(nextDeg / 90) % 2 !== 0;
          const newW = isSwappedNew ? o.lengthMm : o.widthMm;
          const newH = isSwappedNew ? o.widthMm : o.lengthMm;

          const targetX = Math.max(
            0,
            Math.min(roof.widthM * 1000 - newW, Math.round(o.xMm + (oldW - newW) / 2))
          );
          const targetY = Math.max(
            0,
            Math.min(roof.lengthM * 1000 - newH, Math.round(o.yMm + (oldH - newH) / 2))
          );

          const rotatedObs: Obstacle = { ...o, xMm: targetX, yMm: targetY, rotationDeg: nextDeg };
          if (!isSnapEnabled) {
            return rotatedObs;
          }
          const resolved = resolveObstacleOverlap(
            targetX,
            targetY,
            rotatedObs,
            prev,
            panels,
            panelSpec,
            roof.widthM * 1000,
            roof.lengthM * 1000,
            20
          );
          return { ...rotatedObs, xMm: resolved.x, yMm: resolved.y };
        }
        return o;
      })
    );
  };

  // Thêm 1 tấm đơn vào giữa mái (nếu bật Tự Khớp thì đẩy cách 20mm, nếu tắt thì đặt tự do)
  const handleAddSinglePanel = () => {
    const basePanel: PlacedPanel = {
      id: `panel_${Date.now()}`,
      xMm: Math.round(roof.widthM * 500 - panelSpec.widthMm / 2),
      yMm: Math.round(roof.lengthM * 500 - panelSpec.lengthMm / 2),
      rotationDeg: 0,
      stringId: 1,
    };
    if (isSnapEnabled) {
      const resolved = resolvePanelOverlap(
        basePanel.xMm,
        basePanel.yMm,
        basePanel,
        panelSpec,
        panels,
        roof.widthM * 1000,
        roof.lengthM * 1000,
        20,
        obstacles
      );
      basePanel.xMm = resolved.x;
      basePanel.yMm = resolved.y;
    }
    setPanels((prev) => [...prev, basePanel]);
    setSelectedPanelId(basePanel.id);
  };

  // Tạo mảng pin M x N
  const handleGenerateArray = (
    rows: number,
    cols: number,
    orientation: 'portrait' | 'landscape',
    rowGapMm: number,
    colGapMm: number,
    startX: number,
    startY: number
  ) => {
    const rotationDeg = orientation === 'portrait' ? 0 : 90;
    const newPanels = generatePanelGrid(
      rows,
      cols,
      startX,
      startY,
      panelSpec,
      rotationDeg,
      Math.max(20, rowGapMm),
      Math.max(20, colGapMm)
    );
    setPanels(newPanels);
    setSelectedPanelId(null);
  };

  // Tự động lấp đầy mái tối ưu (khe hở tiêu chuẩn 20mm)
  const handleAutoFill = () => {
    const filled = autoFillRoofPanels(roof, panelSpec, obstacles, 'portrait', 20);
    setPanels(filled);
    setSelectedPanelId(null);
  };

  // Xoay 90 độ tấm đang chọn
  const handleRotateSelected = () => {
    if (!selectedPanelId) return;
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id === selectedPanelId) {
          const oldDim = getPanelDimensions(panelSpec, p.rotationDeg || 0);
          const nextDeg = (p.rotationDeg + 90) % 360;
          const newDim = getPanelDimensions(panelSpec, nextDeg);
          const targetX = Math.round(p.xMm + (oldDim.width - newDim.width) / 2);
          const targetY = Math.round(p.yMm + (oldDim.height - newDim.height) / 2);
          const rotated: PlacedPanel = { ...p, xMm: targetX, yMm: targetY, rotationDeg: nextDeg };
          if (isSnapEnabled) {
            const resolved = resolvePanelOverlap(
              targetX,
              targetY,
              rotated,
              panelSpec,
              prev,
              roof.widthM * 1000,
              roof.lengthM * 1000,
              20,
              obstacles
            );
            return { ...rotated, xMm: resolved.x, yMm: resolved.y };
          }
          return rotated;
        }
        return p;
      })
    );
  };

  // Nhân bản tấm đang chọn
  const handleDuplicateSelected = () => {
    if (!selectedPanelId) return;
    const target = panels.find((p) => p.id === selectedPanelId);
    if (!target) return;

    const { width } = getPanelDimensions(panelSpec, target.rotationDeg || 0);
    const tempDup: PlacedPanel = {
      ...target,
      id: `panel_${Date.now()}`,
      xMm: isSnapEnabled ? target.xMm + width + 20 : target.xMm + 200,
      yMm: isSnapEnabled ? target.yMm : target.yMm + 200,
    };
    if (isSnapEnabled) {
      const resolved = resolvePanelOverlap(
        tempDup.xMm,
        tempDup.yMm,
        tempDup,
        panelSpec,
        panels,
        roof.widthM * 1000,
        roof.lengthM * 1000,
        20,
        obstacles
      );
      tempDup.xMm = resolved.x;
      tempDup.yMm = resolved.y;
    }
    setPanels((prev) => [...prev, tempDup]);
    setSelectedPanelId(tempDup.id);
  };

  // Xóa tấm đang chọn
  const handleDeleteSelected = () => {
    if (!selectedPanelId) return;
    setPanels((prev) => prev.filter((p) => p.id !== selectedPanelId));
    setSelectedPanelId(null);
  };

  // Xóa tất cả các tấm
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ các tấm pin trên mái?')) {
      setPanels([]);
      setSelectedPanelId(null);
    }
  };

  // Khôi phục mặc định dự án
  const handleReset = () => {
    if (window.confirm('Khôi phục cấu hình dự án về mặc định?')) {
      setRoof({
        shape: 'rectangle',
        widthM: 12,
        lengthM: 8,
        cutWidthM: 3,
        cutLengthM: 3,
        topWidthM: 8,
        slopeDeg: 15,
        azimuthDeg: 180,
        material: 'ton_nha_dan',
        setbackM: 0.5,
        region: 'south',
      });
      setPanelSpec(PRESET_PANELS[0]);
      setInverterSpec(PRESET_INVERTERS[0]);
      setBatterySpec(PRESET_BATTERIES[0]);
      setPanels(generatePanelGrid(2, 4, 800, 800, PRESET_PANELS[0], 0, 20, 20));
    }
  };

  // Bật / tắt chế độ Toàn Màn Hình cho vùng vẽ (Hỗ trợ cả Native Fullscreen API lẫn CSS Fullscreen cho iOS/Điện thoại)
  const handleToggleCanvasFullscreen = () => {
    setIsCanvasFullscreen((prev) => {
      const next = !prev;
      try {
        if (next) {
          if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      } catch {
        // Fallback hoàn toàn bằng CSS fixed inset-0 trên iPhone/iPad hoặc trình duyệt nhúng
      }
      return next;
    });
  };

  // Phím tắt bàn phím (Delete / Backspace để xóa, R để xoay, Escape để thoát toàn màn hình)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCanvasFullscreen) {
        setIsCanvasFullscreen(false);
        return;
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPanelId) {
          e.preventDefault();
          handleDeleteSelected();
        } else if (selectedObstacleId) {
          e.preventDefault();
          handleDeleteObstacle(selectedObstacleId);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedPanelId) {
          e.preventDefault();
          handleRotateSelected();
        } else if (selectedObstacleId) {
          e.preventDefault();
          handleRotateSelectedObstacle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPanelId, selectedObstacleId, panels, obstacles, isCanvasFullscreen]);

  // Xuất bản vẽ layout dạng ảnh PNG (Luôn hiển thị đầy đủ Bảng Sản Lượng Điện & Thông Số Kỹ Thuật)
  const handleExportDrawing = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const headerHeight = 260;
      const drawingWidth = Math.max(image.width * 2, 1600);
      const drawingHeight = image.height * 2 + headerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = drawingWidth;
      canvas.height = drawingHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 1. Nền tổng thể
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Vẽ khu vực Header & Bảng Sản Lượng Điện ở phần trên
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, headerHeight - 10);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, headerHeight - 10);
        ctx.lineTo(canvas.width, headerHeight - 10);
        ctx.stroke();

        // Tiêu đề bản vẽ
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('BẢN VẼ MẶT BẰNG BỐ TRÍ & BÁO CÁO SẢN LƯỢNG ĐIỆN MẶT TRỜI', 40, 44);

        const regionName =
          roof.region === 'north'
            ? 'Miền Bắc'
            : roof.region === 'central'
            ? 'Miền Trung'
            : 'Miền Nam';

        // Dòng thông số cấu hình thiết bị & mái
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(
          `Hệ thống: ${metrics.totalDcPowerKwp} kWp (${metrics.totalPanels} tấm ${panelSpec.brand} ${panelSpec.powerWp}W) | Inverter: ${inverterSpec.brand} ${inverterSpec.name} (${inverterSpec.ratedPowerKw}kW)`,
          40,
          76
        );

        ctx.font = '15px monospace';
        ctx.fillStyle = '#94a3b8';
        const storageText =
          inverterSpec.type === 'grid_tie'
            ? 'Hệ hòa lưới bám tải (Không lưu trữ)'
            : `Lưu trữ: ${batterySpec.brand} ${batterySpec.name} (${metrics.batteryTotalKwh} kWh - Tự chủ ${metrics.batteryAutonomyHours}h)`;
        ctx.fillText(
          `Mái: ${roof.widthM}m × ${roof.lengthM}m (${grossRoofAreaM2.toFixed(1)}m² - Độ phủ pin ${metrics.coveragePct}%) | Hướng ${roof.azimuthDeg}° | Khu vực: ${regionName} (${metrics.dailyPeakSunHours}h nắng/ngày) | ${storageText}`,
          40,
          104
        );

        // 3. Bốn ô thẻ BÁO CÁO SẢN LƯỢNG ĐIỆN luôn hiển thị nổi bật trên bản vẽ xuất ra
        const cardY = 124;
        const cardH = 108;
        const gap = 20;
        const totalCards = 4;
        const cardW = Math.floor((canvas.width - 80 - gap * (totalCards - 1)) / totalCards);

        const yieldCards = [
          {
            title: 'SẢN LƯỢNG ĐIỆN TRUNG BÌNH NGÀY',
            value: `${metrics.dailyGenerationKwh} kWh / ngày`,
            sub: `Tính theo ${metrics.dailyPeakSunHours} giờ nắng đỉnh/ngày (${regionName})`,
            borderColor: '#10b981',
            valueColor: '#34d399',
          },
          {
            title: 'SẢN LƯỢNG ĐIỆN TRUNG BÌNH THÁNG',
            value: `${metrics.monthlyGenerationKwh.toLocaleString('vi-VN')} kWh / tháng`,
            sub: `Tương đương ~${(metrics.monthlyGenerationKwh / 30).toFixed(1)} kWh mỗi ngày`,
            borderColor: '#0ea5e9',
            valueColor: '#38bdf8',
          },
          {
            title: 'TỔNG SẢN LƯỢNG ĐIỆN NĂM',
            value: `${metrics.annualGenerationKwh.toLocaleString('vi-VN')} kWh / năm`,
            sub: `Công suất giàn pin: ${metrics.totalDcPowerKwp} kWp (${metrics.totalPanels} tấm)`,
            borderColor: '#f59e0b',
            valueColor: '#fbbf24',
          },
          {
            title:
              inverterSpec.type === 'grid_tie'
                ? 'GIẢM PHÁT THẢI CO₂ & MÔI TRƯỜNG'
                : 'DUNG LƯỢNG LƯU TRỮ & GIẢM CO₂',
            value:
              inverterSpec.type === 'grid_tie'
                ? `${(metrics.annualCo2ReductionKg / 1000).toFixed(2)} tấn CO₂ / năm`
                : `${metrics.batteryTotalKwh} kWh Lưu Trữ`,
            sub:
              inverterSpec.type === 'grid_tie'
                ? `Hiệu suất hệ thống PR ~80% | Tỷ lệ DC/AC ${metrics.dcAcRatio}:1`
                : `Khả dụng: ${metrics.batteryUsableKwh} kWh (${metrics.batteryAutonomyHours}h) | Giảm ${(metrics.annualCo2ReductionKg / 1000).toFixed(2)} tấn CO₂/năm`,
            borderColor: '#a855f7',
            valueColor: '#c084fc',
          },
        ];

        yieldCards.forEach((card, idx) => {
          const cx = 40 + idx * (cardW + gap);
          ctx.fillStyle = '#090d16';
          ctx.fillRect(cx, cardY, cardW, cardH);
          ctx.strokeStyle = card.borderColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, cardY, cardW, cardH);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(card.title, cx + 16, cardY + 28);

          ctx.fillStyle = card.valueColor;
          ctx.font = 'bold 26px monospace';
          ctx.fillText(card.value, cx + 16, cardY + 64);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '13px sans-serif';
          ctx.fillText(card.sub, cx + 16, cardY + 90);
        });

        // 4. Vẽ hình mặt bằng mái căn giữa ở phần dưới
        const offsetX = Math.max(0, Math.round((canvas.width - image.width * 2) / 2));
        ctx.drawImage(image, offsetX, headerHeight, image.width * 2, image.height * 2);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `Ban-Ve-San-Luong-Solar-${metrics.totalDcPowerKwp}kWp-${metrics.dailyGenerationKwh}kWh-ngay.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URLObject.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Thanh điều hướng Top Bar */}
      <Header
        onOpenProjectManager={() => setIsProjectModalOpen(true)}
        savedProjectsCount={savedProjects.length}
        activeProjectName={activeProject?.name || null}
        onQuickSaveActiveProject={activeProject ? handleQuickSaveActiveProject : undefined}
        onExportDrawing={() => setIsExportModalOpen(true)}
        onReset={handleReset}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 2. Nội dung chính tùy theo tab */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: THIẾT KẾ MẶT BẰNG & BẢN VẼ PIN */}
        {activeTab === 'designer' && (
          <div className="relative flex-1 flex flex-row h-full overflow-hidden">
            {/* Lớp nền mờ khi mở menu cấu hình mái trên điện thoại hoặc màn hình dọc */}
            {isLeftSidebarOpen && (
              <div
                onClick={() => setIsLeftSidebarOpen(false)}
                className="fixed inset-0 z-30 bg-black/65 backdrop-blur-xs lg:hidden"
              />
            )}

            {/* Cột Trái: Menu Đóng/Mở Cấu Hình Kích Thước Mái, Lưu/Mở Dự Án & Xuất Bản Vẽ */}
            <aside
              className={`${
                isLeftSidebarOpen
                  ? 'translate-x-0 w-[340px] sm:w-96 border-r border-slate-800 p-4'
                  : '-translate-x-full w-0 p-0 border-r-0 overflow-hidden'
              } fixed lg:static inset-y-0 left-0 z-40 lg:translate-x-0 bg-slate-900/95 lg:bg-slate-900/60 backdrop-blur-md overflow-y-auto shrink-0 space-y-4 transition-all duration-200 shadow-2xl lg:shadow-none`}
            >
              {isLeftSidebarOpen && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Menu Cấu Hình & Dự Án
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLeftSidebarOpen(false)}
                      className="flex items-center justify-center w-8 h-8 text-amber-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                      title="Thu gọn menu để mở rộng không gian vẽ"
                      aria-label="Đóng menu"
                    >
                      <Menu className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Nhóm nút Lưu / Mở Dự Án, Lưu Cập Nhật & Xuất Bản Vẽ nằm ngay trong Thanh Menu Đóng/Mở */}
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold uppercase tracking-wider text-slate-300">
                        Quản Lý Dự Án & Xuất File
                      </span>
                      {activeProject && (
                        <span className="text-emerald-400 font-semibold truncate max-w-[150px]">
                          {activeProject.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {activeProject && (
                        <button
                          type="button"
                          onClick={handleQuickSaveActiveProject}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 rounded-xl transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Lưu Cập Nhật ({activeProject.name})</span>
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsProjectModalOpen(true)}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Lưu / Mở Dự Án</span>
                          {savedProjects.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded-full text-[10px] font-mono">
                              {savedProjects.length}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsExportModalOpen(true)}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>Xuất Bản Vẽ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <RoofConfigPanel
                    roof={roof}
                    onChange={(updated) => setRoof((prev) => ({ ...prev, ...updated }))}
                    grossAreaM2={grossRoofAreaM2}
                  />
                </>
              )}
            </aside>

            {/* Nút nổi 3 gạch mở nhanh Menu ở mép trái khi đang đóng */}
            {!isLeftSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsLeftSidebarOpen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold p-2.5 rounded-r-xl shadow-xl flex items-center justify-center transition-all border border-l-0 border-amber-300"
                title="Mở menu cấu hình kích thước mái & dự án"
                aria-label="Mở menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Cột Phải: Không Gian Vẽ Mặt Bằng & Bố Trí Pin */}
            <div className="flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-4 bg-slate-950 min-w-0">
              {/* Toolbar trên canvas */}
              <div className="mb-2 sm:mb-3 shrink-0">
                <CanvasToolbar
                  isLeftSidebarOpen={isLeftSidebarOpen}
                  onToggleLeftSidebar={() => setIsLeftSidebarOpen((v) => !v)}
                  onAddSinglePanel={handleAddSinglePanel}
                  onOpenArrayModal={() => setIsArrayModalOpen(true)}
                  onAutoFill={handleAutoFill}
                  onOpenObstacleModal={() => setIsObstacleModalOpen(true)}
                  selectedPanelId={selectedPanelId}
                  onRotateSelected={handleRotateSelected}
                  onDuplicateSelected={handleDuplicateSelected}
                  onDeleteSelected={handleDeleteSelected}
                  onClearAll={handleClearAll}
                  selectedObstacleId={selectedObstacleId}
                  onRotateSelectedObstacle={handleRotateSelectedObstacle}
                  onDeleteSelectedObstacle={() => selectedObstacleId && handleDeleteObstacle(selectedObstacleId)}
                  isSnapEnabled={isSnapEnabled}
                  onToggleSnap={() => setIsSnapEnabled((v) => !v)}
                  zoom={zoom}
                  onZoomIn={() => setZoom((z) => Math.min(10.0, Number((z * 1.25).toFixed(2))))}
                  onZoomOut={() => setZoom((z) => Math.max(0.35, Number((z / 1.25).toFixed(2))))}
                  onResetZoom={() => setZoom(1)}
                  totalPanels={metrics.totalPanels}
                  invalidCount={invalidCount}
                  showDimensions={showDimensions}
                  onToggleDimensions={() => setShowDimensions((d) => !d)}
                  onToggleFullscreen={handleToggleCanvasFullscreen}
                />
              </div>

              {/* Thanh thông tin Pin, Vật liệu mái, Diện tích & Tự khớp 20mm đặt phía trên bên ngoài khung vẽ */}
              <div className="mb-2 shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs overflow-x-auto">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-slate-400">Pin:</span>
                  <span className="font-semibold text-amber-300">
                    {panelSpec.brand} {panelSpec.powerWp}W
                  </span>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-400">Vật liệu:</span>
                  <span className="font-semibold text-slate-200">
                    {ROOF_MATERIALS[roof.material]?.name}
                  </span>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-400">Diện tích:</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {grossRoofAreaM2.toFixed(1)} m²
                  </span>
                  {isSnapEnabled && (
                    <>
                      <span className="text-slate-700">|</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Tự khớp cạnh 20mm
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Khu vực Canvas vẽ và kéo thả */}
              <div className="flex-1 min-h-[450px] relative">
                <RoofCanvas
                  roof={roof}
                  onUpdateRoof={(updated) => setRoof((prev) => ({ ...prev, ...updated }))}
                  panels={validatedPanels}
                  panelSpec={panelSpec}
                  obstacles={obstacles}
                  selectedPanelId={selectedPanelId}
                  onSelectPanel={setSelectedPanelId}
                  onUpdatePanel={handleUpdatePanel}
                  onDeletePanel={handleDeleteSelected}
                  onDuplicatePanel={handleDuplicateSelected}
                  selectedObstacleId={selectedObstacleId}
                  onSelectObstacle={setSelectedObstacleId}
                  onUpdateObstacle={handleUpdateObstacle}
                  onDeleteObstacle={handleDeleteObstacle}
                  isSnapEnabled={isSnapEnabled}
                  onToggleSnap={() => setIsSnapEnabled((v) => !v)}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  showDimensions={showDimensions}
                  isFullscreen={isCanvasFullscreen}
                  onToggleFullscreen={handleToggleCanvasFullscreen}
                  onAddSinglePanel={handleAddSinglePanel}
                  onOpenArrayModal={() => setIsArrayModalOpen(true)}
                  onAutoFill={handleAutoFill}
                  onOpenObstacleModal={() => setIsObstacleModalOpen(true)}
                  onOpenProjectManager={() => setIsProjectModalOpen(true)}
                  activeProjectName={activeProject?.name || null}
                  onQuickSaveActiveProject={activeProject ? handleQuickSaveActiveProject : undefined}
                  onExportDrawing={() => setIsExportModalOpen(true)}
                  canvasContainerRef={canvasContainerRef}
                  svgRef={svgRef}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THÔNG SỐ THIẾT BỊ (TẤM PIN, INVERTER, PIN LƯU TRỮ) */}
        {activeTab === 'specs' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Cấu Hình Chi Tiết Thiết Bị Hệ Thống
              </h2>
              <p className="text-xs text-slate-400">
                Nhập kích thước tấm pin, tên máy biến tần inverter và dung lượng pin lưu trữ theo đúng catalogue kỹ thuật
              </p>
            </div>

            <EquipmentPanel
              panelSpec={panelSpec}
              onPanelSpecChange={(updated) => setPanelSpec((prev) => ({ ...prev, ...updated }))}
              inverterSpec={inverterSpec}
              onInverterSpecChange={(updated) => setInverterSpec((prev) => ({ ...prev, ...updated }))}
              batterySpec={batterySpec}
              onBatterySpecChange={(updated) => setBatterySpec((prev) => ({ ...prev, ...updated }))}
              dailyCriticalLoadKwh={dailyCriticalLoadKwh}
              onCriticalLoadChange={setDailyCriticalLoadKwh}
            />
          </div>
        )}

        {/* TAB 3: PHÂN TÍCH SẢN LƯỢNG ĐIỆN & HIỆU QUẢ HỆ THỐNG */}
        {activeTab === 'analysis' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  Báo Cáo Sản Lượng Điện & Phân Tích Kỹ Thuật
                </h2>
                <p className="text-xs text-slate-400">
                  Dữ liệu tính toán dựa trên bức xạ thực tế tại {roof.region === 'north' ? 'Miền Bắc' : roof.region === 'central' ? 'Miền Trung' : 'Miền Nam'}
                </p>
              </div>
            </div>

            <MetricsDashboard
              metrics={metrics}
              panelSpec={panelSpec}
              inverterSpec={inverterSpec}
              batterySpec={batterySpec}
              roof={roof}
            />
          </div>
        )}
      </div>

      {/* 3. Các cửa sổ Modal chức năng */}
      <ArrayGeneratorModal
        isOpen={isArrayModalOpen}
        onClose={() => setIsArrayModalOpen(false)}
        onGenerate={handleGenerateArray}
        panelSpec={panelSpec}
        roofSetbackMm={roof.setbackM * 1000}
      />

      <AddObstacleModal
        isOpen={isObstacleModalOpen}
        onClose={() => setIsObstacleModalOpen(false)}
        onAdd={(obs) => {
          const resolved = resolveObstacleOverlap(
            obs.xMm,
            obs.yMm,
            obs,
            obstacles,
            panels,
            panelSpec,
            roof.widthM * 1000,
            roof.lengthM * 1000,
            20
          );
          const placedObs: Obstacle = { ...obs, xMm: resolved.x, yMm: resolved.y };
          setObstacles((prev) => [...prev, placedObs]);
          setSelectedObstacleId(placedObs.id);
        }}
        roofWidthMm={roof.widthM * 1000}
        roofLengthMm={roof.lengthM * 1000}
      />

      <ExportDrawingModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        roof={roof}
        panelSpec={panelSpec}
        inverterSpec={inverterSpec}
        batterySpec={batterySpec}
        panels={validatedPanels}
        obstacles={obstacles}
        metrics={metrics}
        grossRoofAreaM2={grossRoofAreaM2}
        svgRef={svgRef}
      />

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        savedProjects={savedProjects}
        activeProjectId={activeProjectId}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        onImportProjectsFromJson={handleImportProjectsFromJson}
        onCreateNewBlankProject={handleCreateNewBlankProject}
        currentRoof={roof}
        currentPanelSpec={panelSpec}
        currentInverterSpec={inverterSpec}
        currentBatterySpec={batterySpec}
        currentPanels={validatedPanels}
        currentObstacles={obstacles}
        currentMetrics={metrics}
        grossRoofAreaM2={grossRoofAreaM2}
      />
    </div>
  );
}
