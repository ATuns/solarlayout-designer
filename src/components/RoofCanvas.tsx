/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Obstacle,
  PanelSpec,
  PlacedPanel,
  RoofConfig,
} from '../types/solar';
import {
  getPanelDimensions,
  getPanelBoundingBox,
  isPanelWithinRoof,
  doesPanelCollideWithObstacles,
  doesPanelCollideWithOtherPanels,
  resolvePanelOverlap,
  resolveObstacleOverlap,
  calculateRoofArea,
  findMagneticSnap,
  getObstacleBoundingBox,
} from '../utils/solar-calculations';
import { ROOF_MATERIALS } from '../data/solar-presets';
import {
  Compass,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  Trash2,
  Boxes,
  Zap,
  Copy,
  Magnet,
  Maximize2,
  Minimize2,
  Plus,
  Grid,
  Wand2,
  GripHorizontal,
  Check,
  SlidersHorizontal,
  ChevronDown,
  FolderOpen,
  Save,
  FileText,
  X,
  Menu,
} from 'lucide-react';

interface RoofCanvasProps {
  roof: RoofConfig;
  onUpdateRoof: (updated: Partial<RoofConfig>) => void;
  panels: PlacedPanel[];
  panelSpec: PanelSpec;
  obstacles: Obstacle[];
  selectedPanelId: string | null;
  onSelectPanel: (id: string | null) => void;
  onUpdatePanel: (id: string, updated: Partial<PlacedPanel>) => void;
  onDeletePanel?: (id: string) => void;
  onDuplicatePanel?: (id: string) => void;
  selectedObstacleId: string | null;
  onSelectObstacle: (id: string | null) => void;
  onUpdateObstacle: (id: string, updated: Partial<Obstacle>) => void;
  onDeleteObstacle: (id: string) => void;
  isSnapEnabled: boolean;
  onToggleSnap?: () => void;
  zoom: number;
  onZoomChange?: React.Dispatch<React.SetStateAction<number>> | ((zoom: number | ((prev: number) => number)) => void);
  showDimensions: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onAddSinglePanel?: () => void;
  onOpenArrayModal?: () => void;
  onAutoFill?: () => void;
  onOpenObstacleModal?: () => void;
  onOpenProjectManager?: () => void;
  activeProjectName?: string | null;
  onQuickSaveActiveProject?: () => void;
  onExportDrawing?: () => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export const RoofCanvas: React.FC<RoofCanvasProps> = ({
  roof,
  onUpdateRoof,
  panels,
  panelSpec,
  obstacles,
  selectedPanelId,
  onSelectPanel,
  onUpdatePanel,
  onDeletePanel,
  onDuplicatePanel,
  onUpdateObstacle,
  onDeleteObstacle,
  selectedObstacleId,
  onSelectObstacle,
  isSnapEnabled,
  onToggleSnap,
  zoom,
  onZoomChange,
  showDimensions,
  isFullscreen = false,
  onToggleFullscreen,
  onAddSinglePanel,
  onOpenArrayModal,
  onAutoFill,
  onOpenObstacleModal,
  onOpenProjectManager,
  activeProjectName,
  onQuickSaveActiveProject,
  onExportDrawing,
  canvasContainerRef,
  svgRef,
}) => {
  // Trạng thái kéo panel (Mouse & Touch/iPad)
  const [draggingPanelId, setDraggingPanelId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Trạng thái kéo vật cản (Mouse & Touch/iPad)
  const [draggingObstacleId, setDraggingObstacleId] = useState<string | null>(null);
  const [dragObstacleOffset, setDragObstacleOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Bước dịch chuyển thủ công (mm) cho D-pad
  const [nudgeStepMm, setNudgeStepMm] = useState<number>(50);

  // Đường gióng căn chỉnh tự động (Magnetic Snap Guides) kèm nhãn
  const [snapGuides, setSnapGuides] = useState<{ guideX?: number; guideY?: number; label?: string }>({});

  // Trạng thái xoay trực tiếp bằng handle (Interactive Rotation Handle)
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [rotateStartAngle, setRotateStartAngle] = useState<number>(0);
  const [panelInitialAngle, setPanelInitialAngle] = useState<number>(0);

  // Xoay vật cản trực tiếp bằng handle
  const [isRotatingObstacle, setIsRotatingObstacle] = useState<boolean>(false);
  const [obsRotateStartAngle, setObsRotateStartAngle] = useState<number>(0);
  const [obsInitialAngle, setObsInitialAngle] = useState<number>(0);

  // Trạng thái kéo la bàn / hướng nhà & đóng/mở menu bong bóng tiết kiệm diện tích
  const [isDraggingCompass, setIsDraggingCompass] = useState<boolean>(false);
  const [isCompassOpen, setIsCompassOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const compassDialRef = useRef<HTMLDivElement | null>(null);

  // Menu bong bóng công cụ vẽ di chuyển tự do (Chỉ hiển thị khi bật Toàn Màn Hình)
  const [isToolsBubbleOpen, setIsToolsBubbleOpen] = useState<boolean>(false);
  const [toolsBubblePos, setToolsBubblePos] = useState<{ x: number; y: number }>({
    x: 185,
    y: 12,
  });
  const bubbleDragRef = useRef<{
    isDragging: boolean;
    hasMoved: boolean;
    startClientX: number;
    startClientY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const handleBubblePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    bubbleDragRef.current = {
      isDragging: true,
      hasMoved: false,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: toolsBubblePos.x,
      initialY: toolsBubblePos.y,
    };
  };

  const handleBubblePointerMove = (e: React.PointerEvent) => {
    if (!bubbleDragRef.current || !bubbleDragRef.current.isDragging) return;
    e.stopPropagation();
    const dx = e.clientX - bubbleDragRef.current.startClientX;
    const dy = e.clientY - bubbleDragRef.current.startClientY;
    if (Math.hypot(dx, dy) > 6) {
      bubbleDragRef.current.hasMoved = true;
    }
    const maxW = typeof window !== 'undefined' ? window.innerWidth - 70 : 1200;
    const maxH = typeof window !== 'undefined' ? window.innerHeight - 60 : 800;
    setToolsBubblePos({
      x: Math.max(8, Math.min(maxW, Math.round(bubbleDragRef.current.initialX + dx))),
      y: Math.max(8, Math.min(maxH, Math.round(bubbleDragRef.current.initialY + dy))),
    });
  };

  const handleBubblePointerUp = (e: React.PointerEvent, toggleOnTap = false) => {
    if (!bubbleDragRef.current) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    const wasTap = !bubbleDragRef.current.hasMoved;
    bubbleDragRef.current = null;
    if (toggleOnTap && wasTap) {
      setIsToolsBubbleOpen((prev) => !prev);
    }
  };

  // Trạng thái Pan canvas & Phóng to thu nhỏ
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isTouchGestureActive, setIsTouchGestureActive] = useState(false);

  // Lưu trữ giá trị mới nhất trong ref để dùng trong event listeners không bị stale
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panPositionRef = useRef(panPosition);
  panPositionRef.current = panPosition;

  // Ref lưu trạng thái bắt đầu cử chỉ 2 ngón tay (Pinch to Zoom & 2-Finger Pan)
  const touchGestureRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    initialMid: { x: number; y: number };
  } | null>(null);

  // Đặt lại góc nhìn về giữa mặt bằng (100% zoom & căn giữa)
  const handleResetView = () => {
    setPanPosition({ x: 0, y: 0 });
    if (onZoomChange) onZoomChange(1);
  };

  // Đăng ký sự kiện Lăn chuột (Wheel) và Cử chỉ tay 2 ngón (Multi-touch) với { passive: false }
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // 1. Lăn chuột để phóng to / thu nhỏ mặt bằng
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!onZoomChange) return;

      const currentZoom = zoomRef.current;
      const zoomMultiplier = e.deltaY < 0 ? 1.12 : 0.89;
      const nextZoom = Math.min(10.0, Math.max(0.35, Number((currentZoom * zoomMultiplier).toFixed(3))));
      if (nextZoom === currentZoom) return;

      // Căn tâm phóng to/thu nhỏ theo vị trí con trỏ chuột
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      const ratio = nextZoom / currentZoom;

      setPanPosition((prevPan) => ({
        x: Math.round(mouseX - (mouseX - prevPan.x) * ratio),
        y: Math.round(mouseY - (mouseY - prevPan.y) * ratio),
      }));

      onZoomChange(nextZoom);
    };

    // 2. Bắt đầu cử chỉ tay 2 ngón (Pinch Zoom & Di chuyển mặt bằng)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        setIsTouchGestureActive(true);
        // Hủy việc kéo panel đơn lẻ để tránh làm xê dịch tấm pin khi người dùng muốn zoom/pan
        setDraggingPanelId(null);
        setDraggingObstacleId(null);
        setIsRotating(false);
        setIsRotatingObstacle(false);
        setIsPanning(false);

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;

