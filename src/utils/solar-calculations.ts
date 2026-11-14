/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BatterySpec,
  InverterSpec,
  Obstacle,
  PanelSpec,
  PlacedPanel,
  RoofConfig,
  SystemMetrics,
} from '../types/solar';
import { REGIONAL_SOLAR_HOURS } from '../data/solar-presets';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Tính diện tích hình học thô của mái (m²)
 */
export function calculateRoofArea(roof: RoofConfig): number {
  if (roof.shape === 'rectangle') {
    return roof.widthM * roof.lengthM;
  }
  if (roof.shape === 'l_shape') {
    const full = roof.widthM * roof.lengthM;
    const cut = (roof.cutWidthM || 0) * (roof.cutLengthM || 0);
    return Math.max(0, full - cut);
  }
  if (roof.shape === 'trapezoid') {
    const topW = roof.topWidthM || roof.widthM * 0.6;
    return ((topW + roof.widthM) / 2) * roof.lengthM;
  }
  return roof.widthM * roof.lengthM;
}

/**
 * Lấy kích thước thực tế bao quanh (Bounding box) của tấm pin sau khi xoay (mm)
 */
export function getPanelDimensions(spec: PanelSpec, rotationDeg: number): { width: number; height: number } {
  const normDeg = ((rotationDeg % 360) + 360) % 360;
  if (normDeg === 0 || normDeg === 180) {
    return { width: spec.widthMm, height: spec.lengthMm };
  }
  if (normDeg === 90 || normDeg === 270) {
    return { width: spec.lengthMm, height: spec.widthMm };
  }
  const rad = (normDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: Math.round(spec.widthMm * cos + spec.lengthMm * sin),
    height: Math.round(spec.widthMm * sin + spec.lengthMm * cos),
  };
}

/**
 * Lấy bounding box của tấm pin (mm)
 */
export function getPanelBoundingBox(panel: PlacedPanel, spec: PanelSpec): BoundingBox {
  const { width, height } = getPanelDimensions(spec, panel.rotationDeg);
  return {
    minX: panel.xMm,
    minY: panel.yMm,
    maxX: panel.xMm + width,
    maxY: panel.yMm + height,
  };
}

/**
 * Kiểm tra 1 điểm (X, Y tính bằng mm) có nằm hoàn toàn trong mái nhà hay không
 */
export function isPointInsideRoof(xMm: number, yMm: number, roof: RoofConfig, marginMm: number = 0): boolean {
  const totalWidthMm = roof.widthM * 1000;
  const totalLengthMm = roof.lengthM * 1000;

  if (xMm < marginMm || yMm < marginMm) return false;
  if (xMm > totalWidthMm - marginMm || yMm > totalLengthMm - marginMm) return false;

  if (roof.shape === 'l_shape') {
    const cutWMm = (roof.cutWidthM || 0) * 1000;
    const cutLMm = (roof.cutLengthM || 0) * 1000;
    // Góc khuyết ở góc trên bên phải
    if (xMm > totalWidthMm - cutWMm + marginMm && yMm < cutLMm - marginMm) {
      return false;
    }
  }

  if (roof.shape === 'trapezoid') {
    const topWMm = (roof.topWidthM || roof.widthM * 0.6) * 1000;
    const diff = (totalWidthMm - topWMm) / 2;
    // Độ dốc 2 cạnh bên theo y
    const progress = yMm / totalLengthMm;
    const leftLimit = diff * (1 - progress) + marginMm;
    const rightLimit = totalWidthMm - diff * (1 - progress) - marginMm;
    if (xMm < leftLimit || xMm > rightLimit) {
      return false;
    }
  }

  return true;
}

/**
 * Kiểm tra xem tấm pin có nằm trọn trong vùng an toàn của mái không
 */
export function isPanelWithinRoof(panel: PlacedPanel, spec: PanelSpec, roof: RoofConfig): boolean {
  const box = getPanelBoundingBox(panel, spec);
  const setbackMm = roof.setbackM * 1000;

  // Kiểm tra 4 góc của tấm pin
  const corners = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.minX, y: box.maxY },
    { x: box.maxX, y: box.maxY },
  ];

  return corners.every((c) => isPointInsideRoof(c.x, c.y, roof, setbackMm));
}

