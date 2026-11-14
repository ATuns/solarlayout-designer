/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoofArea,
  getPanelDimensions,
  getPanelBoundingBox,
  doBoxesIntersect,
  isPointInsideRoof,
  isPanelWithinRoof,
  generatePanelGrid,
  calculateSystemMetrics,
  findMagneticSnap,
  getObstacleBoundingBox,
} from './solar-calculations';
import { PanelSpec, RoofConfig, InverterSpec, BatterySpec } from '../types/solar';

const mockPanelSpec: PanelSpec = {
  id: 'test_panel',
  name: 'Test 585W',
  brand: 'LONGi',
  lengthMm: 2278,
  widthMm: 1134,
  thicknessMm: 30,
  powerWp: 585,
  efficiencyPct: 22.6,
  voc: 52.4,
  isc: 14.15,
  weightKg: 27.5,
};

const mockRoof: RoofConfig = {
  shape: 'rectangle',
  widthM: 10,
  lengthM: 8,
  slopeDeg: 15,
  azimuthDeg: 180,
  material: 'ton_song',
  setbackM: 0.5,
  region: 'south',
};

const mockInverter: InverterSpec = {
  name: 'Deye 12kW Hybrid',
  brand: 'Deye',
  ratedPowerKw: 12.0,
  type: 'hybrid',
  maxDcPowerKw: 15.6,
  mpptCount: 2,
  efficiencyPct: 97.6,
  maxDcVoltageV: 800,
  startVoltageV: 160,
};

const mockBattery: BatterySpec = {
  name: 'Dyness 10.24kWh',
  brand: 'Dyness',
  capacityKwh: 10.24,
  usableCapacityKwh: 9.21,
  voltageV: 51.2,
  capacityAh: 200,
  chemistry: 'lifepo4',
  maxDodPct: 90,
  cycleLife: 6000,
  maxDischargeKw: 5.12,
  quantity: 1,
};

test('calculateRoofArea computes correct area for rectangular and shaped roofs', () => {
  const rectArea = calculateRoofArea(mockRoof);
  assert.equal(rectArea, 80);

  const lRoof: RoofConfig = {
    ...mockRoof,
    shape: 'l_shape',
    cutWidthM: 3,
    cutLengthM: 4,
  };
  const lArea = calculateRoofArea(lRoof);
  assert.equal(lArea, 80 - 12); // 68 m²

  const trapRoof: RoofConfig = {
    ...mockRoof,
    shape: 'trapezoid',
    topWidthM: 6,
  };
  const trapArea = calculateRoofArea(trapRoof);
  assert.equal(trapArea, ((6 + 10) / 2) * 8); // 64 m²
});

test('getPanelDimensions handles rotation correctly', () => {
  const portrait = getPanelDimensions(mockPanelSpec, 0);
  assert.equal(portrait.width, 1134);
  assert.equal(portrait.height, 2278);

  const landscape = getPanelDimensions(mockPanelSpec, 90);
  assert.equal(landscape.width, 2278);
  assert.equal(landscape.height, 1134);
});

test('doBoxesIntersect accurately detects overlapping bounding boxes', () => {
  const boxA = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  const boxB = { minX: 50, minY: 50, maxX: 150, maxY: 150 };
  const boxC = { minX: 200, minY: 200, maxX: 300, maxY: 300 };

  assert.equal(doBoxesIntersect(boxA, boxB), true);
  assert.equal(doBoxesIntersect(boxA, boxC), false);
});

test('isPanelWithinRoof validates safe roof margins', () => {
  // Panel safely inside 10m x 8m roof with 0.5m setback
  const validPanel = {
    id: 'p1',
    xMm: 1000,
    yMm: 1000,
    rotationDeg: 0,
  };
  assert.equal(isPanelWithinRoof(validPanel, mockPanelSpec, mockRoof), true);

  // Panel violating setback margin (too close to edge)
  const edgePanel = {
    id: 'p2',
    xMm: 200,
    yMm: 1000,
    rotationDeg: 0,
  };
  assert.equal(isPanelWithinRoof(edgePanel, mockPanelSpec, mockRoof), false);
});