        touchGestureRef.current = {
          initialDist: Math.max(dist, 10),
          initialZoom: zoomRef.current,
          initialPan: { ...panPositionRef.current },
          initialMid: { x: midX, y: midY },
        };
      }
    };

    // 3. Di chuyển 2 ngón tay: Vừa phóng to thu nhỏ vừa di chuyển mặt bằng
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchGestureRef.current) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;

        const { initialDist, initialZoom, initialPan, initialMid } = touchGestureRef.current;

        // A. Phóng to thu nhỏ mặt bằng (Pinch Zoom)
        if (initialDist > 0 && onZoomChange) {
          const scaleRatio = dist / initialDist;
          const newZoom = Math.min(10.0, Math.max(0.35, Number((initialZoom * scaleRatio).toFixed(3))));
          onZoomChange(newZoom);
        }

        // B. Di chuyển mặt bằng theo tâm 2 ngón tay (Two-Finger Pan)
        const deltaX = midX - initialMid.x;
        const deltaY = midY - initialMid.y;
        setPanPosition({
          x: Math.round(initialPan.x + deltaX),
          y: Math.round(initialPan.y + deltaY),
        });
      }
    };

    // 4. Kết thúc cử chỉ tay
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchGestureRef.current = null;
        setIsTouchGestureActive(false);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [canvasContainerRef, onZoomChange]);

  // Tọa độ mái theo mm
  const roofWidthMm = roof.widthM * 1000;
  const roofLengthMm = roof.lengthM * 1000;
  const setbackMm = roof.setbackM * 1000;

  // Scale mm sang SVG units
  const canvasWidth = 1000;
  const scale = canvasWidth / Math.max(roofWidthMm, 4000);
  const svgRoofWidth = roofWidthMm * scale;
  const svgRoofLength = roofLengthMm * scale;
  const svgSetback = setbackMm * scale;

  // Tấm pin đang được chọn
  const selectedPanel = useMemo(() => {
    return panels.find((p) => p.id === selectedPanelId) || null;
  }, [panels, selectedPanelId]);

  // Vật cản đang được chọn
  const selectedObstacle = useMemo(() => {
    return obstacles.find((o) => o.id === selectedObstacleId) || null;
  }, [obstacles, selectedObstacleId]);

  // Path hình dạng mái
  const roofPath = useMemo(() => {
    if (roof.shape === 'rectangle') {
      return `M 0,0 L ${svgRoofWidth},0 L ${svgRoofWidth},${svgRoofLength} L 0,${svgRoofLength} Z`;
    }
    if (roof.shape === 'l_shape') {
      const cutW = (roof.cutWidthM || 3) * 1000 * scale;
      const cutL = (roof.cutLengthM || 3) * 1000 * scale;
      return `M 0,0 L ${svgRoofWidth - cutW},0 L ${svgRoofWidth - cutW},${cutL} L ${svgRoofWidth},${cutL} L ${svgRoofWidth},${svgRoofLength} L 0,${svgRoofLength} Z`;
    }
    if (roof.shape === 'trapezoid') {
      const topW = (roof.topWidthM || roof.widthM * 0.6) * 1000 * scale;
      const diff = (svgRoofWidth - topW) / 2;
      return `M ${diff},0 L ${svgRoofWidth - diff},0 L ${svgRoofWidth},${svgRoofLength} L 0,${svgRoofLength} Z`;
    }
    return `M 0,0 L ${svgRoofWidth},0 L ${svgRoofWidth},${svgRoofLength} L 0,${svgRoofLength} Z`;
  }, [roof, svgRoofWidth, svgRoofLength, scale]);

  // Setback path
  const setbackPath = useMemo(() => {
    const s = svgSetback;
    if (roof.shape === 'rectangle') {
      return `M ${s},${s} L ${svgRoofWidth - s},${s} L ${svgRoofWidth - s},${svgRoofLength - s} L ${s},${svgRoofLength - s} Z`;
    }
    if (roof.shape === 'l_shape') {
      const cutW = (roof.cutWidthM || 3) * 1000 * scale;
      const cutL = (roof.cutLengthM || 3) * 1000 * scale;
      return `M ${s},${s} L ${svgRoofWidth - cutW - s},${s} L ${svgRoofWidth - cutW - s},${cutL + s} L ${svgRoofWidth - s},${cutL + s} L ${svgRoofWidth - s},${svgRoofLength - s} L ${s},${svgRoofLength - s} Z`;
    }
    if (roof.shape === 'trapezoid') {
      const topW = (roof.topWidthM || roof.widthM * 0.6) * 1000 * scale;
      const diff = (svgRoofWidth - topW) / 2;
      return `M ${diff + s},${s} L ${svgRoofWidth - diff - s},${s} L ${svgRoofWidth - s},${svgRoofLength - s} L ${s},${svgRoofLength - s} Z`;
    }
    return `M ${s},${s} L ${svgRoofWidth - s},${s} L ${svgRoofWidth - s},${svgRoofLength - s} L ${s},${svgRoofLength - s} Z`;
  }, [roof, svgRoofWidth, svgRoofLength, svgSetback, scale]);

  // Chuyển đổi tọa độ chuột hoặc ngón tay (Touch / Mouse) sang mm trên mặt bằng
  const getMmCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { xMm: 0, yMm: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = (clientX - rect.left) / zoom;
    const svgY = (clientY - rect.top) / zoom;
    return {
      xMm: Math.round(svgX / scale),
      yMm: Math.round(svgY / scale),
    };
  };

  // 1. POINTER DOWN TRÊN TẤM PIN
  const handlePanelPointerDown = (e: React.PointerEvent, panel: PlacedPanel) => {
    // Nếu nhấp chuột giữa (button === 1) thì nhường cho thao tác kéo mặt bằng (Pan)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    onSelectPanel(panel.id);
    onSelectObstacle(null);
    setDraggingPanelId(panel.id);

    const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
    setDragOffset({
      x: xMm - panel.xMm,
      y: yMm - panel.yMm,
    });
  };

  // 2. POINTER DOWN TRÊN VẬT CẢN (KÉO VỊ TRÍ VẬT CẢN)
  const handleObstaclePointerDown = (e: React.PointerEvent, obs: Obstacle) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    onSelectObstacle(obs.id);
    onSelectPanel(null);
    setDraggingObstacleId(obs.id);

    const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
    setDragObstacleOffset({
      x: xMm - obs.xMm,
      y: yMm - obs.yMm,
    });
  };

  // 3. POINTER DOWN NÚM XOAY TRỰC TIẾP TẤM PIN
  const handleRotateHandlePointerDown = (e: React.PointerEvent, panel: PlacedPanel) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    setIsRotating(true);
    setPanelInitialAngle(panel.rotationDeg || 0);

    const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
    const dim = getPanelDimensions(panelSpec, panel.rotationDeg || 0);
    const centerX = panel.xMm + dim.width / 2;
    const centerY = panel.yMm + dim.height / 2;
    const angle = Math.atan2(yMm - centerY, xMm - centerX) * (180 / Math.PI);
    setRotateStartAngle(angle);
  };

  // 4. POINTER DOWN NÚM XOAY TRỰC TIẾP VẬT CẢN
  const handleObsRotateHandlePointerDown = (e: React.PointerEvent, obs: Obstacle) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    setIsRotatingObstacle(true);
    setObsInitialAngle(obs.rotationDeg || 0);

    const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
    const obsBox = getObstacleBoundingBox(obs);
    const centerX = (obsBox.minX + obsBox.maxX) / 2;
    const centerY = (obsBox.minY + obsBox.maxY) / 2;
    const angle = Math.atan2(yMm - centerY, xMm - centerX) * (180 / Math.PI);
    setObsRotateStartAngle(angle);
  };

  // 5. POINTER MOVE (Kéo panel có TỰ ĐỘNG KHỚP/HÚT DÍNH, Xoay panel, Kéo vật cản, hoặc Pan)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isRotating && selectedPanelId) {
      const panel = panels.find((p) => p.id === selectedPanelId);
      if (panel) {
        const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
        const oldDim = getPanelDimensions(panelSpec, panel.rotationDeg || 0);
        const centerX = panel.xMm + oldDim.width / 2;
        const centerY = panel.yMm + oldDim.height / 2;
        const currentAngle = Math.atan2(yMm - centerY, xMm - centerX) * (180 / Math.PI);
        const delta = Math.round(currentAngle - rotateStartAngle);
        let newAngle = (panelInitialAngle + delta + 360) % 360;
        const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        for (const snap of snapAngles) {
          if (Math.abs(newAngle - snap) < 3) {
            newAngle = snap % 360;
            break;
          }
        }
        const newDim = getPanelDimensions(panelSpec, newAngle);
        const targetX = Math.round(centerX - newDim.width / 2);
        const targetY = Math.round(centerY - newDim.height / 2);
        if (isSnapEnabled) {
          const rotatedPanel: PlacedPanel = { ...panel, rotationDeg: newAngle };
          const resolved = resolvePanelOverlap(
            targetX,
            targetY,
            rotatedPanel,
            panelSpec,
            panels,
            roofWidthMm,
            roofLengthMm,
            20,
            obstacles
          );
          onUpdatePanel(selectedPanelId, {
            xMm: resolved.x,
            yMm: resolved.y,
            rotationDeg: newAngle,
          });
        } else {
          onUpdatePanel(selectedPanelId, {
            xMm: targetX,
            yMm: targetY,
            rotationDeg: newAngle,
          });
        }
      }
    } else if (isRotatingObstacle && selectedObstacleId) {
      const obs = obstacles.find((o) => o.id === selectedObstacleId);
      if (obs) {
        const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
        const oldBox = getObstacleBoundingBox(obs);
        const centerX = (oldBox.minX + oldBox.maxX) / 2;
        const centerY = (oldBox.minY + oldBox.maxY) / 2;
        const currentAngle = Math.atan2(yMm - centerY, xMm - centerX) * (180 / Math.PI);
        const delta = Math.round(currentAngle - obsRotateStartAngle);
        let newAngle = (obsInitialAngle + delta + 360) % 360;
        const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        for (const snap of snapAngles) {
          if (Math.abs(newAngle - snap) < 4) {
            newAngle = snap % 360;
            break;
          }
        }
        const rotatedObs: Obstacle = { ...obs, rotationDeg: newAngle };
        const newBox = getObstacleBoundingBox({ ...rotatedObs, xMm: 0, yMm: 0 });
        const targetX = Math.round(centerX - (newBox.maxX - newBox.minX) / 2);
        const targetY = Math.round(centerY - (newBox.maxY - newBox.minY) / 2);
        if (isSnapEnabled) {
          const resolved = resolveObstacleOverlap(
            targetX,
            targetY,
            rotatedObs,
            obstacles,
            panels,
            panelSpec,
            roofWidthMm,
            roofLengthMm,
            20
          );
          onUpdateObstacle(selectedObstacleId, {
            xMm: resolved.x,
            yMm: resolved.y,
            rotationDeg: newAngle,
          });
        } else {
          onUpdateObstacle(selectedObstacleId, {
            xMm: targetX,
            yMm: targetY,
            rotationDeg: newAngle,
          });
        }
      }
    } else if (draggingPanelId) {
      const movingPanel = panels.find((p) => p.id === draggingPanelId);
      if (movingPanel) {
        const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
        let candidateX = Math.round((xMm - dragOffset.x) / 10) * 10;
        let candidateY = Math.round((yMm - dragOffset.y) / 10) * 10;

        // Khi BẬT Tự Khớp: Khớp 20mm (không khớp 0mm) & chống trồng đè
        // Khi TẮT Tự Khớp: Cho phép di chuyển tự do ra ngoài mái hoặc đè lên nhau
        if (isSnapEnabled) {
          const snap = findMagneticSnap(
            candidateX,
            candidateY,
            movingPanel,
            panels,
            panelSpec,
            180,
            20,
            roofWidthMm,
            roofLengthMm,
            obstacles
          );
          candidateX = snap.x;
          candidateY = snap.y;
          setSnapGuides({ guideX: snap.guideX, guideY: snap.guideY, label: snap.snapLabel });
        } else {
          setSnapGuides({});
        }

        onUpdatePanel(draggingPanelId, {
          xMm: candidateX,
          yMm: candidateY,
        });
      }
    } else if (draggingObstacleId) {
      const movingObs = obstacles.find((o) => o.id === draggingObstacleId);
      if (movingObs) {
        const { xMm, yMm } = getMmCoordinates(e.clientX, e.clientY);
        const rawX = Math.round((xMm - dragObstacleOffset.x) / 10) * 10;
        const rawY = Math.round((yMm - dragObstacleOffset.y) / 10) * 10;

        if (isSnapEnabled) {
          const resolved = resolveObstacleOverlap(
            rawX,
            rawY,
            movingObs,
            obstacles,
            panels,
            panelSpec,
            roofWidthMm,
            roofLengthMm,
            20
          );
          onUpdateObstacle(draggingObstacleId, {
            xMm: resolved.x,
            yMm: resolved.y,
          });
        } else {
          onUpdateObstacle(draggingObstacleId, {
            xMm: rawX,
            yMm: rawY,
          });
        }
      }
    } else if (isPanning) {
      // Nếu người dùng nhả nút chuột ngoài cửa sổ mà không bắt được sự kiện up thì dừng pan ngay
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        setIsPanning(false);
        return;
      }
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      setPanPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingPanelId) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingPanelId(null);
      setSnapGuides({});
    }
    if (draggingObstacleId) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingObstacleId(null);
    }
    if (isRotating) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setIsRotating(false);
    }
    if (isRotatingObstacle) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setIsRotatingObstacle(false);
    }
    if (isPanning) {
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setIsPanning(false);
    }
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    // Bỏ qua pointer nếu đang có cử chỉ cảm ứng 2 ngón tay (giữ nguyên cảm ứng 2 ngón)
    if (touchGestureRef.current || isTouchGestureActive) return;

    // Không kích hoạt pan nếu nhấp vào nút bấm, ô nhập liệu hoặc thanh điều khiển
    const target = e.target as Element | null;
    if (target && typeof target.closest === 'function') {
      if (target.closest('button, input, select, textarea, label, [data-interactive="true"]')) {
        return;
      }
    }

    // Với chuột máy tính (trái hoặc giữa) hoặc chạm 1 ngón vào bất kỳ vùng mặt bằng mái / nền trống (không phải tấm pin hay vật cản vì đã stopPropagation)
    if (e.button === 0 || e.button === 1) {
      if (e.button === 1) {
        e.preventDefault();
      }
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {}
      onSelectPanel(null);
      onSelectObstacle(null);
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  // Nudge di chuyển vị trí tấm pin
  const handleNudge = (dxMm: number, dyMm: number) => {
    if (!selectedPanelId || !selectedPanel) return;
    if (isSnapEnabled) {
      const candidateX = Math.max(0, Math.min(selectedPanel.xMm + dxMm, roofWidthMm));
      const candidateY = Math.max(0, Math.min(selectedPanel.yMm + dyMm, roofLengthMm));
      const resolved = resolvePanelOverlap(
        candidateX,
        candidateY,
        selectedPanel,
        panelSpec,
        panels,
        roofWidthMm,
        roofLengthMm,
        20,
        obstacles
      );
      onUpdatePanel(selectedPanelId, { xMm: resolved.x, yMm: resolved.y });
    } else {
      onUpdatePanel(selectedPanelId, {
        xMm: selectedPanel.xMm + dxMm,
        yMm: selectedPanel.yMm + dyMm,
      });
    }
  };

  // Nudge di chuyển vị trí vật cản
  const handleObstacleNudge = (dxMm: number, dyMm: number) => {
    if (!selectedObstacleId || !selectedObstacle) return;
    if (isSnapEnabled) {
      const candidateX = Math.max(0, Math.min(selectedObstacle.xMm + dxMm, roofWidthMm));
      const candidateY = Math.max(0, Math.min(selectedObstacle.yMm + dyMm, roofLengthMm));
      const resolved = resolveObstacleOverlap(
        candidateX,
        candidateY,
        selectedObstacle,
        obstacles,
        panels,
        panelSpec,
        roofWidthMm,
        roofLengthMm,
        20
      );
      onUpdateObstacle(selectedObstacleId, { xMm: resolved.x, yMm: resolved.y });
    } else {
      onUpdateObstacle(selectedObstacleId, {
        xMm: selectedObstacle.xMm + dxMm,
        yMm: selectedObstacle.yMm + dyMm,
      });
    }
  };

  const handleRotateDelta = (deltaDeg: number) => {
    if (!selectedPanelId || !selectedPanel) return;
    const oldDim = getPanelDimensions(panelSpec, selectedPanel.rotationDeg || 0);
    const nextDeg = ((selectedPanel.rotationDeg || 0) + deltaDeg + 360) % 360;
    const newDim = getPanelDimensions(panelSpec, nextDeg);
    const targetX = Math.round(selectedPanel.xMm + (oldDim.width - newDim.width) / 2);
    const targetY = Math.round(selectedPanel.yMm + (oldDim.height - newDim.height) / 2);
    if (isSnapEnabled) {
      const rotatedPanel: PlacedPanel = { ...selectedPanel, rotationDeg: nextDeg };
      const resolved = resolvePanelOverlap(
        targetX,
        targetY,
        rotatedPanel,
        panelSpec,
        panels,
        roofWidthMm,
        roofLengthMm,
        20,
        obstacles
      );
      onUpdatePanel(selectedPanelId, { xMm: resolved.x, yMm: resolved.y, rotationDeg: nextDeg });
    } else {
      onUpdatePanel(selectedPanelId, { xMm: targetX, yMm: targetY, rotationDeg: nextDeg });
    }
  };

  const handleSetPanelAngle = (deg: number) => {
    if (!selectedPanelId || !selectedPanel) return;
    const oldDim = getPanelDimensions(panelSpec, selectedPanel.rotationDeg || 0);
    const nextDeg = (deg + 360) % 360;
    const newDim = getPanelDimensions(panelSpec, nextDeg);
    const targetX = Math.round(selectedPanel.xMm + (oldDim.width - newDim.width) / 2);
    const targetY = Math.round(selectedPanel.yMm + (oldDim.height - newDim.height) / 2);
    if (isSnapEnabled) {
      const rotatedPanel: PlacedPanel = { ...selectedPanel, rotationDeg: nextDeg };
      const resolved = resolvePanelOverlap(
        targetX,
        targetY,
        rotatedPanel,
        panelSpec,
        panels,
        roofWidthMm,
        roofLengthMm,
        20,
        obstacles
      );
      onUpdatePanel(selectedPanelId, { xMm: resolved.x, yMm: resolved.y, rotationDeg: nextDeg });
    } else {
      onUpdatePanel(selectedPanelId, { xMm: targetX, yMm: targetY, rotationDeg: nextDeg });
    }
  };

  // Xoay vật cản quanh tâm Bounding Box hiện tại để không bị lệch vị trí khi xoay
  const handleRotateObstacleDelta = (deltaDeg: number) => {
    if (!selectedObstacleId || !selectedObstacle) return;
    const nextDeg = ((selectedObstacle.rotationDeg || 0) + deltaDeg + 360) % 360;
    const oldBox = getObstacleBoundingBox(selectedObstacle);
    const oldW = oldBox.maxX - oldBox.minX;
    const oldH = oldBox.maxY - oldBox.minY;
    const tempObs: Obstacle = { ...selectedObstacle, xMm: 0, yMm: 0, rotationDeg: nextDeg };
    const newBox = getObstacleBoundingBox(tempObs);
    const newW = newBox.maxX - newBox.minX;
    const newH = newBox.maxY - newBox.minY;

    const targetX = Math.max(
      0,
      Math.min(roofWidthMm - newW, Math.round(selectedObstacle.xMm + (oldW - newW) / 2))
    );
    const targetY = Math.max(
      0,
      Math.min(roofLengthMm - newH, Math.round(selectedObstacle.yMm + (oldH - newH) / 2))
    );

    if (isSnapEnabled) {
      const rotatedObs: Obstacle = {
        ...selectedObstacle,
        xMm: targetX,
        yMm: targetY,
        rotationDeg: nextDeg,
      };
      const resolved = resolveObstacleOverlap(
        targetX,
        targetY,
        rotatedObs,
        obstacles,
        panels,
        panelSpec,
        roofWidthMm,
        roofLengthMm,
        20
      );
      onUpdateObstacle(selectedObstacleId, { xMm: resolved.x, yMm: resolved.y, rotationDeg: nextDeg });
    } else {
      onUpdateObstacle(selectedObstacleId, { xMm: targetX, yMm: targetY, rotationDeg: nextDeg });
    }
  };

  const handleSetObstacleAngle = (deg: number) => {
    if (!selectedObstacleId || !selectedObstacle) return;
    const nextDeg = (deg + 360) % 360;
    const oldBox = getObstacleBoundingBox(selectedObstacle);
    const oldW = oldBox.maxX - oldBox.minX;
    const oldH = oldBox.maxY - oldBox.minY;
    const tempObs: Obstacle = { ...selectedObstacle, xMm: 0, yMm: 0, rotationDeg: nextDeg };
    const newBox = getObstacleBoundingBox(tempObs);
    const newW = newBox.maxX - newBox.minX;
    const newH = newBox.maxY - newBox.minY;

    const targetX = Math.max(
      0,
      Math.min(roofWidthMm - newW, Math.round(selectedObstacle.xMm + (oldW - newW) / 2))
    );
    const targetY = Math.max(
      0,
      Math.min(roofLengthMm - newH, Math.round(selectedObstacle.yMm + (oldH - newH) / 2))
    );

    if (isSnapEnabled) {
      const rotatedObs: Obstacle = {
        ...selectedObstacle,
        xMm: targetX,
        yMm: targetY,
        rotationDeg: nextDeg,
      };
      const resolved = resolveObstacleOverlap(
        targetX,
        targetY,
        rotatedObs,
        obstacles,
        panels,
        panelSpec,
        roofWidthMm,
        roofLengthMm,
        20
      );
      onUpdateObstacle(selectedObstacleId, { xMm: resolved.x, yMm: resolved.y, rotationDeg: nextDeg });
    } else {
      onUpdateObstacle(selectedObstacleId, { xMm: targetX, yMm: targetY, rotationDeg: nextDeg });
    }
  };

  // La Bàn / Hướng Nhà
  const handleCompassInteraction = (clientX: number, clientY: number) => {
    if (!compassDialRef.current) return;
    const rect = compassDialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angleRad = Math.atan2(clientY - cy, clientX - cx);
    let deg = Math.round(angleRad * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;
    deg = deg % 360;

    const cardinalSnaps = [0, 45, 90, 135, 180, 225, 270, 315];
    for (const snap of cardinalSnaps) {
      if (Math.abs(deg - snap) < 5) {
        deg = snap;
        break;
      }
    }
    onUpdateRoof({ azimuthDeg: deg });
  };

  const materialInfo = ROOF_MATERIALS[roof.material];

  const getAzimuthName = (deg: number) => {
    if (deg >= 338 || deg <= 22) return 'Chính Bắc (0°)';
    if (deg > 22 && deg < 68) return 'Đông Bắc (45°)';
    if (deg >= 68 && deg <= 112) return 'Chính Đông (90°)';
    if (deg > 112 && deg < 158) return 'Đông Nam (135°)';
    if (deg >= 158 && deg <= 202) return 'Chính Nam (180° - Tối Ưu)';
    if (deg > 202 && deg < 248) return 'Tây Nam (225°)';
    if (deg >= 248 && deg <= 292) return 'Chính Tây (270°)';
    return 'Tây Bắc (315°)';
  };

  return (
    <div
      ref={canvasContainerRef}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0'
          : 'relative w-full h-full min-h-[560px] rounded-xl border border-slate-800'
      } bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing`}
    >
      {/* NÚT BONG BÓNG TOÀN MÀN HÌNH Ở GÓC TRÁI TRÊN (CHO LAPTOP, MÁY TÍNH BẢNG & ĐIỆN THOẠI) */}
      {onToggleFullscreen && (
        <div
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full border shadow-xl backdrop-blur-md transition-all active:scale-95 text-xs font-bold ${
              isFullscreen
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
                : 'bg-slate-900/95 hover:bg-slate-800 text-slate-100 border-slate-700/90'
            }`}
            title={
              isFullscreen
                ? 'Thoát chế độ vẽ toàn màn hình (Esc)'
                : 'Phóng to vùng vẽ toàn màn hình'
            }
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Thoát Toàn Màn Hình</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Toàn Màn Hình</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* MENU BONG BÓNG TÁC VỤ CÓ THỂ KÉO DI CHUYỂN BẤT KỲ VỊ TRÍ NÀO (CHỈ HIỆN KHI BẬT TOÀN MÀN HÌNH) */}
      {isFullscreen && (
        <div
          style={{
            left: `${toolsBubblePos.x}px`,
            top: `${toolsBubblePos.y}px`,
            touchAction: 'none',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed z-30 select-none"
        >
          {!isToolsBubbleOpen ? (
            <button
              type="button"
              onPointerDown={handleBubblePointerDown}
              onPointerMove={handleBubblePointerMove}
              onPointerUp={(e) => handleBubblePointerUp(e, true)}
              onPointerCancel={(e) => handleBubblePointerUp(e, false)}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-400 border-2 border-amber-400/70 shadow-2xl backdrop-blur-md cursor-move active:scale-95 transition-transform"
              title="Chạm để mở menu hoặc nhấn giữ kéo đến bất kỳ vị trí nào trên màn hình"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-56 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/50 shadow-2xl overflow-hidden animate-fade-in">
              {/* Thanh tiêu đề nắm kéo di chuyển khắp màn hình */}
              <div
                onPointerDown={handleBubblePointerDown}
                onPointerMove={handleBubblePointerMove}
                onPointerUp={(e) => handleBubblePointerUp(e, false)}
                onPointerCancel={(e) => handleBubblePointerUp(e, false)}
                className="flex items-center justify-between px-3 py-2 bg-slate-950/90 border-b border-slate-800 cursor-move"
                title="Nhấn giữ thanh này để kéo menu bong bóng tới bất kỳ vị trí nào"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <GripHorizontal className="w-4 h-4 text-slate-400" />
                  <span>Tác Vụ Thiết Kế</span>
                </div>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setIsToolsBubbleOpen(false)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Thu gọn thành nút bong bóng"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 5 Tác vụ chính trong menu bong bóng */}
              <div className="p-2.5 flex flex-col gap-1.5">
                {onAddSinglePanel && (
                  <button
                    type="button"
                    onClick={onAddSinglePanel}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Thêm 1 Tấm</span>
                  </button>
                )}

                {onOpenArrayModal && (
                  <button
                    type="button"
                    onClick={onOpenArrayModal}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                  >
                    <Grid className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Tạo Mảng Pin</span>
                  </button>
                )}

                {onAutoFill && (
                  <button
                    type="button"
                    onClick={onAutoFill}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors"
                  >
                    <Wand2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tự Động Xếp Mái</span>
                  </button>
                )}

                {onOpenObstacleModal && (
                  <button
                    type="button"
                    onClick={onOpenObstacleModal}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                  >
                    <Boxes className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>+ Vật Cản</span>
                  </button>
                )}

                {onToggleSnap && (
                  <button
                    type="button"
                    onClick={onToggleSnap}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      isSnapEnabled
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSnapEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      <span>Tự Khớp 20mm ({isSnapEnabled ? 'Bật' : 'Tắt'})</span>
                    </span>
                  </button>
                )}

                {/* Các nút Lưu Cập Nhật, Lưu / Mở Dự Án & Xuất Bản Vẽ trong Menu Bong Bóng Đóng/Mở */}
                <div className="pt-1.5 mt-0.5 border-t border-slate-800 space-y-1.5">
                  {activeProjectName && onQuickSaveActiveProject && (
                    <button
                      type="button"
                      onClick={onQuickSaveActiveProject}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 rounded-xl transition-colors"
                    >
                      <Save className="w-4 h-4 shrink-0" />
                      <span className="truncate">Lưu Cập Nhật</span>
                    </button>
                  )}

                  {onOpenProjectManager && (
                    <button
                      type="button"
                      onClick={onOpenProjectManager}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Lưu / Mở Dự Án</span>
                    </button>
                  )}

                  {onExportDrawing && (
                    <button
                      type="button"
                      onClick={onExportDrawing}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>Xuất Bản Vẽ (PDF / Ảnh)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MENU BONG BÓNG HƯỚNG NHÀ (MẶC ĐỊNH THU GỌN THÀNH NÚT BONG BÓNG ĐỂ TIẾT KIỆM MÀN HÌNH) */}
      <div
        className="absolute top-3 right-3 z-20 flex flex-col items-end"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!isCompassOpen ? (
          <button
            type="button"
            onClick={() => setIsCompassOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-100 border border-slate-700/90 shadow-xl backdrop-blur-md transition-all active:scale-95 group"
            title="Nhấn để mở bảng điều chỉnh Hướng Nhà (La bàn)"
          >
            <div className="relative w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
              <div
                className="w-0.5 h-4 bg-gradient-to-b from-rose-500 via-white to-amber-400 rounded-full transition-transform"
                style={{ transform: `rotate(${roof.azimuthDeg}deg)` }}
              />
            </div>
            <div className="text-left leading-tight">
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>Hướng nhà: {roof.azimuthDeg}°</span>
              </div>
              <div className="text-[9px] text-slate-400 group-hover:text-slate-200">
                Chạm để chỉnh hướng
              </div>
            </div>
          </button>
        ) : (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-2xl flex flex-col items-center gap-2 shadow-2xl w-52 animate-fade-in">
            <div className="flex items-center justify-between w-full text-[11px] text-slate-300 font-medium pb-1.5 border-b border-slate-800">
              <span className="flex items-center gap-1 font-bold text-white">
                <Compass className="w-3.5 h-3.5 text-rose-400" />
                <span>Hướng Nhà</span>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={roof.azimuthDeg}
                  onChange={(e) =>
                    onUpdateRoof({ azimuthDeg: (parseInt(e.target.value) || 0) % 360 })
                  }
                  className="w-10 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-[11px] text-amber-400 font-bold"
                />
                <span className="text-[10px] text-amber-400 font-bold">°</span>
                <button
                  type="button"
                  onClick={() => setIsCompassOpen(false)}
                  className="ml-1 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Thu gọn thành bong bóng"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mặt đồng hồ la bàn xoay được */}
            <div
              ref={compassDialRef}
              onPointerDown={(e) => {
                e.stopPropagation();
                try {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                } catch {}
                setIsDraggingCompass(true);
                handleCompassInteraction(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (isDraggingCompass) {
                  handleCompassInteraction(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) => {
                try {
                  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {}
                setIsDraggingCompass(false);
              }}
              onPointerCancel={(e) => {
                try {
                  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {}
                setIsDraggingCompass(false);
              }}
              className="relative w-16 h-16 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center cursor-pointer active:scale-95 transition-transform touch-none shadow-inner"
              title="Chạm hoặc kéo chuột quanh la bàn để xoay hướng nhà"
            >
              <span className="absolute top-0.5 text-[8px] font-bold text-rose-400 select-none">B</span>
              <span className="absolute right-1 text-[8px] font-bold text-slate-400 select-none">Đ</span>
              <span className="absolute bottom-0.5 text-[8px] font-bold text-amber-400 select-none">N</span>
              <span className="absolute left-1 text-[8px] font-bold text-slate-400 select-none">T</span>

              <div
                className="w-10 h-10 flex items-center justify-center transition-transform duration-75 pointer-events-none"
                style={{ transform: `rotate(${roof.azimuthDeg}deg)` }}
              >
                <div className="w-1 h-8 bg-gradient-to-b from-rose-500 via-white to-amber-500 rounded-full" />
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px] border-b-rose-500 absolute -top-1" />
              </div>
            </div>

            {/* Tên hướng & Hiệu suất bức xạ */}
            <div className="text-[10px] text-center font-medium leading-tight text-slate-300">
              <div>{getAzimuthName(roof.azimuthDeg)}</div>
              <div className="text-[9px] text-emerald-400 font-mono mt-0.5">
                {roof.azimuthDeg === 180 ? '⚡ Bức xạ tối đa 100%' : '⚡ Hiệu suất ~95-98%'}
              </div>
            </div>

            {/* Slider xoay góc hướng nhà */}
            <input
              type="range"
              min="0"
              max="359"
              step="1"
              value={roof.azimuthDeg}
              onChange={(e) => onUpdateRoof({ azimuthDeg: parseInt(e.target.value) || 0 })}
              className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              title="Kéo thanh trượt để đổi hướng nhà"
            />

            {/* 8 Hướng Phong Thủy & Kỹ Thuật */}
            <div className="grid grid-cols-4 gap-1 w-full pt-1">
              {[
                { deg: 180, label: 'Nam' },
                { deg: 135, label: 'Đ-N' },
                { deg: 225, label: 'T-N' },
                { deg: 90, label: 'Đông' },
                { deg: 270, label: 'Tây' },
                { deg: 45, label: 'Đ-B' },
                { deg: 315, label: 'T-B' },
                { deg: 0, label: 'Bắc' },
              ].map((dir) => (
                <button
                  key={dir.deg}
                  type="button"
                  onClick={() => onUpdateRoof({ azimuthDeg: dir.deg })}
                  className={`py-0.5 px-0.5 rounded text-[9px] font-mono transition-colors text-center ${
                    roof.azimuthDeg === dir.deg
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. MENU BONG BÓNG ĐIỀU CHỈNH KHI ẤN VÀO TẤM PIN ĐANG CHỌN (ĐẶT PHÍA TRÊN BÊN TRÁI DƯỚI NÚT TOÀN MÀN HÌNH) */}
      {selectedPanel && (
        <div
          className="absolute top-14 left-3 z-20 flex flex-col items-start"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!isInspectorOpen ? (
            <div className="flex items-center gap-1.5 p-1.5 pl-3 rounded-full bg-slate-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-md animate-fade-in">
              <button
                type="button"
                onClick={() => setIsInspectorOpen(true)}
                className="flex items-center gap-2 pr-2 py-1 text-left group"
                title="Nhấn để mở bảng điều chỉnh tọa độ & góc xoay tấm pin"
              >
                <span className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </span>
                <div className="leading-tight">
                  <div className="text-xs font-bold text-amber-300">
                    Tấm #{panels.findIndex((p) => p.id === selectedPanel.id) + 1} ({selectedPanel.rotationDeg || 0}°)
                  </div>
                  <div className="text-[10px] text-slate-400 group-hover:text-white">
                    Chạm mở bảng điều chỉnh
                  </div>
                </div>
              </button>

              {/* Các nút thao tác nhanh ngay trên bong bóng */}
              <button
                type="button"
                onClick={() =>
                  handleSetPanelAngle(((selectedPanel.rotationDeg || 0) + 90) % 360)
                }
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Xoay nhanh 90°"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              </button>
              {onDuplicatePanel && (
                <button
                  type="button"
                  onClick={() => onDuplicatePanel(selectedPanel.id)}
                  className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title="Nhân bản tấm pin"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                </button>
              )}
              {onDeletePanel && (
                <button
                  type="button"
                  onClick={() => onDeletePanel(selectedPanel.id)}
                  className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
                  title="Xóa tấm pin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 w-80 max-w-[calc(100vw-2rem)] animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" />
                  <span>Tấm Pin #{panels.findIndex((p) => p.id === selectedPanel.id) + 1}</span>
                </span>
                <div className="flex items-center gap-1">
                  {onDuplicatePanel && (
                    <button
                      type="button"
                      onClick={() => onDuplicatePanel(selectedPanel.id)}
                      className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 transition-colors"
                      title="Nhân bản tấm pin này"
                    >
                      <Copy className="w-3 h-3 text-sky-400" />
                      <span>Nhân bản</span>
                    </button>
                  )}
                  {onDeletePanel && (
                    <button
                      type="button"
                      onClick={() => onDeletePanel(selectedPanel.id)}
                      className="px-2 py-0.5 text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded flex items-center gap-1 transition-colors font-semibold"
                      title="Xóa tấm pin này"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="ml-0.5 px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded flex items-center gap-0.5 transition-colors"
                    title="Thu gọn thành bong bóng"
                  >
                    <ChevronDown className="w-3 h-3 text-amber-400" />
                    <span>Ẩn</span>
                  </button>
                </div>
              </div>

              {/* Nhập Tọa Độ Trực Tiếp X & Y (mm) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Tọa độ X (mm)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleNudge(-nudgeStepMm, 0)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-amber-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={selectedPanel.xMm}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (isSnapEnabled) {
                          const resolved = resolvePanelOverlap(
                            Math.max(0, val),
                            selectedPanel.yMm,
                            selectedPanel,
                            panelSpec,
                            panels,
                            roofWidthMm,
                            roofLengthMm,
                            20,
                            obstacles
                          );
                          onUpdatePanel(selectedPanel.id, { xMm: resolved.x, yMm: resolved.y });
                        } else {
                          onUpdatePanel(selectedPanel.id, { xMm: val });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-amber-300 text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleNudge(nudgeStepMm, 0)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-amber-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Tọa độ Y (mm)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleNudge(0, -nudgeStepMm)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-amber-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={selectedPanel.yMm}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (isSnapEnabled) {
                          const resolved = resolvePanelOverlap(
                            selectedPanel.xMm,
                            Math.max(0, val),
                            selectedPanel,
                            panelSpec,
                            panels,
                            roofWidthMm,
                            roofLengthMm,
                            20,
                            obstacles
                          );
                          onUpdatePanel(selectedPanel.id, { xMm: resolved.x, yMm: resolved.y });
                        } else {
                          onUpdatePanel(selectedPanel.id, { yMm: val });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-amber-300 text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleNudge(0, nudgeStepMm)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-amber-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* D-Pad di chuyển vị trí tấm pin với bước nhảy */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleNudge(0, -nudgeStepMm)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500/30 text-slate-200 rounded-lg border border-slate-700"
                    title={`Dịch lên ${nudgeStepMm}mm`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex gap-1 my-0.5">
                    <button
                      type="button"
                      onClick={() => handleNudge(-nudgeStepMm, 0)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500/30 text-slate-200 rounded-lg border border-slate-700"
                      title={`Dịch trái ${nudgeStepMm}mm`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-7 h-7 flex items-center justify-center text-[9px] font-mono text-amber-400 font-bold bg-slate-950 rounded border border-slate-800">
                      {nudgeStepMm}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNudge(nudgeStepMm, 0)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500/30 text-slate-200 rounded-lg border border-slate-700"
                      title={`Dịch phải ${nudgeStepMm}mm`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNudge(0, nudgeStepMm)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-amber-500/30 text-slate-200 rounded-lg border border-slate-700"
                    title={`Dịch xuống ${nudgeStepMm}mm`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Lựa chọn bước nhảy */}
                  <div className="flex gap-1 mt-1 text-[9px]">
                    {[10, 50, 100].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setNudgeStepMm(step)}
                        className={`px-1 py-0.5 rounded font-mono ${
                          nudgeStepMm === step
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {step}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hướng góc tấm pin */}
                <div className="flex-1 space-y-1.5 border-l border-slate-800 pl-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Hướng góc pin:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="359"
                        value={selectedPanel.rotationDeg || 0}
                        onChange={(e) => handleSetPanelAngle(parseInt(e.target.value) || 0)}
                        className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-xs font-bold text-amber-400"
                      />
                      <span className="font-mono font-bold text-amber-400">°</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={selectedPanel.rotationDeg || 0}
                    onChange={(e) => handleSetPanelAngle(parseInt(e.target.value) || 0)}
                    className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />

                  <div className="grid grid-cols-4 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleSetPanelAngle(0)}
                      className={`py-1 rounded border transition-colors ${
                        (selectedPanel.rotationDeg || 0) === 0
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Dọc 0°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPanelAngle(90)}
                      className={`py-1 rounded border transition-colors ${
                        (selectedPanel.rotationDeg || 0) === 90
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Ngang 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateDelta(-15)}
                      className="py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
                    >
                      -15°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateDelta(15)}
                      className="py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
                    >
                      +15°
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSetPanelAngle(roof.azimuthDeg)}
                      className="py-1 text-[9px] text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded font-medium transition-colors truncate"
                      title="Xoay cùng góc phương vị nhà"
                    >
                      Góc nhà ({roof.azimuthDeg}°)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPanelAngle((roof.azimuthDeg + 90) % 360)}
                      className="py-1 text-[9px] text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded font-medium transition-colors truncate"
                      title="Xoay vuông góc với hướng nhà"
                    >
                      Vuông góc
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. MENU BONG BÓNG ĐIỀU CHỈNH KHI ẤN VÀO VẬT CẢN ĐANG CHỌN (ĐẶT PHÍA TRÊN BÊN TRÁI DƯỚI NÚT TOÀN MÀN HÌNH) */}
      {selectedObstacle && (
        <div
          className="absolute top-14 left-3 z-20 flex flex-col items-start"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!isInspectorOpen ? (
            <div className="flex items-center gap-1.5 p-1.5 pl-3 rounded-full bg-slate-900/95 border border-orange-500/50 shadow-2xl backdrop-blur-md animate-fade-in">
              <button
                type="button"
                onClick={() => setIsInspectorOpen(true)}
                className="flex items-center gap-2 pr-2 py-1 text-left group"
                title="Nhấn để mở bảng điều chỉnh tọa độ & góc xoay vật cản"
              >
                <span className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-300">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </span>
                <div className="leading-tight">
                  <div className="text-xs font-bold text-orange-300 truncate max-w-[140px]">
                    {selectedObstacle.name}
                  </div>
                  <div className="text-[10px] text-slate-400 group-hover:text-white">
                    Chạm mở bảng điều chỉnh
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRotateObstacleDelta(90)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Xoay nhanh vật cản 90°"
              >
                <RotateCw className="w-3.5 h-3.5 text-orange-400" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteObstacle(selectedObstacle.id)}
                className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
                title="Xóa vật cản này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-md border border-orange-500/50 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 w-80 max-w-[calc(100vw-2rem)] animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5 truncate">
                  <Boxes className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[130px]">{selectedObstacle.name}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteObstacle(selectedObstacle.id)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded transition-colors"
                    title="Xóa vật cản này khỏi mái"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(false)}
                    className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded flex items-center gap-0.5 transition-colors"
                    title="Thu gọn thành bong bóng"
                  >
                    <ChevronDown className="w-3 h-3 text-orange-400" />
                    <span>Ẩn</span>
                  </button>
                </div>
              </div>

              {/* Nhập Tọa Độ Trực Tiếp Cho Vật Cản X & Y (mm) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Tọa độ X (mm)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleObstacleNudge(-nudgeStepMm, 0)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-orange-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={selectedObstacle.xMm}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        onUpdateObstacle(selectedObstacle.id, { xMm: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-orange-300 text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleObstacleNudge(nudgeStepMm, 0)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-orange-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Tọa độ Y (mm)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleObstacleNudge(0, -nudgeStepMm)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-orange-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={selectedObstacle.yMm}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        onUpdateObstacle(selectedObstacle.id, { yMm: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-orange-300 text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleObstacleNudge(0, nudgeStepMm)}
                      className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-orange-500/20 text-slate-200 rounded text-xs font-mono border border-slate-700 shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* D-Pad di chuyển vật cản */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleObstacleNudge(0, -nudgeStepMm)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-orange-500/30 text-slate-200 rounded-lg border border-slate-700"
                    title={`Dịch lên ${nudgeStepMm}mm`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex gap-1 my-0.5">
                    <button
                      type="button"
                      onClick={() => handleObstacleNudge(-nudgeStepMm, 0)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-orange-500/30 text-slate-200 rounded-lg border border-slate-700"
                      title={`Dịch trái ${nudgeStepMm}mm`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-7 h-7 flex items-center justify-center text-[9px] font-mono text-orange-400 font-bold bg-slate-950 rounded border border-slate-800">
                      {nudgeStepMm}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleObstacleNudge(nudgeStepMm, 0)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-orange-500/30 text-slate-200 rounded-lg border border-slate-700"
                      title={`Dịch phải ${nudgeStepMm}mm`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleObstacleNudge(0, nudgeStepMm)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-orange-500/30 text-slate-200 rounded-lg border border-slate-700"
                    title={`Dịch xuống ${nudgeStepMm}mm`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Điều khiển xoay góc vật cản */}
                <div className="flex-1 space-y-1.5 border-l border-slate-800 pl-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Góc xoay:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="359"
                        value={selectedObstacle.rotationDeg || 0}
                        onChange={(e) => handleSetObstacleAngle(parseInt(e.target.value) || 0)}
                        className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center font-mono text-xs font-bold text-orange-400"
                      />
                      <span className="font-mono font-bold text-orange-400">°</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={selectedObstacle.rotationDeg || 0}
                    onChange={(e) => handleSetObstacleAngle(parseInt(e.target.value) || 0)}
                    className="w-full accent-orange-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />

                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleRotateObstacleDelta(90)}
                      className="py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700 flex items-center justify-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateObstacleDelta(-15)}
                      className="py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
                    >
                      -15°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateObstacleDelta(15)}
                      className="py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
                    >
                      +15°
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                    Kích thước: {selectedObstacle.widthMm} × {selectedObstacle.lengthMm} mm
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* THÔNG BÁO TỰ KHỚP CẠNH (MAGNETIC SNAP BADGE) */}
      {snapGuides.label && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/95 border border-emerald-500/70 text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-2xl shadow-emerald-950/80 animate-fade-in pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Magnet className="w-3.5 h-3.5 text-emerald-400" />
          <span>{snapGuides.label}</span>
        </div>
      )}

      {/* SVG CANVAS WORKSPACE */}
      <div
        className={`w-full h-full flex items-center justify-center ${
          isPanning || isTouchGestureActive ? 'transition-none' : 'transition-transform duration-100 ease-out'
        }`}
        style={{
          transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          touchAction: 'none',
        }}
      >
        <svg
          ref={svgRef}
          width={svgRoofWidth + 120}
          height={svgRoofLength + 120}
          viewBox={`-60 -60 ${svgRoofWidth + 120} ${svgRoofLength + 120}`}
          className="overflow-visible drop-shadow-2xl"
          style={{ touchAction: 'none' }}
        >
          <defs>
            <pattern
              id="grid-1m"
              width={1000 * scale}
              height={1000 * scale}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}`}
                fill="none"
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            </pattern>

            <pattern
              id="pattern-ton"
              width={250 * scale}
              height={svgRoofLength}
              patternUnits="userSpaceOnUse"
            >
              <line
                x1={125 * scale}
                y1="0"
                x2={125 * scale}
                y2={svgRoofLength}
                stroke="#1e293b"
                strokeWidth="1.5"
              />
            </pattern>

            {/* Gradient tế bào quang điện Monocrystalline N-Type cao cấp */}
            <linearGradient id="pv-cell-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f294e" />
              <stop offset="35%" stopColor="#0a1931" />
              <stop offset="70%" stopColor="#132e5c" />
              <stop offset="100%" stopColor="#091528" />
            </linearGradient>

            {/* Khung nhôm Anode bạc kim loại */}
            <linearGradient id="pv-frame-metal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Hiệu ứng mặt kính cường lực phản quang ánh nắng */}
            <linearGradient id="pv-glass-sheen" x1="0%" y1="0%" x2="100%" y2="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.06" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
            </linearGradient>

            <linearGradient id="pv-cell-warning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="50%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#450a0a" />
            </linearGradient>
          </defs>

          {/* MẶT BẰNG MÁI NHÀ */}
          <g id="roof-structure">
            <path
              d={roofPath}
              fill="#0f172a"
              stroke="#475569"
              strokeWidth="3"
              className="transition-colors"
            />
            {(roof.material === 'ton_nha_dan' || roof.material === 'ton_song') && (
              <path d={roofPath} fill="url(#pattern-ton)" opacity="0.7" />
            )}
            {roof.material === 'seamlock' && (
              <path d={roofPath} fill="url(#pattern-ton)" opacity="0.9" />
            )}
            <path d={roofPath} fill="url(#grid-1m)" opacity="0.4" />
            <path
              d={setbackPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.8"
            />

            {/* La bàn chỉ hướng nhà trực quan trên mặt bằng mái (Tự thu gọn tỷ lệ theo kích thước mái) */}
            <g
              transform={`translate(${svgRoofWidth / 2}, ${svgRoofLength / 2}) scale(${Math.min(
                1,
                Math.max(0.35, Math.min(svgRoofWidth, svgRoofLength) / 260)
              )})`}
              opacity="0.35"
              pointerEvents="none"
            >
              <circle r="44" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
              <g transform={`rotate(${roof.azimuthDeg})`}>
                <line x1="0" y1="36" x2="0" y2="-36" stroke="#f59e0b" strokeWidth="2.5" />
                <polygon points="0,-44 -7,-30 7,-30" fill="#f43f5e" />
                <polygon points="0,44 -5,32 5,32" fill="#f59e0b" />
              </g>
              <rect x="-90" y="48" width="180" height="18" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" opacity="0.9" />
              <text y="61" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
                HƯỚNG NHÀ: {roof.azimuthDeg}° ({getAzimuthName(roof.azimuthDeg).split(' ')[0]})
              </text>
            </g>
          </g>

          {/* ĐƯỜNG GIÓNG TỰ ĐỘNG KHỚP/HÚT DÍNH (MAGNETIC SNAP GUIDELINES) */}
          {snapGuides.guideX !== undefined && (
            <line
              x1={snapGuides.guideX * scale}
              y1={-30}
              x2={snapGuides.guideX * scale}
              y2={svgRoofLength + 30}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.9"
            />
          )}
          {snapGuides.guideY !== undefined && (
            <line
              x1={-30}
              y1={snapGuides.guideY * scale}
              x2={svgRoofWidth + 30}
              y2={snapGuides.guideY * scale}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.9"
            />
          )}

          {/* KÍCH THƯỚC THƯỚC ĐO */}
          {showDimensions && (
            <g id="roof-dimensions" className="font-mono text-[11px] fill-slate-300">
              <line
                x1="0"
                y1="-20"
                x2={svgRoofWidth}
                y2="-20"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <line x1="0" y1="-28" x2="0" y2="-12" stroke="#64748b" strokeWidth="1" />
              <line
                x1={svgRoofWidth}
                y1="-28"
                x2={svgRoofWidth}
                y2="-12"
                stroke="#64748b"
                strokeWidth="1"
              />
              <text
                x={svgRoofWidth / 2}
                y="-26"
                textAnchor="middle"
                className="font-semibold fill-amber-400"
              >
                Rộng: {roof.widthM}m ({roofWidthMm} mm)
              </text>

              <line
                x1="-20"
                y1="0"
                x2="-20"
                y2={svgRoofLength}
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <line x1="-28" y1="0" x2="-12" y2="0" stroke="#64748b" strokeWidth="1" />
              <line
                x1="-28"
                y1={svgRoofLength}
                x2="-12"
                y2={svgRoofLength}
                stroke="#64748b"
                strokeWidth="1"
              />
              <text
                x="-26"
                y={svgRoofLength / 2}
                textAnchor="middle"
                transform={`rotate(-90, -26, ${svgRoofLength / 2})`}
                className="font-semibold fill-amber-400"
              >
                Dài: {roof.lengthM}m ({roofLengthMm} mm)
              </text>

              <text
                x={svgSetback + 6}
                y={svgSetback + 14}
                className="text-[9px] fill-amber-400/80 font-mono"
              >
                Khoảng lùi an toàn {roof.setbackM}m
              </text>
            </g>
          )}

          {/* CÁC VẬT CẢN TRÊN MÁI (KÉO THẢ VỊ TRÍ & XOAY ĐỔI GÓC) */}
          <g id="roof-obstacles">
            {obstacles.map((obs, obsIdx) => {
              const obsX = obs.xMm * scale;
              const obsY = obs.yMm * scale;
              const obsW = obs.widthMm * scale;
              const obsL = obs.lengthMm * scale;
              const isSelected = selectedObstacleId === obs.id;
              const isDragging = draggingObstacleId === obs.id;
              const rot = obs.rotationDeg || 0;
              const obsBox = getObstacleBoundingBox(obs);
              const obsBoxW = (obsBox.maxX - obsBox.minX) * scale;
              const obsBoxL = (obsBox.maxY - obsBox.minY) * scale;
              const renderObsX = obsX + (obsBoxW - obsW) / 2;
              const renderObsY = obsY + (obsBoxL - obsL) / 2;
              const obsMinSide = Math.min(obsW, obsL);
              const obsUiScale = Math.min(1, Math.max(0.25, obsMinSide / 28));
              const obsCode = `VC${obsIdx + 1}`;
              const obsFontSize = Math.min(7.5, Math.max(1.8, obsMinSide * 0.28));

              return (
                <g
                  key={obs.id}
                  transform={`translate(${renderObsX}, ${renderObsY}) rotate(${rot}, ${obsW / 2}, ${obsL / 2})`}
                  onPointerDown={(e) => handleObstaclePointerDown(e, obs)}
                  style={{ touchAction: 'none' }}
                  className={`cursor-grab active:cursor-grabbing ${
                    isDragging ? 'opacity-90' : ''
                  }`}
                >
                  <title>{`${obsCode}: ${obs.name} (${obs.widthMm}×${obs.lengthMm}mm)`}</title>
                  {/* Khung vật cản */}
                  <rect
                    width={obsW}
                    height={obsL}
                    rx={Math.min(4, obsMinSide * 0.12)}
                    fill={obs.type === 'ac_outdoor' ? '#334155' : '#475569'}
                    stroke={isSelected ? '#f97316' : obs.type === 'ac_outdoor' ? '#38bdf8' : '#64748b'}
                    strokeWidth={
                      isSelected
                        ? Math.max(0.6, 2.2 * obsUiScale)
                        : Math.max(0.3, 1.1 * obsUiScale)
                    }
                    className="drop-shadow transition-all"
                  />
                  {obs.type === 'ac_outdoor' ? (
                    <g className="pointer-events-none">
                      {/* Lưới quạt tản nhiệt đặc trưng của Cục Nóng Máy Lạnh */}
                      <circle
                        cx={obsW / 2}
                        cy={obsL * 0.35}
                        r={Math.max(0.8, obsMinSide * 0.32)}
                        fill="#0f172a"
                        stroke="#94a3b8"
                        strokeWidth={Math.max(0.2, 0.7 * obsUiScale)}
                      />
                      <line
                        x1={obsW / 2 - obsMinSide * 0.24}
                        y1={obsL * 0.35}
                        x2={obsW / 2 + obsMinSide * 0.24}
                        y2={obsL * 0.35}
                        stroke="#38bdf8"
                        strokeWidth={Math.max(0.2, 0.7 * obsUiScale)}
                      />
                      <line
                        x1={obsW / 2}
                        y1={obsL * 0.35 - obsMinSide * 0.24}
                        x2={obsW / 2}
                        y2={obsL * 0.35 + obsMinSide * 0.24}
                        stroke="#38bdf8"
                        strokeWidth={Math.max(0.2, 0.7 * obsUiScale)}
                      />
                      <rect
                        x={obsW * 0.15}
                        y={obsL * 0.68}
                        width={obsW * 0.7}
                        height={obsL * 0.18}
                        rx={Math.min(1, obsMinSide * 0.05)}
                        fill="#1e293b"
                        stroke="#64748b"
                        strokeWidth={Math.max(0.15, 0.45 * obsUiScale)}
                      />
                    </g>
                  ) : (
                    <>
                      <line
                        x1="0"
                        y1="0"
                        x2={obsW}
                        y2={obsL}
                        stroke="#334155"
                        strokeWidth={Math.max(0.2, 0.9 * obsUiScale)}
                        className="pointer-events-none"
                      />
                      <line
                        x1={obsW}
                        y1="0"
                        x2="0"
                        y2={obsL}
                        stroke="#334155"
                        strokeWidth={Math.max(0.2, 0.9 * obsUiScale)}
                        className="pointer-events-none"
                      />
                    </>
                  )}

                  {/* Mã ký hiệu vật cản (VC1, VC2...) tự co giãn theo kích thước vật cản để không tràn chữ khi mái lớn */}
                  <text
                    x={obsW / 2}
                    y={obsL / 2 + obsFontSize * 0.35}
                    textAnchor="middle"
                    fontSize={obsFontSize}
                    className="fill-white font-mono font-bold pointer-events-none select-none"
                  >
                    {obsMinSide >= 45 ? `${obsCode}: ${obs.name}` : obsCode}
                  </text>

                  {/* NÚM XOAY TRỰC TIẾP VẬT CẢN (Tự co giãn theo tỷ lệ vật cản) */}
                  {isSelected && (
                    <g
                      transform={`translate(${obsW / 2}, 0) scale(${obsUiScale})`}
                      className="cursor-crosshair"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="-20"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx="0"
                        cy="-22"
                        r="20"
                        fill="transparent"
                        onPointerDown={(e) => handleObsRotateHandlePointerDown(e, obs)}
                        className="cursor-grab active:cursor-grabbing"
                      />
                      <circle
                        cx="0"
                        cy="-22"
                        r="8.5"
                        fill="#f97316"
                        stroke="#0f172a"
                        strokeWidth="2.2"
                        onPointerDown={(e) => handleObsRotateHandlePointerDown(e, obs)}
                        className="active:scale-125 transition-transform cursor-grab active:cursor-grabbing"
                      >
                        <title>Kéo chuột hoặc vuốt ngón tay để xoay vật cản</title>
                      </circle>
                    </g>
                  )}

                  {/* NÚT XÓA TRỰC TIẾP TRÊN VẬT CẢN */}
                  {isSelected && (
                    <g
                      transform={`translate(${obsW}, 0) scale(${obsUiScale}) translate(9, -9)`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onDeleteObstacle(obs.id);
                      }}
                      className="cursor-pointer active:scale-90 transition-transform"
                    >
                      <circle r="18" fill="transparent" />
                      <circle r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                      <path
                        d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <title>Xóa vật cản này khỏi mái</title>
                    </g>
                  )}

                  {/* Tọa độ hiển thị khi chọn vật cản */}
                  {isSelected && (
                    <g
                      transform={`translate(${obsW / 2}, ${obsL}) scale(${obsUiScale}) translate(0, 12)`}
                      className="pointer-events-none"
                    >
                      <rect
                        x="-60"
                        y="-9"
                        width="120"
                        height="17"
                        rx="4"
                        fill="#0f172a"
                        stroke="#f97316"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fontSize="7.5"
                        className="font-mono fill-orange-300 font-semibold"
                      >
                        {obsCode}: {obs.xMm},{obs.yMm}mm | {rot}°
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* CÁC TẤM PIN MẶT TRỜI ĐÃ ĐẶT (TỰ ĐỘNG CO GIÃN ĐỘ CHI TIẾT & CỠ CHỮ THEO DIỆN TÍCH MÁI) */}
          <g id="solar-panels">
            {panels.map((panel, idx) => {
              const rawW = panelSpec.widthMm * scale;
              const rawH = panelSpec.lengthMm * scale;
              const rotation = panel.rotationDeg || 0;
              const dim = getPanelDimensions(panelSpec, rotation);
              const boxW = dim.width * scale;
              const boxH = dim.height * scale;
              const panelX = panel.xMm * scale;
              const panelY = panel.yMm * scale;
              const renderX = panelX + (boxW - rawW) / 2;
              const renderY = panelY + (boxH - rawH) / 2;
              const isSelected = selectedPanelId === panel.id;
              const isDragging = draggingPanelId === panel.id;

              const inBounds = isPanelWithinRoof(panel, panelSpec, roof);
              const collides = doesPanelCollideWithObstacles(panel, panelSpec, obstacles);
              const collidesPanel = doesPanelCollideWithOtherPanels(panel, panelSpec, panels);
              const isInvalid = !inBounds || collides || collidesPanel;

              // Tính toán tỷ lệ động theo kích thước thực tế của tấm pin trên mặt bằng (giúp mái cực lớn hàng nghìn m² vẫn sắc nét)
              const minPanelDim = Math.min(rawW, rawH);
              const panelScaleRatio = Math.min(1, Math.max(0.12, minPanelDim / 28));
              const uiHandleScale = Math.min(1, Math.max(0.25, minPanelDim / 28));

              const framePad = Math.min(3.2, Math.max(0.2, rawW * 0.032));
              const innerW = Math.max(0.8, rawW - framePad * 2);
              const innerH = Math.max(0.8, rawH - framePad * 2);
              const cols = 6;
              const halfRows = 6; // 6 hàng nửa trên + 6 hàng nửa dưới mô phỏng 132 Half-Cell
              const splitGap = Math.min(1.5, Math.max(0.18, rawH * 0.016));
              const halfH = Math.max(0.4, (innerH - splitGap) / 2);
              const colW = innerW / cols;
              const rowH = halfH / halfRows;

              // Kích thước nhãn số thứ tự (#1, #2...) co giãn tỷ lệ thuận với kích thước tấm pin (tối đa 22% cạnh ngắn)
              const labelStr = `#${idx + 1}`;
              const badgeH = Math.min(12.5, Math.max(1.5, minPanelDim * 0.22));
              const badgeFontSize = badgeH * 0.65;
              const badgeW = Math.min(
                rawW * 0.72,
                Math.max(badgeH * 1.25, labelStr.length * badgeFontSize * 0.65 + badgeFontSize * 0.55)
              );

              return (
                <g
                  key={panel.id}
                  transform={`translate(${renderX}, ${renderY}) rotate(${rotation}, ${rawW / 2}, ${rawH / 2})`}
                  onPointerDown={(e) => handlePanelPointerDown(e, panel)}
                  style={{ touchAction: 'none' }}
                  className={`transition-shadow ${
                    isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab'
                  }`}
                >
                  {/* 1. Bóng đổ tạo chiều sâu tấm pin nổi trên mặt mái */}
                  <rect
                    x={1.4 * panelScaleRatio}
                    y={1.8 * panelScaleRatio}
                    width={rawW}
                    height={rawH}
                    rx={Math.min(2.5, minPanelDim * 0.08)}
                    fill="#020617"
                    opacity="0.55"
                    className="pointer-events-none"
                  />

                  {/* 2. Khung hợp kim nhôm Anode (Anodized Aluminum Frame) */}
                  <rect
                    width={rawW}
                    height={rawH}
                    rx={Math.min(2, minPanelDim * 0.06)}
                    fill="url(#pv-frame-metal)"
                    stroke={
                      isSelected
                        ? '#fbbf24'
                        : isInvalid
                        ? '#ef4444'
                        : '#cbd5e1'
                    }
                    strokeWidth={
                      isSelected
                        ? Math.max(0.45, 2.2 * panelScaleRatio)
                        : isInvalid
                        ? Math.max(0.4, 1.8 * panelScaleRatio)
                        : Math.max(0.18, 0.8 * panelScaleRatio)
                    }
                    className="transition-all"
                  />

                  {/* Viền Backsheet trắng/bạc bên trong khung nhôm */}
                  <rect
                    x={framePad * 0.65}
                    y={framePad * 0.65}
                    width={rawW - framePad * 1.3}
                    height={rawH - framePad * 1.3}
                    rx={Math.min(1.2, minPanelDim * 0.04)}
                    fill={isInvalid ? '#fca5a5' : '#e2e8f0'}
                    opacity="0.85"
                    className="pointer-events-none"
                  />

                  {/* 3. Bề mặt Silicon đơn tinh thể Monocrystalline N-Type */}
                  <rect
                    x={framePad}
                    y={framePad}
                    width={innerW}
                    height={innerH}
                    rx={Math.min(1, minPanelDim * 0.03)}
                    fill={isInvalid ? 'url(#pv-cell-warning)' : 'url(#pv-cell-gradient)'}
                    className="pointer-events-none"
                  />

                  {/* 4. Dải Multi-Busbar (MBB) mảnh ánh bạc dọc theo từng cột cell */}
                  {minPanelDim >= 14 && (
                    <g className="pointer-events-none" opacity={isInvalid ? '0.18' : '0.22'}>
                      {Array.from({ length: cols }).map((_, cIdx) => {
                        const cellLeft = framePad + cIdx * colW;
                        return (
                          <g key={`mbb_${cIdx}`}>
                            <line
                              x1={cellLeft + colW * 0.28}
                              y1={framePad}
                              x2={cellLeft + colW * 0.28}
                              y2={framePad + innerH}
                              stroke="#93c5fd"
                              strokeWidth={0.25 * panelScaleRatio}
                            />
                            <line
                              x1={cellLeft + colW * 0.5}
                              y1={framePad}
                              x2={cellLeft + colW * 0.5}
                              y2={framePad + innerH}
                              stroke="#93c5fd"
                              strokeWidth={0.25 * panelScaleRatio}
                            />
                            <line
                              x1={cellLeft + colW * 0.72}
                              y1={framePad}
                              x2={cellLeft + colW * 0.72}
                              y2={framePad + innerH}
                              stroke="#93c5fd"
                              strokeWidth={0.25 * panelScaleRatio}
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* 5. Đường rãnh chia 6 cột Cell dọc */}
                  <g className="pointer-events-none">
                    {Array.from({ length: cols - 1 }).map((_, i) => {
                      const cx = framePad + (i + 1) * colW;
                      return (
                        <line
                          key={`col_${i}`}
                          x1={cx}
                          y1={framePad}
                          x2={cx}
                          y2={framePad + innerH}
                          stroke={isInvalid ? '#fca5a5' : '#cbd5e1'}
                          strokeWidth={Math.max(0.08, 0.42 * panelScaleRatio)}
                          opacity="0.6"
                        />
                      );
                    })}
                  </g>

                  {/* 6. Đường rãnh chia các hàng Half-Cell (Nửa trên & Nửa dưới) + Hoa thị góc vát Mono */}
                  <g className="pointer-events-none">
                    {Array.from({ length: halfRows - 1 }).map((_, rIdx) => {
                      const yTop = framePad + (rIdx + 1) * rowH;
                      const yBot = framePad + halfH + splitGap + (rIdx + 1) * rowH;
                      const diamondSize = Math.min(1.4, colW * 0.11);

                      return (
                        <g key={`row_${rIdx}`}>
                          {/* Rãnh ngang nửa trên */}
                          <line
                            x1={framePad}
                            y1={yTop}
                            x2={framePad + innerW}
                            y2={yTop}
                            stroke={isInvalid ? '#fca5a5' : '#94a3b8'}
                            strokeWidth={Math.max(0.07, 0.32 * panelScaleRatio)}
                            opacity="0.5"
                          />
                          {/* Rãnh ngang nửa dưới */}
                          <line
                            x1={framePad}
                            y1={yBot}
                            x2={framePad + innerW}
                            y2={yBot}
                            stroke={isInvalid ? '#fca5a5' : '#94a3b8'}
                            strokeWidth={Math.max(0.07, 0.32 * panelScaleRatio)}
                            opacity="0.5"
                          />
                          {/* Điểm vát góc kim cương đặc trưng của Wafer Monocrystalline */}
                          {!isInvalid &&
                            minPanelDim >= 12 &&
                            Array.from({ length: cols - 1 }).map((__, cIdx) => {
                              const cx = framePad + (cIdx + 1) * colW;
                              return (
                                <g key={`dia_${rIdx}_${cIdx}`} fill="#e2e8f0" opacity="0.7">
                                  <polygon
                                    points={`${cx},${yTop - diamondSize} ${cx + diamondSize},${yTop} ${cx},${yTop + diamondSize} ${cx - diamondSize},${yTop}`}
                                  />
                                  <polygon
                                    points={`${cx},${yBot - diamondSize} ${cx + diamondSize},${yBot} ${cx},${yBot + diamondSize} ${cx - diamondSize},${yBot}`}
                                  />
                                </g>
                              );
                            })}
                        </g>
                      );
                    })}
                  </g>

                  {/* 7. Đường cắt đôi trung tâm chuẩn Half-Cut & 3 hộp nối điện Split Junction Box */}
                  <g className="pointer-events-none">
                    <rect
                      x={framePad}
                      y={framePad + halfH}
                      width={innerW}
                      height={splitGap}
                      fill={isInvalid ? '#fca5a5' : '#cbd5e1'}
                      opacity="0.8"
                    />
                    {/* 3 cụm J-Box nhỏ dọc theo đường chia giữa */}
                    {[0.2, 0.5, 0.8].map((pos, jIdx) => (
                      <rect
                        key={`jbox_${jIdx}`}
                        x={framePad + innerW * pos - colW * 0.14}
                        y={framePad + halfH - splitGap * 0.25}
                        width={colW * 0.28}
                        height={splitGap * 1.5}
                        rx={splitGap * 0.3}
                        fill="#475569"
                        stroke="#e2e8f0"
                        strokeWidth={Math.max(0.06, 0.28 * panelScaleRatio)}
                      />
                    ))}
                  </g>

                  {/* 8. Hiệu ứng mặt kính cường lực phản chiếu ánh sáng chéo */}
                  <polygon
                    points={`${framePad},${framePad} ${framePad + innerW},${framePad} ${framePad + innerW * 0.35},${framePad + innerH} ${framePad},${framePad + innerH * 0.7}`}
                    fill="url(#pv-glass-sheen)"
                    className="pointer-events-none"
                  />

                  {/* 9. Đường ghép góc vát 45 độ của khung nhôm */}
                  <g
                    stroke="#64748b"
                    strokeWidth={Math.max(0.08, 0.4 * panelScaleRatio)}
                    opacity="0.7"
                    className="pointer-events-none"
                  >
                    <line x1="0" y1="0" x2={framePad} y2={framePad} />
                    <line x1={rawW} y1="0" x2={rawW - framePad} y2={framePad} />
                    <line x1="0" y1={rawH} x2={framePad} y2={rawH - framePad} />
                    <line x1={rawW} y1={rawH} x2={rawW - framePad} y2={rawH - framePad} />
                  </g>

                  {/* 10. Nhãn số thứ tự tấm pin (#1, #2...) tự động co giãn theo kích thước tấm pin, không bao giờ che khuất tấm pin */}
                  <g className="pointer-events-none select-none">
                    <rect
                      x={rawW / 2 - badgeW / 2}
                      y={rawH / 2 - badgeH / 2}
                      width={badgeW}
                      height={badgeH}
                      rx={Math.min(3.5, badgeH * 0.28)}
                      fill="#090d16"
                      fillOpacity="0.78"
                      stroke={isSelected ? '#fbbf24' : '#38bdf8'}
                      strokeWidth={Math.max(0.12, 0.55 * panelScaleRatio)}
                      strokeOpacity="0.75"
                    />
                    <text
                      x={rawW / 2}
                      y={rawH / 2 + badgeFontSize * 0.34}
                      textAnchor="middle"
                      fontSize={badgeFontSize}
                      className="font-mono fill-amber-300 font-bold"
                    >
                      {labelStr}
                    </text>
                  </g>

                  {/* Cảnh báo vi phạm (tự thu nhỏ theo tấm pin) */}
                  {isInvalid && (
                    <g
                      transform={`translate(${rawW}, 0) scale(${uiHandleScale}) translate(-14, 2)`}
                      className="pointer-events-none"
                    >
                      <rect width="12" height="12" rx="2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                      <text
                        x="6"
                        y="9.5"
                        textAnchor="middle"
                        fontSize="9"
                        className="fill-white font-black"
                      >
                        !
                      </text>
                    </g>
                  )}

                  {/* NÚM XOAY TRỰC TIẾP (Tự co giãn theo kích thước tấm pin) */}
                  {isSelected && (
                    <g
                      transform={`translate(${rawW / 2}, 0) scale(${uiHandleScale})`}
                      className="cursor-crosshair"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="-20"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx="0"
                        cy="-22"
                        r="20"
                        fill="transparent"
                        onPointerDown={(e) => handleRotateHandlePointerDown(e, panel)}
                        className="cursor-grab active:cursor-grabbing"
                      />
                      <circle
                        cx="0"
                        cy="-22"
                        r="8.5"
                        fill="#fbbf24"
                        stroke="#0f172a"
                        strokeWidth="2.2"
                        onPointerDown={(e) => handleRotateHandlePointerDown(e, panel)}
                        className="active:scale-125 transition-transform cursor-grab active:cursor-grabbing"
                      >
                        <title>Kéo chuột hoặc vuốt ngón tay để xoay hướng tấm pin tự do</title>
                      </circle>
                    </g>
                  )}

                  {/* Nút xoay nhanh 90 độ trực tiếp trên tấm pin */}
                  {isSelected && (
                    <g
                      transform={`translate(0, 0) scale(${uiHandleScale}) translate(-9, -9)`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const oldDim = getPanelDimensions(panelSpec, panel.rotationDeg || 0);
                        const nextDeg = ((panel.rotationDeg || 0) + 90) % 360;
                        const newDim = getPanelDimensions(panelSpec, nextDeg);
                        const targetX = Math.round(panel.xMm + (oldDim.width - newDim.width) / 2);
                        const targetY = Math.round(panel.yMm + (oldDim.height - newDim.height) / 2);
                        if (isSnapEnabled) {
                          const rotatedPanel: PlacedPanel = { ...panel, rotationDeg: nextDeg };
                          const resolved = resolvePanelOverlap(
                            targetX,
                            targetY,
                            rotatedPanel,
                            panelSpec,
                            panels,
                            roofWidthMm,
                            roofLengthMm,
                            20,
                            obstacles
                          );
                          onUpdatePanel(panel.id, {
                            xMm: resolved.x,
                            yMm: resolved.y,
                            rotationDeg: nextDeg,
                          });
                        } else {
                          onUpdatePanel(panel.id, {
                            xMm: targetX,
                            yMm: targetY,
                            rotationDeg: nextDeg,
                          });
                        }
                      }}
                      className="cursor-pointer active:scale-90 transition-transform"
                    >
                      <circle r="18" fill="transparent" />
                      <circle r="10" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                        90°
                      </text>
                      <title>Xoay nhanh 90 độ (Dọc / Ngang)</title>
                    </g>
                  )}

                  {/* Nút xóa nhanh trực tiếp trên tấm pin */}
                  {isSelected && onDeletePanel && (
                    <g
                      transform={`translate(${rawW}, 0) scale(${uiHandleScale}) translate(9, -9)`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onDeletePanel(panel.id);
                      }}
                      className="cursor-pointer active:scale-90 transition-transform"
                    >
                      <circle r="18" fill="transparent" />
                      <circle r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                      <path
                        d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <title>Xóa tấm pin này</title>
                    </g>
                  )}

                  {/* Nút nhân bản nhanh tấm pin */}
                  {isSelected && onDuplicatePanel && (
                    <g
                      transform={`translate(0, ${rawH}) scale(${uiHandleScale}) translate(-9, 9)`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onDuplicatePanel(panel.id);
                      }}
                      className="cursor-pointer active:scale-90 transition-transform"
                    >
                      <circle r="18" fill="transparent" />
                      <circle r="10" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      <path
                        d="M 0 -3.5 L 0 3.5 M -3.5 0 L 3.5 0"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <title>Nhân bản tấm pin này</title>
                    </g>
                  )}

                  {/* Tọa độ hiển thị */}
                  {isSelected && (
                    <g
                      transform={`translate(${rawW / 2}, ${rawH}) scale(${uiHandleScale}) translate(0, 12)`}
                      className="pointer-events-none"
                    >
                      <rect
                        x="-62"
                        y="-9"
                        width="124"
                        height="17"
                        rx="4"
                        fill="#0f172a"
                        stroke="#fbbf24"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fontSize="7.5"
                        className="font-mono fill-amber-300 font-semibold"
                      >
                        {panel.xMm},{panel.yMm} mm | {rotation}°
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