/**
 * Kiểm tra va chạm giữa 2 bounding box AABB
 */
export function doBoxesIntersect(b1: BoundingBox, b2: BoundingBox): boolean {
  return !(b1.maxX <= b2.minX || b1.minX >= b2.maxX || b1.maxY <= b2.minY || b1.minY >= b2.maxY);
}

/**
 * Lấy bounding box của vật cản (có tính góc xoay nếu có)
 */
export function getObstacleBoundingBox(obs: Obstacle): BoundingBox {
  const rot = ((obs.rotationDeg || 0) % 360 + 360) % 360;
  let w = obs.widthMm;
  let l = obs.lengthMm;
  if (rot === 90 || rot === 270) {
    w = obs.lengthMm;
    l = obs.widthMm;
  } else if (rot !== 0 && rot !== 180) {
    const rad = (rot * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    w = Math.round(obs.widthMm * cos + obs.lengthMm * sin);
    l = Math.round(obs.widthMm * sin + obs.lengthMm * cos);
  }
  return {
    minX: obs.xMm,
    minY: obs.yMm,
    maxX: obs.xMm + w,
    maxY: obs.yMm + l,
  };
}

/**
 * Kiểm tra xem tấm pin có bị va chạm với chướng ngại vật nào không
 */
export function doesPanelCollideWithObstacles(panel: PlacedPanel, spec: PanelSpec, obstacles: Obstacle[]): boolean {
  const panelBox = getPanelBoundingBox(panel, spec);
  for (const obs of obstacles) {
    const obsBox = getObstacleBoundingBox(obs);
    if (doBoxesIntersect(panelBox, obsBox)) {
      return true;
    }
  }
  return false;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guideX?: number; // Tọa độ X để vẽ đường gióng thẳng hàng
  guideY?: number; // Tọa độ Y để vẽ đường gióng thẳng hàng
  snapLabel?: string; // Thông báo trạng thái khớp
}

/**
 * Kiểm tra va chạm giữa 2 bounding box có tính khoảng cách khe hở tối thiểu (mặc định 20mm)
 */
export function doBoxesOverlapWithGap(b1: BoundingBox, b2: BoundingBox, minGapMm: number = 20): boolean {
  const gap = Math.max(0, minGapMm - 0.5);
  return !(
    b1.maxX + gap <= b2.minX ||
    b1.minX >= b2.maxX + gap ||
    b1.maxY + gap <= b2.minY ||
    b1.minY >= b2.maxY + gap
  );
}

/**
 * Kiểm tra xem tấm pin có bị trùng đè hoặc vi phạm khoảng hở tối thiểu với tấm pin khác không
 */
export function doesPanelCollideWithOtherPanels(
  panel: PlacedPanel,
  spec: PanelSpec,
  allPanels: PlacedPanel[],
  minGapMm: number = 0
): boolean {
  const panelBox = getPanelBoundingBox(panel, spec);
  for (const other of allPanels) {
    if (other.id === panel.id) continue;
    const otherBox = getPanelBoundingBox(other, spec);
    if (minGapMm > 0 ? doBoxesOverlapWithGap(panelBox, otherBox, minGapMm) : doBoxesIntersect(panelBox, otherBox)) {
      return true;
    }
  }
  return false;
}

/**
 * Tự động đẩy tấm pin ra vị trí hợp lệ gần nhất (cách đúng 20mm) nếu vị trí hiện tại bị chồng lên tấm pin khác hoặc vật cản
 */
export function resolvePanelOverlap(
  candidateX: number,
  candidateY: number,
  movingPanel: PlacedPanel,
  spec: PanelSpec,
  allPanels: PlacedPanel[],
  roofWidthMm: number = 50000,
  roofLengthMm: number = 50000,
  minGapMm: number = 20,
  obstacles: Obstacle[] = []
): { x: number; y: number; adjusted: boolean } {
  const { width, height } = getPanelDimensions(spec, movingPanel.rotationDeg || 0);
  const maxX = Math.max(0, roofWidthMm - width);
  const maxY = Math.max(0, roofLengthMm - height);

  const clampedX = Math.max(0, Math.min(Math.round(candidateX), maxX));
  const clampedY = Math.max(0, Math.min(Math.round(candidateY), maxY));

  const others = allPanels.filter((p) => p.id !== movingPanel.id);
  const panelBoxes = others.map((other) => getPanelBoundingBox(other, spec));
  const obstacleBoxes = obstacles.map((obs) => getObstacleBoundingBox(obs));
  const blockingBoxes: BoundingBox[] = [...panelBoxes, ...obstacleBoxes];

  const isPositionFree = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x > maxX || y > maxY) return false;
    const box: BoundingBox = {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
    };
    for (const oBox of blockingBoxes) {
      if (doBoxesOverlapWithGap(box, oBox, minGapMm)) {
        return false;
      }
    }
    return true;
  };

  if (isPositionFree(clampedX, clampedY)) {
    return { x: clampedX, y: clampedY, adjusted: false };
  }

  // Sinh danh sách các vị trí ứng viên cách đúng minGapMm (20mm) quanh các tấm pin và vật cản hiện có
  const candidates: Array<{ x: number; y: number }> = [];

  for (const oBox of blockingBoxes) {
    const leftX = oBox.minX - width - minGapMm;
    const rightX = oBox.maxX + minGapMm;
    const topY = oBox.minY - height - minGapMm;
    const bottomY = oBox.maxY + minGapMm;

    // Ứng viên trượt theo trục hiện tại và căn thẳng mép với tấm khác / vật cản
    const yOptions = [clampedY, oBox.minY, oBox.maxY - height];
    const xOptions = [clampedX, oBox.minX, oBox.maxX - width];

    for (const yOpt of yOptions) {
      candidates.push({ x: leftX, y: yOpt });
      candidates.push({ x: rightX, y: yOpt });
    }
    for (const xOpt of xOptions) {
      candidates.push({ x: xOpt, y: topY });
      candidates.push({ x: xOpt, y: bottomY });
    }
  }

  // Kết hợp tọa độ X/Y giữa các tấm pin & vật cản khi xếp thành cụm
  for (let i = 0; i < blockingBoxes.length; i++) {
    const bx = blockingBoxes[i];
    const xSet = [bx.minX - width - minGapMm, bx.minX, bx.maxX - width, bx.maxX + minGapMm];
    for (let j = 0; j < blockingBoxes.length; j++) {
      const by = blockingBoxes[j];
      const ySet = [by.minY - height - minGapMm, by.minY, by.maxY - height, by.maxY + minGapMm];
      for (const cx of xSet) {
        for (const cy of ySet) {
          candidates.push({ x: cx, y: cy });
        }
      }
    }
  }

  let bestCandidate: { x: number; y: number } | null = null;
  let minDistance = Infinity;

  for (const cand of candidates) {
    const rx = Math.round(cand.x);
    const ry = Math.round(cand.y);
    if (isPositionFree(rx, ry)) {
      const dist = Math.hypot(rx - clampedX, ry - clampedY);
      if (dist < minDistance) {
        minDistance = dist;
        bestCandidate = { x: rx, y: ry };
      }
    }
  }

  if (bestCandidate) {
    return { x: bestCandidate.x, y: bestCandidate.y, adjusted: true };
  }

  // Dự phòng: Quét lưới trên mặt bằng để tìm vị trí trống gần nhất
  const stepX = Math.max(100, Math.round((width + minGapMm) / 4));
  const stepY = Math.max(100, Math.round((height + minGapMm) / 4));
  for (let gy = 0; gy <= maxY; gy += stepY) {
    for (let gx = 0; gx <= maxX; gx += stepX) {
      if (isPositionFree(gx, gy)) {
        const dist = Math.hypot(gx - clampedX, gy - clampedY);
        if (dist < minDistance) {
          minDistance = dist;
          bestCandidate = { x: gx, y: gy };
        }
      }
    }
  }

  if (bestCandidate) {
    return { x: bestCandidate.x, y: bestCandidate.y, adjusted: true };
  }

  return { x: clampedX, y: clampedY, adjusted: false };
}