test('generatePanelGrid produces correct number of panels and coordinates', () => {
  const grid = generatePanelGrid(2, 3, 1000, 1000, mockPanelSpec, 0, 20, 20);
  assert.equal(grid.length, 6);
  assert.equal(grid[0].xMm, 1000);
  assert.equal(grid[0].yMm, 1000);
  // Column 1 should be shifted by panel width + gap: 1000 + 1134 + 20 = 2154
  assert.equal(grid[1].xMm, 2154);
});

test('calculateSystemMetrics computes capacity, DC/AC ratio, generation and battery autonomy', () => {
  const panels = generatePanelGrid(2, 10, 1000, 1000, mockPanelSpec, 0); // 20 panels
  const metrics = calculateSystemMetrics(mockRoof, panels, mockPanelSpec, mockInverter, mockBattery, 12, 2800);

  assert.equal(metrics.totalPanels, 20);
  // 20 * 585W = 11,700W = 11.7 kWp
  assert.equal(metrics.totalDcPowerKwp, 11.7);
  // DC/AC ratio: 11.7 / 12.0 ≈ 0.975 (optimal)
  assert.ok(metrics.dcAcRatio >= 0.95 && metrics.dcAcRatio <= 1.0);
  assert.equal(metrics.dcAcStatus, 'optimal');
  // Daily generation must be positive
  assert.ok(metrics.dailyGenerationKwh > 30);
  assert.ok(metrics.annualGenerationKwh > 10000);
  // Battery autonomy hours for 12 kWh daily load with ~9.2 kWh usable:
  // 12 kWh / 24h = 0.5 kW load. 9.21 kWh / 0.5 kW ~ 18.4 hours
  assert.ok(metrics.batteryAutonomyHours > 15);
});

test('findMagneticSnap automatically snaps panel when placed close to another panel', () => {
  const panelA = { id: 'pA', xMm: 1000, yMm: 1000, rotationDeg: 0 };
  
  // 1. Kiểm tra khớp theo khe kẹp 20mm (khi đưa lại gần 2154 mm)
  const movingNearClamp = { id: 'pB', xMm: 2150, yMm: 1020, rotationDeg: 0 };
  const snapClamp = findMagneticSnap(movingNearClamp.xMm, movingNearClamp.yMm, movingNearClamp, [panelA], mockPanelSpec, 140, 20);
  assert.equal(snapClamp.snappedX, true);
  assert.equal(snapClamp.x, 2154); // 1000 + 1134 + 20
  assert.equal(snapClamp.snappedY, true);
  assert.equal(snapClamp.y, 1000);

  // 2. Kiểm tra khớp sát mép 0mm (khi đưa lại gần 2134 mm)
  const movingNearFlush = { id: 'pC', xMm: 2130, yMm: 1010, rotationDeg: 0 };
  const snapFlush = findMagneticSnap(movingNearFlush.xMm, movingNearFlush.yMm, movingNearFlush, [panelA], mockPanelSpec, 140, 20);
  assert.equal(snapFlush.snappedX, true);
  assert.equal(snapFlush.x, 2134); // 1000 + 1134 (sát mép)
});

test('getObstacleBoundingBox handles rotation correctly', () => {
  const obs = {
    id: 'tank',
    name: 'Bồn Nước',
    type: 'water_tank' as const,
    xMm: 2000,
    yMm: 2000,
    widthMm: 1200,
    lengthMm: 1800,
    rotationDeg: 90,
  };
  const bbox = getObstacleBoundingBox(obs);
  // After 90 deg rotation, width and length swap: width becomes 1800, height becomes 1200
  assert.equal(bbox.maxX - bbox.minX, 1800);
  assert.equal(bbox.maxY - bbox.minY, 1200);
});