/**
 * Tự động khớp vị trí vật cản cách 20mm và chống đè lên các tấm pin hoặc vật cản khác
 */
export function resolveObstacleOverlap(
  candidateX: number,
  candidateY: number,
  movingObstacle: Obstacle,
  allObstacles: Obstacle[],
  allPanels: PlacedPanel[],
  spec: PanelSpec,
  roofWidthMm: number = 50000,
  roofLengthMm: number = 50000,
  minGapMm: number = 20
): { x: number; y: number; adjusted: boolean } {
  const tempObs: Obstacle = { ...movingObstacle, xMm: 0, yMm: 0 };
  const tempBox = getObstacleBoundingBox(tempObs);
  const width = tempBox.maxX - tempBox.minX;
  const height = tempBox.maxY - tempBox.minY;

  const maxX = Math.max(0, roofWidthMm - width);
  const maxY = Math.max(0, roofLengthMm - height);

  const clampedX = Math.max(0, Math.min(Math.round(candidateX), maxX));
  const clampedY = Math.max(0, Math.min(Math.round(candidateY), maxY));

  const otherObs = allObstacles.filter((o) => o.id !== movingObstacle.id);
  const blockingBoxes: BoundingBox[] = [
    ...otherObs.map((o) => getObstacleBoundingBox(o)),
    ...allPanels.map((p) => getPanelBoundingBox(p, spec)),
  ];

  const isPositionFree = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x > maxX || y > maxY) return false;
    const box: BoundingBox = {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
    };
    for (const oBox of blockingBoxes) {
      if (doBoxesOverlapWithGap(box, oBox, minGapMm)) {
        return false;
      }
    }
    return true;
  };

  if (isPositionFree(clampedX, clampedY)) {
    return { x: clampedX, y: clampedY, adjusted: false };
  }

  const candidates: Array<{ x: number; y: number }> = [];
  for (const oBox of blockingBoxes) {
    const leftX = oBox.minX - width - minGapMm;
    const rightX = oBox.maxX + minGapMm;
    const topY = oBox.minY - height - minGapMm;
    const bottomY = oBox.maxY + minGapMm;

    const yOptions = [clampedY, oBox.minY, oBox.maxY - height];
    const xOptions = [clampedX, oBox.minX, oBox.maxX - width];

    for (const yOpt of yOptions) {
      candidates.push({ x: leftX, y: yOpt });
      candidates.push({ x: rightX, y: yOpt });
    }
    for (const xOpt of xOptions) {
      candidates.push({ x: xOpt, y: topY });
      candidates.push({ x: xOpt, y: bottomY });
    }
  }

  let bestCandidate: { x: number; y: number } | null = null;
  let minDistance = Infinity;

  for (const cand of candidates) {
    const rx = Math.round(cand.x);
    const ry = Math.round(cand.y);
    if (isPositionFree(rx, ry)) {
      const dist = Math.hypot(rx - clampedX, ry - clampedY);
      if (dist < minDistance) {
        minDistance = dist;
        bestCandidate = { x: rx, y: ry };
      }
    }
  }

  if (bestCandidate) {
    return { x: bestCandidate.x, y: bestCandidate.y, adjusted: true };
  }

  return { x: clampedX, y: clampedY, adjusted: false };
}

/**
 * Tự động hút/khớp (Magnetic Snap) vị trí tấm pin luôn cố định ở khe hở 20mm
 * Hỗ trợ khớp chính xác giữa tấm nằm ngang (90°), tấm nằm dọc (0°) và các vật cản trên mái
 */
export function findMagneticSnap(
  candidateX: number,
  candidateY: number,
  movingPanel: PlacedPanel,
  allPanels: PlacedPanel[],
  spec: PanelSpec,
  snapThresholdMm: number = 180,
  clampGapMm: number = 20,
  roofWidthMm: number = 50000,
  roofLengthMm: number = 50000,
  obstacles: Obstacle[] = []
): SnapResult {
  const fixedGapMm = 20; // Luôn cố định khe hở tự khớp ở 20mm
  let bestX = candidateX;
  let bestY = candidateY;
  let minDiffX = snapThresholdMm + 1;
  let minDiffY = snapThresholdMm + 1;
  let snappedX = false;
  let snappedY = false;
  let guideX: number | undefined;
  let guideY: number | undefined;
  let snapLabel: string | undefined;

  const currentDim = getPanelDimensions(spec, movingPanel.rotationDeg || 0);
  const w = currentDim.width;
  const h = currentDim.height;

  // Danh sách toàn bộ mục tiêu có thể khớp cạnh 20mm: Các tấm pin khác (dọc/ngang) + Các vật cản
  const targets: Array<{ box: BoundingBox; isObstacle: boolean; name?: string }> = [];

  for (const other of allPanels) {
    if (other.id === movingPanel.id) continue;
    targets.push({
      box: getPanelBoundingBox(other, spec),
      isObstacle: false,
    });
  }

  for (const obs of obstacles) {
    targets.push({
      box: getObstacleBoundingBox(obs),
      isObstacle: true,
      name: obs.name,
    });
  }

  // BƯỚC 1: Kiểm tra khớp khoảng hở trực tiếp 20mm (Trái / Phải / Trên / Dưới) với các tấm pin & vật cản ở gần
  for (const target of targets) {
    const tBox = target.box;
    const prefix = target.isObstacle ? 'Khớp cách vật cản' : 'Tự khớp cạnh';

    // Phạm vi lân cận theo trục Y để bắt khớp ngang (X)
    const yNear =
      candidateY + h >= tBox.minY - snapThresholdMm &&
      candidateY <= tBox.maxY + snapThresholdMm;

    if (yNear) {
      // Khớp bên phải mục tiêu (cách đúng 20mm)
      const rightSnap = tBox.maxX + fixedGapMm;
      const diffRight = Math.abs(candidateX - rightSnap);
      if (diffRight < minDiffX) {
        minDiffX = diffRight;
        bestX = rightSnap;
        snappedX = true;
        guideX = rightSnap;
        snapLabel = `${prefix} (${fixedGapMm}mm)`;
      }

      // Khớp bên trái mục tiêu (cách đúng 20mm)
      const leftSnap = tBox.minX - w - fixedGapMm;
      const diffLeft = Math.abs(candidateX - leftSnap);
      if (diffLeft < minDiffX) {
        minDiffX = diffLeft;
        bestX = leftSnap;
        snappedX = true;
        guideX = tBox.minX;
        snapLabel = `${prefix} (${fixedGapMm}mm)`;
      }
    }

    // Phạm vi lân cận theo trục X để bắt khớp dọc (Y)
    const xNear =
      candidateX + w >= tBox.minX - snapThresholdMm &&
      candidateX <= tBox.maxX + snapThresholdMm;

    if (xNear) {
      // Khớp phía dưới mục tiêu (cách đúng 20mm)
      const bottomSnap = tBox.maxY + fixedGapMm;
      const diffBottom = Math.abs(candidateY - bottomSnap);
      if (diffBottom < minDiffY) {
        minDiffY = diffBottom;
        bestY = bottomSnap;
        snappedY = true;
        guideY = bottomSnap;
        snapLabel = `${prefix} (${fixedGapMm}mm)`;
      }

      // Khớp phía trên mục tiêu (cách đúng 20mm)
      const topSnap = tBox.minY - h - fixedGapMm;
      const diffTop = Math.abs(candidateY - topSnap);
      if (diffTop < minDiffY) {
        minDiffY = diffTop;
        bestY = topSnap;
        snappedY = true;
        guideY = tBox.minY;
        snapLabel = `${prefix} (${fixedGapMm}mm)`;
      }
    }
  }

  // BƯỚC 2: Căn thẳng hàng các mép (Trái/Phải/Trên/Dưới) sau khi đã xác định vị trí khớp 20mm ở Bước 1
  for (const target of targets) {
    const tBox = target.box;

    // Kiểm tra theo bestY hiện tại xem có tách biệt hoàn toàn (tối thiểu 20mm) theo phương dọc với mục tiêu không
    const ySeparatedWithGap =
      bestY + h + fixedGapMm - 0.5 <= tBox.minY ||
      bestY >= tBox.maxY + fixedGapMm - 0.5;

    if (ySeparatedWithGap) {
      // Căn thẳng mép trái
      const alignLeft = tBox.minX;
      const diffAlignLeft = Math.abs(candidateX - alignLeft);
      if (diffAlignLeft < minDiffX) {
        minDiffX = diffAlignLeft;
        bestX = alignLeft;
        snappedX = true;
        guideX = alignLeft;
        if (!snapLabel) snapLabel = `Căn thẳng mép trái (khe ${fixedGapMm}mm)`;
      }

      // Căn thẳng mép phải
      const alignRight = tBox.maxX - w;
      const diffAlignRight = Math.abs(candidateX - alignRight);
      if (diffAlignRight < minDiffX) {
        minDiffX = diffAlignRight;
        bestX = alignRight;
        snappedX = true;
        guideX = tBox.maxX;
        if (!snapLabel) snapLabel = `Căn thẳng mép phải (khe ${fixedGapMm}mm)`;
      }
    }

    // Kiểm tra theo bestX hiện tại xem có tách biệt hoàn toàn (tối thiểu 20mm) theo phương ngang với mục tiêu không
    const xSeparatedWithGap =
      bestX + w + fixedGapMm - 0.5 <= tBox.minX ||
      bestX >= tBox.maxX + fixedGapMm - 0.5;

    if (xSeparatedWithGap) {
      // Căn thẳng mép trên
      const alignTop = tBox.minY;
      const diffAlignTop = Math.abs(candidateY - alignTop);
      if (diffAlignTop < minDiffY) {
        minDiffY = diffAlignTop;
        bestY = alignTop;
        snappedY = true;
        guideY = alignTop;
        if (!snapLabel) snapLabel = `Căn thẳng mép trên (khe ${fixedGapMm}mm)`;
      }

      // Căn thẳng mép dưới
      const alignBottom = tBox.maxY - h;
      const diffAlignBottom = Math.abs(candidateY - alignBottom);
      if (diffAlignBottom < minDiffY) {
        minDiffY = diffAlignBottom;
        bestY = alignBottom;
        snappedY = true;
        guideY = tBox.maxY;
        if (!snapLabel) snapLabel = `Căn thẳng mép dưới (khe ${fixedGapMm}mm)`;
      }
    }
  }

  // BƯỚC 3: Đảm bảo tuyệt đối không chồng đè lên bất kỳ tấm pin (dọc/ngang) hay vật cản nào và giữ khe hở >= 20mm
  const resolved = resolvePanelOverlap(
    bestX,
    bestY,
    movingPanel,
    spec,
    allPanels,
    roofWidthMm,
    roofLengthMm,
    fixedGapMm,
    obstacles
  );

  if (resolved.adjusted) {
    bestX = resolved.x;
    bestY = resolved.y;
    snappedX = true;
    snappedY = true;
    snapLabel = `Tự khớp khe ${fixedGapMm}mm (Chống chồng đè)`;
  }

  return {
    x: bestX,
    y: bestY,
    snappedX,
    snappedY,
    guideX: snappedX ? guideX : undefined,
    guideY: snappedY ? guideY : undefined,
    snapLabel: (snappedX || snappedY) ? snapLabel : undefined,
  };
}

/**
 * Tạo mảng pin (Solar Array Grid)
 */
export function generatePanelGrid(
  rows: number,
  cols: number,
  startX: number,
  startY: number,
  spec: PanelSpec,
  rotationDeg: number = 0,
  rowGapMm: number = 20,
  colGapMm: number = 20
): PlacedPanel[] {
  const panels: PlacedPanel[] = [];
  const { width, height } = getPanelDimensions(spec, rotationDeg);
  const safeRowGap = Math.max(20, rowGapMm);
  const safeColGap = Math.max(20, colGapMm);

  let counter = Date.now();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (width + safeColGap);
      const y = startY + r * (height + safeRowGap);
      panels.push({
        id: `panel_${counter++}_${r}_${c}`,
        xMm: Math.round(x),
        yMm: Math.round(y),
        rotationDeg,
        stringId: 1,
      });
    }
  }
  return panels;
}

/**
 * Tự động tính toán số tấm pin tối đa có thể xếp vừa mái (Auto-Fill Optimization)
 */
export function autoFillRoofPanels(
  roof: RoofConfig,
  spec: PanelSpec,
  obstacles: Obstacle[],
  orientation: 'portrait' | 'landscape' = 'portrait',
  gapMm: number = 20
): PlacedPanel[] {
  const rotationDeg = orientation === 'portrait' ? 0 : 90;
  const { width, height } = getPanelDimensions(spec, rotationDeg);
  const setbackMm = Math.max(300, roof.setbackM * 1000);
  const safeGapMm = Math.max(20, gapMm);

  const roofWMm = roof.widthM * 1000;
  const roofLMm = roof.lengthM * 1000;

  const result: PlacedPanel[] = [];
  let idGen = 1;

  for (let y = setbackMm; y + height <= roofLMm - setbackMm; y += height + safeGapMm) {
    for (let x = setbackMm; x + width <= roofWMm - setbackMm; x += width + safeGapMm) {
      const candidate: PlacedPanel = {
        id: `auto_${idGen++}`,
        xMm: Math.round(x),
        yMm: Math.round(y),
        rotationDeg,
        stringId: Math.ceil(result.length / 14) + 1,
      };

      // Kiểm tra có nằm trong mái & không va chạm chướng ngại vật
      if (
        isPanelWithinRoof(candidate, spec, roof) &&
        !doesPanelCollideWithObstacles(candidate, spec, obstacles)
      ) {
        result.push(candidate);
      }
    }
  }

  return result;
}

/**
 * Tính toán toàn bộ thông số kỹ thuật của hệ thống điện mặt trời
 */
export function calculateSystemMetrics(
  roof: RoofConfig,
  panels: PlacedPanel[],
  panelSpec: PanelSpec,
  inverter: InverterSpec,
  battery: BatterySpec,
  dailyCriticalLoadKwh: number = 10,
  electricityPriceVnd: number = 2800
): SystemMetrics {
  const validPanels = panels.filter((p) => !p.isInvalid);
  const totalPanels = validPanels.length;

  const totalDcPowerKwp = (totalPanels * panelSpec.powerWp) / 1000;
  const singlePanelAreaM2 = (panelSpec.lengthMm * panelSpec.widthMm) / 1_000_000;
  const totalPanelAreaM2 = totalPanels * singlePanelAreaM2;

  const roofGrossAreaM2 = calculateRoofArea(roof);
  // Diện tích khả dụng trừ khoảng lùi an toàn
  const netWidth = Math.max(0, roof.widthM - 2 * roof.setbackM);
  const netLength = Math.max(0, roof.lengthM - 2 * roof.setbackM);
  const roofNetUsableAreaM2 = Math.min(roofGrossAreaM2, netWidth * netLength);

  const coveragePct = roofGrossAreaM2 > 0 ? Math.min(100, (totalPanelAreaM2 / roofGrossAreaM2) * 100) : 0;

  // DC/AC Ratio = Công suất tấm pin DC (kWp) / Công suất định mức Inverter (kW)
  const dcAcRatio = inverter.ratedPowerKw > 0 ? totalDcPowerKwp / inverter.ratedPowerKw : 0;

  let dcAcStatus: 'under' | 'optimal' | 'high' | 'overload' = 'optimal';
  if (dcAcRatio < 0.8) dcAcStatus = 'under';
  else if (dcAcRatio <= 1.3) dcAcStatus = 'optimal';
  else if (dcAcRatio <= 1.5) dcAcStatus = 'high';
  else dcAcStatus = 'overload';

  // Sản lượng điện dựa theo bức xạ miền
  const regionData = REGIONAL_SOLAR_HOURS[roof.region] || REGIONAL_SOLAR_HOURS.south;
  const basePsh = regionData.peakSunHours;

  // Hiệu chỉnh theo góc nghiêng và hướng mái (Hệ số tối ưu)
  let tiltFactor = 1.0;
  if (roof.slopeDeg >= 10 && roof.slopeDeg <= 20) {
    tiltFactor = 1.02; // Tối ưu tại VN
  } else if (roof.slopeDeg > 35) {
    tiltFactor = 0.94;
  }

  // Góc phương vị: Chính Nam (180°) là tối ưu nhất tại Việt Nam
  const azimuthDiff = Math.abs(roof.azimuthDeg - 180);
  const azimuthFactor = Math.max(0.85, 1.0 - (azimuthDiff / 180) * 0.15);

  const systemPerformanceRatio = 0.82; // PR = 82% tính hao tổn nhiệt độ, bụi bẩn, dây dẫn, biến tần
  const effectivePsh = basePsh * tiltFactor * azimuthFactor;

  const dailyGenerationKwh = totalDcPowerKwp * effectivePsh * systemPerformanceRatio;
  const monthlyGenerationKwh = dailyGenerationKwh * 30.4;
  const annualGenerationKwh = dailyGenerationKwh * 365;

  const annualCo2ReductionKg = annualGenerationKwh * regionData.co2KgPerKwh;
  const equivalentTreesPlanted = Math.round(annualCo2ReductionKg / 20); // 1 cây hấp thụ ~20kg CO2/năm

  const isGridTie = inverter.type === 'grid_tie';

  // Pin lưu trữ: nếu là inverter bám tải (grid_tie / không lưu trữ) thì xóa bỏ thông số pin lưu trữ
  const batteryTotalKwh = isGridTie ? 0 : (battery.capacityKwh || 0) * (battery.quantity || 1);
  const batteryUsableKwh = isGridTie ? 0 : (batteryTotalKwh * (battery.maxDodPct || 90)) / 100;

  // Thời gian cấp điện dự phòng cho tải quan trọng (giờ)
  const hourlyLoad = dailyCriticalLoadKwh > 0 ? dailyCriticalLoadKwh / 24 : 0.5;
  const batteryAutonomyHours = isGridTie ? 0 : (hourlyLoad > 0 ? batteryUsableKwh / hourlyLoad : 0);

  const estimatedAnnualSavingsVnd = 0;

  return {
    totalPanels,
    totalDcPowerKwp: Number(totalDcPowerKwp.toFixed(2)),
    totalPanelAreaM2: Number(totalPanelAreaM2.toFixed(1)),
    roofGrossAreaM2: Number(roofGrossAreaM2.toFixed(1)),
    roofNetUsableAreaM2: Number(roofNetUsableAreaM2.toFixed(1)),
    coveragePct: Number(coveragePct.toFixed(1)),
    dcAcRatio: Number(dcAcRatio.toFixed(2)),
    dcAcStatus,
    dailyPeakSunHours: Number(effectivePsh.toFixed(2)),
    dailyGenerationKwh: Number(dailyGenerationKwh.toFixed(1)),
    monthlyGenerationKwh: Number(monthlyGenerationKwh.toFixed(0)),
    annualGenerationKwh: Number(annualGenerationKwh.toFixed(0)),
    annualCo2ReductionKg: Number(annualCo2ReductionKg.toFixed(0)),
    equivalentTreesPlanted,
    batteryTotalKwh: Number(batteryTotalKwh.toFixed(2)),
    batteryUsableKwh: Number(batteryUsableKwh.toFixed(2)),
    batteryAutonomyHours: Number(batteryAutonomyHours.toFixed(1)),
    estimatedAnnualSavingsVnd: Math.round(estimatedAnnualSavingsVnd),
  };
}
