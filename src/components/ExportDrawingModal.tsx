/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { jsPDF, AcroFormTextField } from 'jspdf';
import {
  BatterySpec,
  InverterSpec,
  Obstacle,
  PanelSpec,
  PlacedPanel,
  RoofConfig,
  SystemMetrics,
} from '../types/solar';
import { ROOF_MATERIALS } from '../data/solar-presets';
import { getPanelDimensions, getObstacleBoundingBox } from '../utils/solar-calculations';
import {
  FileText,
  Image as ImageIcon,
  X,
  Download,
  Edit3,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface ExportDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roof: RoofConfig;
  panelSpec: PanelSpec;
  inverterSpec: InverterSpec;
  batterySpec: BatterySpec;
  panels: PlacedPanel[];
  obstacles: Obstacle[];
  metrics: SystemMetrics;
  grossRoofAreaM2: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export const ExportDrawingModal: React.FC<ExportDrawingModalProps> = ({
  isOpen,
  onClose,
  roof,
  panelSpec,
  inverterSpec,
  batterySpec,
  panels,
  obstacles,
  metrics,
  grossRoofAreaM2,
  svgRef,
}) => {
  const regionName =
    roof.region === 'north'
      ? 'Miền Bắc'
      : roof.region === 'central'
      ? 'Miền Trung'
      : 'Miền Nam';

  const materialName = ROOF_MATERIALS[roof.material]?.name || 'Mái Tôn Sóng';

  // Các trường thông tin có thể chỉnh sửa trực tiếp trước khi xuất PDF / PNG
  const [drawingTitle, setDrawingTitle] = useState(
    'BẢN VẼ KỸ THUẬT MẶT BẰNG BỐ TRÍ & BÁO CÁO SẢN LƯỢNG ĐIỆN MẶT TRỜI'
  );
  const [customerName, setCustomerName] = useState('Chủ đầu tư: Gia đình Anh/Chị ...');
  const [projectAddress, setProjectAddress] = useState(`Khu vực lắp đặt: ${regionName}`);
  const [designerName, setDesignerName] = useState('Đơn vị thiết kế: SolarDesign Pro');
  const [drawingDate, setDrawingDate] = useState(() =>
    new Date().toLocaleDateString('vi-VN')
  );
  const [customSystemLine, setCustomSystemLine] = useState('');
  const [customYieldDaily, setCustomYieldDaily] = useState('');
  const [customYieldMonthly, setCustomYieldMonthly] = useState('');
  const [customYieldAnnual, setCustomYieldAnnual] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState(
    '• Khoảng hở kẹp biên / kẹp giữa tiêu chuẩn giữa các tấm pin: 20mm.\n• Lắp đặt hệ khung rail nhôm định hình AL6005-T5 chống ăn mòn, tiếp địa an toàn toàn hệ thống.\n• Đảm bảo khoảng lùi an toàn quanh mép mái và tránh bóng che từ các vật cản.'
  );
  const [includeEditablePdfFields, setIncludeEditablePdfFields] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Đồng bộ giá trị mặc định mỗi khi mở modal hoặc thông số hệ thống thay đổi
  useEffect(() => {
    if (isOpen) {
      const mountHardware =
        ROOF_MATERIALS[roof.material]?.mountType ||
        'Bát Z, Thanh Minirail nhôm + Kẹp biên, Kẹp giữa (khe hở 20mm)';
      setCustomSystemLine(
        `Hệ thống: ${metrics.totalDcPowerKwp} kWp (${metrics.totalPanels} tấm ${panelSpec.brand} ${panelSpec.powerWp}W) | Inverter: ${inverterSpec.brand} ${inverterSpec.name} (${inverterSpec.ratedPowerKw}kW)`
      );
      setCustomYieldDaily(`${metrics.dailyGenerationKwh} kWh / ngày`);
      setCustomYieldMonthly(`${metrics.monthlyGenerationKwh.toLocaleString('vi-VN')} kWh / tháng`);
      setCustomYieldAnnual(`${metrics.annualGenerationKwh.toLocaleString('vi-VN')} kWh / năm`);
      setTechnicalNotes(
        `• Vật liệu mái: ${ROOF_MATERIALS[roof.material]?.name || 'Mái tôn nhà dân'} — Phụ kiện: ${mountHardware}.\n• Khoảng hở kẹp biên / kẹp giữa tiêu chuẩn giữa các tấm pin: 20mm.\n• Đảm bảo khoảng lùi an toàn quanh mép mái và tiếp địa an toàn toàn hệ thống.`
      );
    }
  }, [isOpen, metrics, panelSpec, inverterSpec, roof.material]);

  if (!isOpen) return null;

  /**
   * Vẽ mũi tên đường kích thước chuẩn kỹ thuật CAD (Nền trắng - Nét đen)
   */
  const drawDimensionArrow = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    isVertical = false
  ) => {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 1.6;

    // Đường chính
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Đầu mũi tên hoặc gạch chéo kiến trúc (Architectural Tick + Arrow)
    const headLen = 9;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Mũi tên đầu 1
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(
      x1 + headLen * Math.cos(angle - Math.PI / 6),
      y1 + headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x1 + headLen * Math.cos(angle + Math.PI / 6),
      y1 + headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Mũi tên đầu 2
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Nhãn kích thước ở chính giữa
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.font = 'bold 15px monospace';
    const textW = ctx.measureText(label).width + 16;
    const textH = 24;

    ctx.translate(midX, midY);
    if (isVertical) {
      ctx.rotate(-Math.PI / 2);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-textW / 2, -textH / 2, textW, textH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-textW / 2, -textH / 2, textW, textH);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);

    ctx.restore();
  };

  /**
   * Tạo đường bao đa giác mái theo hình dạng (Chữ nhật, Chữ L, Hình thang)
   */
  const traceRoofPolygon = (
    ctx: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    scale: number,
    insetMm = 0
  ) => {
    const w = roof.widthM * 1000 * scale;
    const l = roof.lengthM * 1000 * scale;
    const s = insetMm * scale;

    ctx.beginPath();
    if (roof.shape === 'l_shape') {
      const cutW = (roof.cutWidthM || 3) * 1000 * scale;
      const cutL = (roof.cutLengthM || 3) * 1000 * scale;
      ctx.moveTo(originX + s, originY + s);
      ctx.lineTo(originX + w - cutW - s, originY + s);
      ctx.lineTo(originX + w - cutW - s, originY + cutL + s);
      ctx.lineTo(originX + w - s, originY + cutL + s);
      ctx.lineTo(originX + w - s, originY + l - s);
      ctx.lineTo(originX + s, originY + l - s);
    } else if (roof.shape === 'trapezoid') {
      const topW = (roof.topWidthM || roof.widthM * 0.6) * 1000 * scale;
      const diff = (w - topW) / 2;
      ctx.moveTo(originX + diff + s, originY + s);
      ctx.lineTo(originX + w - diff - s, originY + s);
      ctx.lineTo(originX + w - s, originY + l - s);
      ctx.lineTo(originX + s, originY + l - s);
    } else {
      ctx.moveTo(originX + s, originY + s);
      ctx.lineTo(originX + w - s, originY + s);
      ctx.lineTo(originX + w - s, originY + l - s);
      ctx.lineTo(originX + s, originY + l - s);
    }
    ctx.closePath();
  };

  /**
   * Tạo Bản Vẽ Kỹ Thuật Chuyên Nghiệp NỀN TRẮNG - CHỮ ĐEN chuẩn hồ sơ thiết kế CAD (A3 Landscape 2400x1697px)
   */
  const renderWhiteTechnicalSheet = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const width = 2400;
      const height = 1697; // Đúng tỷ lệ khổ giấy A3 ngang (420 : 297)
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Không thể khởi tạo Canvas 2D'));
        return;
      }

      // 1. NỀN TRẮNG TINH KHIẾT CHUẨN GIẤY IN KỸ THUẬT
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. KHUNG VIỀN BẢN VẼ KỸ THUẬT KÉP (CAD Standard Double Border)
      const outerM = 28;
      const innerM = 46;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(outerM, outerM, width - outerM * 2, height - outerM * 2);

      ctx.lineWidth = 3.5;
      ctx.strokeRect(innerM, innerM, width - innerM * 2, height - innerM * 2);

      // Ký hiệu tọa độ khung bản vẽ (1..6 ngang, A..D dọc)
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cols = 6;
      for (let i = 0; i < cols; i++) {
        const cx = innerM + ((width - innerM * 2) / cols) * (i + 0.5);
        ctx.fillText(`${i + 1}`, cx, outerM + 9);
        ctx.fillText(`${i + 1}`, cx, height - outerM - 9);
        if (i > 0) {
          const tickX = innerM + ((width - innerM * 2) / cols) * i;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tickX, outerM);
          ctx.lineTo(tickX, innerM);
          ctx.moveTo(tickX, height - innerM);
          ctx.lineTo(tickX, height - outerM);
          ctx.stroke();
        }
      }
      const rows = ['A', 'B', 'C', 'D'];
      for (let j = 0; j < rows.length; j++) {
        const cy = innerM + ((height - innerM * 2) / rows.length) * (j + 0.5);
        ctx.fillText(rows[j], outerM + 9, cy);
        ctx.fillText(rows[j], width - outerM - 9, cy);
        if (j > 0) {
          const tickY = innerM + ((height - innerM * 2) / rows.length) * j;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(outerM, tickY);
          ctx.lineTo(innerM, tickY);
          ctx.moveTo(width - innerM, tickY);
          ctx.lineTo(width - outerM, tickY);
          ctx.stroke();
        }
      }

      // 3. KHU VỰC HEADER & BẢNG BÁO CÁO SẢN LƯỢNG ĐIỆN (NỀN TRẮNG - CHỮ ĐEN)
      const contentX = innerM;
      const contentW = width - innerM * 2;
      const headerBottomY = 330;

      // Đường kẻ ngang phân cách Header
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(contentX, headerBottomY);
      ctx.lineTo(contentX + contentW, headerBottomY);
      ctx.stroke();

      // Tiêu đề chính bản vẽ (Chữ Đen Đậm)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(drawingTitle.toUpperCase(), contentX + 28, innerM + 44);

      // Thông tin Chủ đầu tư & Ngày lập ở góc phải trên
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(`${customerName}  |  Ngày lập: ${drawingDate}`, contentX + contentW - 28, innerM + 42);
      ctx.textAlign = 'left';

      // Dòng thông số cấu hình thiết bị chính
      ctx.font = 'bold 17px monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText(customSystemLine, contentX + 28, innerM + 78);

      // Dòng thông số mái & khu vực bức xạ
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#1e293b';
      const storageText =
        inverterSpec.type === 'grid_tie'
          ? 'Chế độ: Hệ hòa lưới bám tải (Không lưu trữ)'
          : `Lưu trữ: ${batterySpec.brand} ${batterySpec.name} (${metrics.batteryTotalKwh} kWh - Tự chủ ${metrics.batteryAutonomyHours}h)`;
      ctx.fillText(
        `Kích thước mái: ${roof.widthM}m × ${roof.lengthM}m (${grossRoofAreaM2.toFixed(1)}m² - Vật liệu: ${materialName} - Độ dốc ${roof.slopeDeg}°)  |  Hướng mái: ${roof.azimuthDeg}°  |  ${projectAddress} (${metrics.dailyPeakSunHours}h nắng/ngày)  |  ${storageText}`,
        contentX + 28,
        innerM + 108
      );

      // 4 Ô THẺ BÁO CÁO SẢN LƯỢNG ĐIỆN (Nền trắng xám nhạt, viền đen sắc nét, chữ đen đậm)
      const cardY = innerM + 128;
      const cardH = 136;
      const gap = 22;
      const totalCards = 4;
      const cardW = Math.floor((contentW - 56 - gap * (totalCards - 1)) / totalCards);

      const yieldCards = [
        {
          code: 'CHỈ TIÊU 01',
          title: 'SẢN LƯỢNG ĐIỆN TRUNG BÌNH NGÀY',
          value: customYieldDaily || `${metrics.dailyGenerationKwh} kWh / ngày`,
          sub: `Tính theo ${metrics.dailyPeakSunHours} giờ nắng đỉnh/ngày (${regionName})`,
        },
        {
          code: 'CHỈ TIÊU 02',
          title: 'SẢN LƯỢNG ĐIỆN TRUNG BÌNH THÁNG',
          value:
            customYieldMonthly ||
            `${metrics.monthlyGenerationKwh.toLocaleString('vi-VN')} kWh / tháng`,
          sub: `Trung bình ~${(metrics.monthlyGenerationKwh / 30).toFixed(1)} kWh/ngày`,
        },
        {
          code: 'CHỈ TIÊU 03',
          title: 'TỔNG SẢN LƯỢNG ĐIỆN NĂM',
          value:
            customYieldAnnual ||
            `${metrics.annualGenerationKwh.toLocaleString('vi-VN')} kWh / năm`,
          sub: `Tổng công suất giàn pin: ${metrics.totalDcPowerKwp} kWp (${metrics.totalPanels} tấm)`,
        },
        {
          code: 'CHỈ TIÊU 04',
          title:
            inverterSpec.type === 'grid_tie'
              ? 'GIẢM PHÁT THẢI CO₂ & HIỆU SUẤT'
              : 'DUNG LƯỢNG LƯU TRỮ & GIẢM CO₂',
          value:
            inverterSpec.type === 'grid_tie'
              ? `${(metrics.annualCo2ReductionKg / 1000).toFixed(2)} tấn CO₂ / năm`
              : `${metrics.batteryTotalKwh} kWh Lưu Trữ`,
          sub:
            inverterSpec.type === 'grid_tie'
              ? `Hiệu suất PR ~80% | Tỷ lệ DC/AC ${metrics.dcAcRatio}:1`
              : `Khả dụng: ${metrics.batteryUsableKwh} kWh (${metrics.batteryAutonomyHours}h) | Giảm ${(metrics.annualCo2ReductionKg / 1000).toFixed(2)} tấn CO₂/năm`,
        },
      ];

      yieldCards.forEach((card, idx) => {
        const cx = contentX + 28 + idx * (cardW + gap);

        // Khung hộp báo cáo sản lượng nền trắng chữ đen
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx, cardY, cardW, cardH);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cardY, cardW, cardH);

        // Thanh tiêu đề phụ phía trên thẻ
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx, cardY, cardW, 34);
        ctx.beginPath();
        ctx.moveTo(cx, cardY + 34);
        ctx.lineTo(cx + cardW, cardY + 34);
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(card.title, cx + 14, cardY + 22);

        // Giá trị sản lượng chữ đen đậm cỡ lớn
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(card.value, cx + 14, cardY + 80);

        // Dòng diễn giải kỹ thuật
        ctx.fillStyle = '#1e293b';
        ctx.font = '14px sans-serif';
        ctx.fillText(card.sub, cx + 14, cardY + 114);
      });

      // 4. VẼ MẶT BẰNG KỸ THUẬT BỐ TRÍ TẤM PIN (NỀN TRẮNG - NÉT ĐEN KỸ THUẬT CAD)
      const footerTopY = height - innerM - 220;
      const planTopY = headerBottomY;
      const planHeight = footerTopY - planTopY;
      const planWidth = contentW;

      // Lưới chấm kỹ thuật nhẹ trong vùng bản vẽ mặt bằng
      ctx.save();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let gx = contentX + gridStep; gx < contentX + planWidth; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, planTopY);
        ctx.lineTo(gx, footerTopY);
        ctx.stroke();
      }
      for (let gy = planTopY + gridStep; gy < footerTopY; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(contentX, gy);
        ctx.lineTo(contentX + planWidth, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Tính toán tỷ lệ vẽ mặt bằng mái sao cho cân đối ở chính giữa vùng bản vẽ
      const roofWMm = Math.max(roof.widthM * 1000, 1000);
      const roofLMm = Math.max(roof.lengthM * 1000, 1000);
      const maxDrawW = planWidth - 420; // Chừa không gian cho đường kích thước và la bàn/chú giải
      const maxDrawH = planHeight - 190;
      const scale = Math.min(maxDrawW / roofWMm, maxDrawH / roofLMm);

      const drawRoofW = roofWMm * scale;
      const drawRoofL = roofLMm * scale;
      const roofOriginX = contentX + Math.round((planWidth - 220 - drawRoofW) / 2) + 40;
      const roofOriginY = planTopY + Math.round((planHeight - drawRoofL) / 2) + 15;

      // 4.1 Vẽ mặt mái nền trắng + vân vật liệu kỹ thuật mảnh + đường bao mái nét đen đậm
      ctx.save();
      traceRoofPolygon(ctx, roofOriginX, roofOriginY, scale, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.clip();

      // Vân sóng tôn / ngói kỹ thuật nét mảnh màu xám nhạt để nổi bật tấm pin
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const hatchStep = Math.max(18, Math.round(500 * scale));
      for (let hx = roofOriginX; hx <= roofOriginX + drawRoofW; hx += hatchStep) {
        ctx.beginPath();
        ctx.moveTo(hx, roofOriginY);
        ctx.lineTo(hx, roofOriginY + drawRoofL);
        ctx.stroke();
      }
      for (let hy = roofOriginY; hy <= roofOriginY + drawRoofL; hy += hatchStep * 2) {
        ctx.beginPath();
        ctx.moveTo(roofOriginX, hy);
        ctx.lineTo(roofOriginX + drawRoofW, hy);
        ctx.stroke();
      }
      ctx.restore();

      // Đường viền bao mái nét đen dày chuẩn bản vẽ xây dựng
      ctx.save();
      traceRoofPolygon(ctx, roofOriginX, roofOriginY, scale, 0);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();

      // 4.2 Đường khoảng lùi an toàn (Setback) nét đứt đen
      if (roof.setbackM > 0) {
        ctx.save();
        traceRoofPolygon(ctx, roofOriginX, roofOriginY, scale, roof.setbackM * 1000);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.restore();
      }

      // 4.3 Vẽ các Vật Cản trên mái (Đúng tọa độ tâm Bounding Box như trên khung vẽ + chỉ gắn mã ký hiệu gọn VC1, VC2... tự co giãn theo kích thước)
      obstacles.forEach((obs, idx) => {
        const obsBox = getObstacleBoundingBox(obs);
        const cx = roofOriginX + ((obsBox.minX + obsBox.maxX) / 2) * scale;
        const cy = roofOriginY + ((obsBox.minY + obsBox.maxY) / 2) * scale;
        const ow = obs.widthMm * scale;
        const oh = obs.lengthMm * scale;
        const obsMinSide = Math.min(ow, oh);
        const obsCode = `VC${idx + 1}`;

        ctx.save();
        ctx.translate(cx, cy);
        if (obs.rotationDeg) {
          ctx.rotate((obs.rotationDeg * Math.PI) / 180);
        }

        // Nền xám trắng & viền đen đậm cho vật cản
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.min(2, Math.max(0.7, obsMinSide * 0.06));
        ctx.fillRect(-ow / 2, -oh / 2, ow, oh);
        ctx.strokeRect(-ow / 2, -oh / 2, ow, oh);

        // Đường gạch chéo ký hiệu vật cản kỹ thuật
        ctx.lineWidth = Math.min(1.2, Math.max(0.4, obsMinSide * 0.04));
        ctx.beginPath();
        ctx.moveTo(-ow / 2, -oh / 2);
        ctx.lineTo(ow / 2, oh / 2);
        ctx.moveTo(ow / 2, -oh / 2);
        ctx.lineTo(-ow / 2, oh / 2);
        ctx.stroke();

        // Nếu là cục nóng máy lạnh hoặc bồn nước thì vẽ thêm vòng tròn ký hiệu quạt/bồn
        if (obs.type === 'ac_outdoor' || obs.type === 'water_tank') {
          const r = obsMinSide * 0.28;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.stroke();
        }

        // Mã ký hiệu ngắn gọn (VC1, VC2...) tự động co giãn theo kích thước thực tế của vật cản
        ctx.rotate(-(obs.rotationDeg || 0) * (Math.PI / 180));
        const codeH = Math.min(17, Math.max(7, obsMinSide * 0.42));
        const codeFontPx = Math.min(11, Math.max(5.5, Math.round(codeH * 0.65)));
        ctx.font = `bold ${codeFontPx}px monospace`;
        const codeW = Math.min(
          Math.max(ow, oh) * 0.85,
          Math.max(codeH * 1.3, ctx.measureText(obsCode).width + codeFontPx * 0.6)
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-codeW / 2, -codeH / 2, codeW, codeH);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.min(1.2, Math.max(0.5, obsMinSide * 0.04));
        ctx.strokeRect(-codeW / 2, -codeH / 2, codeW, codeH);
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obsCode, 0, 0.5);

        ctx.restore();
      });

      // 4.4 Vẽ từng Tấm Pin Mặt Trời theo đúng tâm và góc xoay trên khung vẽ (Nền Trắng - Nét Đen, tự co giãn cỡ chữ khi mái lớn)
      panels.forEach((panel, idx) => {
        const rot = panel.rotationDeg || 0;
        const dim = getPanelDimensions(panelSpec, rot);
        const cx = roofOriginX + (panel.xMm + dim.width / 2) * scale;
        const cy = roofOriginY + (panel.yMm + dim.height / 2) * scale;
        const rawW = panelSpec.widthMm * scale;
        const rawH = panelSpec.lengthMm * scale;
        const minSide = Math.min(rawW, rawH);

        ctx.save();
        ctx.translate(cx, cy);
        if (rot) {
          ctx.rotate((rot * Math.PI) / 180);
        }

        // Nền tấm pin trắng tinh tế + khung nhôm đen sắc nét để in ấn rõ ràng
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.min(2.2, Math.max(0.65, minSide * 0.055));
        ctx.fillRect(-rawW / 2, -rawH / 2, rawW, rawH);
        ctx.strokeRect(-rawW / 2, -rawH / 2, rawW, rawH);

        // Viền khung nhôm trong
        const frameInset = Math.min(3.5, Math.max(0.5, minSide * 0.04));
        if (minSide >= 10) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = Math.min(1, Math.max(0.35, minSide * 0.025));
          ctx.strokeRect(
            -rawW / 2 + frameInset,
            -rawH / 2 + frameInset,
            rawW - frameInset * 2,
            rawH - frameInset * 2
          );
        }

        // Lưới cell pin kỹ thuật nét mảnh (chỉ vẽ khi tấm pin đủ lớn để tránh làm đen đặc tấm pin trên mái diện tích lớn)
        if (minSide >= 16) {
          const colsCell = 6;
          const rowsCell = 12;
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = Math.min(0.8, Math.max(0.25, minSide * 0.02));

          for (let c = 1; c < colsCell; c++) {
            const cellX = -rawW / 2 + (rawW / colsCell) * c;
            ctx.beginPath();
            ctx.moveTo(cellX, -rawH / 2 + frameInset);
            ctx.lineTo(cellX, rawH / 2 - frameInset);
            ctx.stroke();
          }
          for (let r = 1; r < rowsCell; r++) {
            const cellY = -rawH / 2 + (rawH / rowsCell) * r;
            ctx.beginPath();
            ctx.moveTo(-rawW / 2 + frameInset, cellY);
            ctx.lineTo(rawW / 2 - frameInset, cellY);
            ctx.stroke();
          }
        }

        // Đường chia đôi Half-Cut Cell ở chính giữa tấm pin
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.min(1.4, Math.max(0.45, minSide * 0.035));
        ctx.beginPath();
        ctx.moveTo(-rawW / 2, 0);
        ctx.lineTo(rawW / 2, 0);
        ctx.stroke();

        // Nhãn số thứ tự tấm pin (#1, #2...) tự động co giãn tỷ lệ thuận với kích thước tấm pin (không bao giờ che khuất tấm pin)
        ctx.rotate(-(rot * Math.PI) / 180);
        const label = `#${idx + 1}`;
        const badgeH = Math.min(20, Math.max(4.5, minSide * 0.28));
        const fontPx = Math.min(13, Math.max(4, Number((badgeH * 0.65).toFixed(1))));
        ctx.font = `bold ${fontPx}px monospace`;
        const maxAllowedW = (rot % 180 !== 0 ? rawH : rawW) * 0.76;
        const badgeW = Math.min(
          maxAllowedW,
          Math.max(badgeH * 1.2, ctx.measureText(label).width + fontPx * 0.6)
        );

        if (minSide >= 9) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.min(1.2, Math.max(0.35, minSide * 0.03));
          ctx.strokeRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
        }

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, fontPx * 0.06);

        ctx.restore();
      });

      // 4.5 Vẽ Đường Kích Thước Mái Nhà (Dimension Lines)
      // Kích thước ngang mái (Phía trên)
      const dimOffsetTop = 38;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(roofOriginX, roofOriginY - 6);
      ctx.lineTo(roofOriginX, roofOriginY - dimOffsetTop - 10);
      ctx.moveTo(roofOriginX + drawRoofW, roofOriginY - 6);
      ctx.lineTo(roofOriginX + drawRoofW, roofOriginY - dimOffsetTop - 10);
      ctx.stroke();

      drawDimensionArrow(
        ctx,
        roofOriginX,
        roofOriginY - dimOffsetTop,
        roofOriginX + drawRoofW,
        roofOriginY - dimOffsetTop,
        `CHIỀU NGANG MÁI: ${roof.widthM}m (${Math.round(roof.widthM * 1000)} mm)`,
        false
      );

      // Kích thước dọc mái (Phía trái)
      const dimOffsetLeft = 42;
      ctx.beginPath();
      ctx.moveTo(roofOriginX - 6, roofOriginY);
      ctx.lineTo(roofOriginX - dimOffsetLeft - 10, roofOriginY);
      ctx.moveTo(roofOriginX - 6, roofOriginY + drawRoofL);
      ctx.lineTo(roofOriginX - dimOffsetLeft - 10, roofOriginY + drawRoofL);
      ctx.stroke();

      drawDimensionArrow(
        ctx,
        roofOriginX - dimOffsetLeft,
        roofOriginY,
        roofOriginX - dimOffsetLeft,
        roofOriginY + drawRoofL,
        `CHIỀU DỌC MÁI: ${roof.lengthM}m (${Math.round(roof.lengthM * 1000)} mm)`,
        true
      );

      // Nếu có các tấm pin trên mái, vẽ thêm kích thước tổng giàn pin
      if (panels.length > 0) {
        let minPx = Infinity;
        let minPy = Infinity;
        let maxPx = -Infinity;
        let maxPy = -Infinity;
        panels.forEach((p) => {
          const d = getPanelDimensions(panelSpec, p.rotationDeg || 0);
          minPx = Math.min(minPx, p.xMm);
          minPy = Math.min(minPy, p.yMm);
          maxPx = Math.max(maxPx, p.xMm + d.width);
          maxPy = Math.max(maxPy, p.yMm + d.height);
        });
        const arrWMm = Math.round(maxPx - minPx);
        const arrLMm = Math.round(maxPy - minPy);
        const ax1 = roofOriginX + minPx * scale;
        const ax2 = roofOriginX + maxPx * scale;
        const ayBottom = roofOriginY + drawRoofL + 36;

        drawDimensionArrow(
          ctx,
          ax1,
          ayBottom,
          ax2,
          ayBottom,
          `BỀ RỘNG GIÀN PIN: ${(arrWMm / 1000).toFixed(2)}m (${arrWMm}mm) | DỌC: ${(arrLMm / 1000).toFixed(2)}m | KHE HỞ: 20mm`,
          false
        );
      }

      // 4.6 La bàn Kỹ Thuật & Bảng Chú Giải Ký Hiệu (Góc phải vùng mặt bằng)
      const legendW = 280;
      const legendX = contentX + contentW - legendW - 28;
      const legendY = planTopY + 28;

      // Hộp La Bàn & Hướng Nhà
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(legendX, legendY, legendW, 210);
      ctx.strokeRect(legendX, legendY, legendW, 210);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(legendX, legendY, legendW, 32);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + 32);
      ctx.lineTo(legendX + legendW, legendY + 32);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOA GIÓ & HƯỚNG MÁI (AZIMUTH)', legendX + legendW / 2, legendY + 21);

      // Vòng tròn la bàn kỹ thuật
      const compCx = legendX + legendW / 2;
      const compCy = legendY + 108;
      const compR = 46;
      ctx.beginPath();
      ctx.arc(compCx, compCy, compR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('B (N)', compCx, compCy - compR - 10);
      ctx.fillText('N (S)', compCx, compCy + compR + 16);
      ctx.fillText('Đ (E)', compCx + compR + 22, compCy + 4);
      ctx.fillText('T (W)', compCx - compR - 22, compCy + 4);

      // Kim chỉ hướng nhà
      ctx.save();
      ctx.translate(compCx, compCy);
      ctx.rotate(((roof.azimuthDeg - 180) * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -compR + 8);
      ctx.lineTo(-8, 12);
      ctx.lineTo(8, 12);
      ctx.closePath();
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.restore();

      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Hướng nhà: ${roof.azimuthDeg}°`, compCx, legendY + 194);

      // Hộp Chú Giải Ký Hiệu (Legend)
      const leg2Y = legendY + 228;
      const leg2H = 260;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(legendX, leg2Y, legendW, leg2H);
      ctx.strokeRect(legendX, leg2Y, legendW, leg2H);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(legendX, leg2Y, legendW, 32);
      ctx.beginPath();
      ctx.moveTo(legendX, leg2Y + 32);
      ctx.lineTo(legendX + legendW, leg2Y + 32);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('CHÚ GIẢI KÝ HIỆU BẢN VẼ', legendX + legendW / 2, leg2Y + 21);

      ctx.textAlign = 'left';
      ctx.font = '13px sans-serif';

      // Mục 1: Tấm pin
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.8;
      ctx.fillRect(legendX + 16, leg2Y + 48, 36, 22);
      ctx.strokeRect(legendX + 16, leg2Y + 48, 36, 22);
      ctx.fillStyle = '#000000';
      ctx.fillText(`Tấm pin ${panelSpec.brand} ${panelSpec.powerWp}W`, legendX + 64, leg2Y + 64);

      // Mục 2: Kích thước tấm
      ctx.font = '12px monospace';
      ctx.fillText(
        `KT tấm: ${panelSpec.lengthMm} × ${panelSpec.widthMm} mm`,
        legendX + 64,
        leg2Y + 84
      );

      // Mục 3: Đường khoảng lùi
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(legendX + 16, leg2Y + 112);
      ctx.lineTo(legendX + 52, leg2Y + 112);
      ctx.stroke();
      ctx.restore();
      ctx.font = '13px sans-serif';
      ctx.fillText(`Khoảng lùi mép mái (${roof.setbackM}m)`, legendX + 64, leg2Y + 116);

      // Mục 4: Vật cản (VC1, VC2...)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(legendX + 16, leg2Y + 134, 36, 22);
      ctx.strokeRect(legendX + 16, leg2Y + 134, 36, 22);
      ctx.beginPath();
      ctx.moveTo(legendX + 16, leg2Y + 134);
      ctx.lineTo(legendX + 52, leg2Y + 156);
      ctx.moveTo(legendX + 52, leg2Y + 134);
      ctx.lineTo(legendX + 16, leg2Y + 156);
      ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.fillText(
        obstacles.length > 0
          ? `Vật cản VC1..VC${obstacles.length} (Xem mục 1 dưới)`
          : 'Vật cản trên mái (0 vị trí)',
        legendX + 64,
        leg2Y + 150
      );

      // Mục 5: Thông số khe hở & độ phủ
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`• Khe hở kẹp pin: 20 mm`, legendX + 16, leg2Y + 188);
      ctx.fillText(
        `• Diện tích pin: ${metrics.totalPanelAreaM2} m² (${metrics.coveragePct}%)`,
        legendX + 16,
        leg2Y + 214
      );
      ctx.fillText(
        `• Tổng số lượng: ${metrics.totalPanels} tấm (${metrics.totalDcPowerKwp} kWp)`,
        legendX + 16,
        leg2Y + 240
      );

      // 5. KHUNG TÊN KỸ THUẬT TIÊU CHUẨN Ở CHÂN BẢN VẼ (TITLE BLOCK - NỀN TRẮNG CHỮ ĐEN)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(contentX, footerTopY, contentW, height - innerM - footerTopY);

      const col1W = Math.round(contentW * 0.44);
      const col2W = Math.round(contentW * 0.28);
      const col1X = contentX;
      const col2X = contentX + col1W;
      const col3X = col2X + col2W;

      ctx.beginPath();
      ctx.moveTo(col2X, footerTopY);
      ctx.lineTo(col2X, height - innerM);
      ctx.moveTo(col3X, footerTopY);
      ctx.lineTo(col3X, height - innerM);
      ctx.stroke();

      // Thanh tiêu đề cho 3 cột dưới Footer
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(contentX + 2, footerTopY + 2, contentW - 4, 34);
      ctx.beginPath();
      ctx.moveTo(contentX, footerTopY + 36);
      ctx.lineTo(contentX + contentW, footerTopY + 36);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('1. CHÚ THÍCH VẬT CẢN & GHI CHÚ KỸ THUẬT', col1X + 18, footerTopY + 24);
      ctx.fillText('2. BẢNG THỐNG KÊ THIẾT BỊ CHÍNH', col2X + 18, footerTopY + 24);
      ctx.fillText('3. KHUNG TÊN HỒ SƠ THIẾT KẾ', col3X + 18, footerTopY + 24);

      // Nội dung Cột 1: Danh sách chú thích vật cản (VC1, VC2...) ở phía dưới bản vẽ + Ghi chú kỹ thuật
      const obstacleLegendLines = obstacles.map((obs, idx) => {
        const rotTxt = obs.rotationDeg ? `, góc ${obs.rotationDeg}°` : '';
        return `• VC${idx + 1}: ${obs.name} — KT: ${obs.widthMm}×${obs.lengthMm}mm (X: ${(obs.xMm / 1000).toFixed(2)}m, Y: ${(obs.yMm / 1000).toFixed(2)}m${rotTxt})`;
      });
      const userNoteLines = technicalNotes
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const combinedCol1Lines = [
        ...(obstacleLegendLines.length > 0
          ? obstacleLegendLines
          : ['• Vật cản trên mái: Không có vật cản']),
        ...userNoteLines,
      ].slice(0, 7);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#000000';
      combinedCol1Lines.forEach((line, i) => {
        if (i < obstacleLegendLines.length) {
          ctx.font = 'bold 13px sans-serif';
        } else {
          ctx.font = '13px sans-serif';
        }
        ctx.fillText(line, col1X + 18, footerTopY + 58 + i * 23);
      });

      // Nội dung Cột 2: Thống kê thiết bị
      ctx.font = '14px sans-serif';
      ctx.fillText(
        `• Tấm pin: ${metrics.totalPanels} tấm ${panelSpec.brand} ${panelSpec.powerWp}W`,
        col2X + 18,
        footerTopY + 68
      );
      ctx.fillText(
        `• Tổng công suất DC: ${metrics.totalDcPowerKwp} kWp (${metrics.totalPanelAreaM2} m²)`,
        col2X + 18,
        footerTopY + 96
      );
      ctx.fillText(
        `• Biến tần Inverter: ${inverterSpec.brand} ${inverterSpec.name} (${inverterSpec.ratedPowerKw}kW)`,
        col2X + 18,
        footerTopY + 124
      );
      ctx.fillText(
        inverterSpec.type === 'grid_tie'
          ? '• Lưu trữ: Không sử dụng (Hệ bám tải)'
          : `• Pin lưu trữ: ${batterySpec.brand} ${batterySpec.name} (${metrics.batteryTotalKwh} kWh)`,
        col2X + 18,
        footerTopY + 152
      );
      ctx.fillText(
        `• Sản lượng điện: ${metrics.dailyGenerationKwh} kWh/ngày (~${metrics.monthlyGenerationKwh.toLocaleString('vi-VN')} kWh/tháng)`,
        col2X + 18,
        footerTopY + 180
      );

      // Nội dung Cột 3: Khung tên hồ sơ
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`• ${customerName}`, col3X + 18, footerTopY + 68);
      ctx.font = '14px sans-serif';
      ctx.fillText(`• ${projectAddress}`, col3X + 18, footerTopY + 96);
      ctx.fillText(`• ${designerName}`, col3X + 18, footerTopY + 124);
      ctx.fillText(`• Ngày xuất bản vẽ: ${drawingDate}`, col3X + 18, footerTopY + 152);
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`• Ký hiệu: KT-SOLAR-01  |  Khổ giấy: A3`, col3X + 18, footerTopY + 180);

      resolve(canvas);
    });
  };

  /**
   * 1. XUẤT FILE PDF CHUYÊN NGHIỆP (NỀN TRẮNG - CHỮ ĐEN + TRANG VECTOR CAD CHỈNH SỬA ĐƯỢC)
   */
  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderWhiteTechnicalSheet();
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Tạo trang PDF khổ A3 Ngang (420mm x 297mm) nền trắng chuẩn in ấn kỹ thuật
      const pdfWidthMm = 420;
      const pdfHeightMm = 297;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      });

      pdf.setProperties({
        title: drawingTitle,
        subject: `Bản vẽ thiết kế điện mặt trời ${metrics.totalDcPowerKwp}kWp - Sản lượng ${metrics.dailyGenerationKwh}kWh/ngày`,
        author: designerName,
        creator: 'SolarDesign Pro',
      });

      // TRANG 1: Bản vẽ kỹ thuật đầy đủ Nền Trắng - Chữ Đen độ phân giải cao
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidthMm, pdfHeightMm, 'F');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');

      // TRANG 2: Bản vẽ Vector CAD Nền Trắng - Nét Đen + Các Ô Văn Bản Tương Tác Chỉnh Sửa Trực Tiếp
      pdf.addPage('a3', 'landscape');
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdfWidthMm, pdfHeightMm, 'F');

      // Khung bản vẽ kỹ thuật CAD trang 2 (Nét đen trên nền trắng)
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.6);
      pdf.rect(8, 8, pdfWidthMm - 16, pdfHeightMm - 16, 'S');
      pdf.setLineWidth(0.3);
      pdf.rect(11, 11, pdfWidthMm - 22, pdfHeightMm - 22, 'S');

      // Tính tỷ lệ vẽ vector mặt bằng mái trên trang 2
      const roofWMm = roof.widthM * 1000;
      const roofLMm = roof.lengthM * 1000;
      const drawAreaW = pdfWidthMm - 70;
      const drawAreaH = pdfHeightMm - 86;
      const vecScale = Math.min(
        drawAreaW / Math.max(roofWMm, 1000),
        drawAreaH / Math.max(roofLMm, 1000)
      );
      const vecRoofW = roofWMm * vecScale;
      const vecRoofL = roofLMm * vecScale;
      const vecOriginX = (pdfWidthMm - vecRoofW) / 2;
      const vecOriginY = 30 + (drawAreaH - vecRoofL) / 2;

      // Vẽ khung mái Vector (Nền trắng, nét đen đậm)
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.7);
      pdf.rect(vecOriginX, vecOriginY, vecRoofW, vecRoofL, 'FD');

      // Vẽ khoảng lùi an toàn Vector
      const vecSetback = roof.setbackM * 1000 * vecScale;
      if (vecSetback > 0 && vecRoofW > vecSetback * 2 && vecRoofL > vecSetback * 2) {
        pdf.setDrawColor(100, 116, 139);
        pdf.setLineWidth(0.25);
        pdf.rect(
          vecOriginX + vecSetback,
          vecOriginY + vecSetback,
          vecRoofW - vecSetback * 2,
          vecRoofL - vecSetback * 2,
          'S'
        );
      }

      // Vẽ từng Vật cản dạng đối tượng Vector độc lập với mã VC1, VC2...
      obstacles.forEach((obs, idx) => {
        const oBox = getObstacleBoundingBox(obs);
        const ox = vecOriginX + oBox.minX * vecScale;
        const oy = vecOriginY + oBox.minY * vecScale;
        const ow = (oBox.maxX - oBox.minX) * vecScale;
        const oh = (oBox.maxY - oBox.minY) * vecScale;
        const minObsMm = Math.min(ow, oh);
        pdf.setFillColor(226, 232, 240);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(Math.min(0.35, Math.max(0.12, minObsMm * 0.05)));
        pdf.rect(ox, oy, ow, oh, 'FD');
        pdf.line(ox, oy, ox + ow, oy + oh);
        pdf.line(ox + ow, oy, ox, oy + oh);

        const obsFontPt = Math.min(7, Math.max(2.2, minObsMm * 0.85));
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(obsFontPt);
        pdf.text(`VC${idx + 1}`, ox + ow / 2, oy + oh / 2 + obsFontPt * 0.12, { align: 'center' });
      });

      // Vẽ từng Tấm Pin dạng đối tượng Vector độc lập (Nền trắng xám nhẹ, viền đen, chữ đen tự co giãn theo kích thước)
      panels.forEach((panel, idx) => {
        const dim = getPanelDimensions(panelSpec, panel.rotationDeg || 0);
        const px = vecOriginX + panel.xMm * vecScale;
        const py = vecOriginY + panel.yMm * vecScale;
        const pw = dim.width * vecScale;
        const ph = dim.height * vecScale;
        const minPanelMm = Math.min(pw, ph);

        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(Math.min(0.35, Math.max(0.1, minPanelMm * 0.045)));
        pdf.rect(px, py, pw, ph, 'FD');

        // Đường chia đôi Half-Cell vector
        pdf.setDrawColor(71, 85, 105);
        pdf.setLineWidth(Math.min(0.18, Math.max(0.06, minPanelMm * 0.025)));
        if (pw >= ph) {
          pdf.line(px + pw / 2, py, px + pw / 2, py + ph);
        } else {
          pdf.line(px, py + ph / 2, px + pw, py + ph / 2);
        }

        const panelFontPt = Math.min(7.5, Math.max(2.0, minPanelMm * 0.72));
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(panelFontPt);
        pdf.text(`#${idx + 1}`, px + pw / 2, py + ph / 2 + panelFontPt * 0.12, { align: 'center' });
      });

      // Thêm các Ô Nhập Liệu Trực Tiếp (Interactive Editable AcroForm Fields) chữ đen trên nền trắng
      if (includeEditablePdfFields) {
        try {
          pdf.setPage(2);
          const obsSummaryText =
            obstacles.length > 0
              ? obstacles
                  .map(
                    (o, i) =>
                      `VC${i + 1}: ${o.name} (${o.widthMm}x${o.lengthMm}mm, X:${(o.xMm / 1000).toFixed(2)}m, Y:${(o.yMm / 1000).toFixed(2)}m)`
                  )
                  .join(' | ')
              : 'Khong co vat can';
          const fields = [
            {
              name: 'project_title',
              val: `BAN VE CAD VECTOR (NEN TRANG CHU DEN) - HE THONG: ${metrics.totalDcPowerKwp} kWp (${metrics.totalPanels} tam ${panelSpec.brand} ${panelSpec.powerWp}W)`,
              x: 15,
              y: 14,
              w: 390,
              h: 9,
            },
            {
              name: 'yield_summary',
              val: `San luong Dien: ${metrics.dailyGenerationKwh} kWh/ngay | ${metrics.monthlyGenerationKwh} kWh/thang | ${metrics.annualGenerationKwh} kWh/nam`,
              x: 15,
              y: 263,
              w: 192,
              h: 9,
            },
            {
              name: 'customer_info',
              val: `${customerName} | ${projectAddress} | Mai: ${roof.widthM}m x ${roof.lengthM}m`,
              x: 211,
              y: 263,
              w: 194,
              h: 9,
            },
            {
              name: 'technical_notes_field',
              val: `Chu thich vat can: ${obsSummaryText} || Inverter: ${inverterSpec.brand} ${inverterSpec.name}`,
              x: 15,
              y: 274,
              w: 390,
              h: 9,
            },
          ];

          fields.forEach((f) => {
            const textField = new AcroFormTextField();
            textField.fieldName = f.name;
            textField.x = f.x;
            textField.y = f.y;
            textField.width = f.w;
            textField.height = f.h;
            textField.value = f.val;
            textField.fontSize = 10;
            textField.color = 'black';
            pdf.addField(textField);
          });
        } catch {
          // Bỏ qua nếu trình đọc không hỗ trợ AcroForm
        }
      }

      pdf.setPage(1);
      pdf.save(
        `Ban-Ve-Ky-Thuat-Solar-${metrics.totalDcPowerKwp}kWp-${metrics.dailyGenerationKwh}kWh-ngay.pdf`
      );
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * 2. XUẤT FILE ẢNH PNG BẢN VẼ KỸ THUẬT NỀN TRẮNG - CHỮ ĐEN
   */
  const handleDownloadPng = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderWhiteTechnicalSheet();
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `Ban-Ve-Ky-Thuat-Solar-${metrics.totalDcPowerKwp}kWp-${metrics.dailyGenerationKwh}kWh-ngay.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * 3. XUẤT FILE VECTOR SVG GỐC
   */
  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vector-Solar-${metrics.totalDcPowerKwp}kWp.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Xuất Bản Vẽ Kỹ Thuật Chuyên Nghiệp (Nền Trắng - Chữ Đen)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Bản vẽ PDF khổ A3 nền trắng chữ đen chuẩn hồ sơ thiết kế CAD, luôn hiển thị bảng sản lượng điện
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Chỉnh sửa trực tiếp các thông tin trên bản vẽ */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Tóm tắt sản lượng điện luôn hiển thị trên bản vẽ */}
          <div className="p-3.5 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>BẢNG SẢN LƯỢNG ĐIỆN HIỂN THỊ TRÊN BẢN VẼ (CÓ THỂ CHỈNH SỬA)</span>
              </span>
              <span className="text-[11px] font-mono text-amber-300 font-semibold">
                {metrics.totalDcPowerKwp} kWp ({metrics.totalPanels} tấm)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Sản lượng Ngày (kWh/ngày)
                </label>
                <input
                  type="text"
                  value={customYieldDaily}
                  onChange={(e) => setCustomYieldDaily(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Sản lượng Tháng (kWh/tháng)
                </label>
                <input
                  type="text"
                  value={customYieldMonthly}
                  onChange={(e) => setCustomYieldMonthly(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Tổng sản lượng Năm (kWh/năm)
                </label>
                <input
                  type="text"
                  value={customYieldAnnual}
                  onChange={(e) => setCustomYieldAnnual(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Chỉnh sửa Khung Tên & Tiêu Đề Bản Vẽ */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>CHỈNH SỬA THÔNG TIN KHUNG TÊN & THUYẾT MINH BẢN VẼ</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tiêu đề bản vẽ</label>
              <input
                type="text"
                value={drawingTitle}
                onChange={(e) => setDrawingTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Tên Chủ đầu tư / Khách hàng</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Địa chỉ công trình / Khu vực</label>
                <input
                  type="text"
                  value={projectAddress}
                  onChange={(e) => setProjectAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Đơn vị thiết kế / Người lập</label>
                <input
                  type="text"
                  value={designerName}
                  onChange={(e) => setDesignerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Ngày xuất bản vẽ</label>
                <input
                  type="text"
                  value={drawingDate}
                  onChange={(e) => setDrawingDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Dòng tóm tắt cấu hình thiết bị</label>
              <input
                type="text"
                value={customSystemLine}
                onChange={(e) => setCustomSystemLine(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Ghi chú kỹ thuật & Thuyết minh trên bản vẽ
              </label>
              <textarea
                rows={3}
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={includeEditablePdfFields}
                onChange={(e) => setIncludeEditablePdfFields(e.target.checked)}
                className="rounded accent-amber-400"
              />
              <span>
                Đính kèm trang 2 Vector CAD (Nền trắng - Nét đen) + Ô văn bản tương tác để bóc tách chỉnh sửa trong PDF / AutoCAD / Illustrator
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            title="Tải file Vector SVG gốc để mở trong AutoCAD, Corel, Illustrator"
          >
            <FileCode className="w-4 h-4 text-sky-400" />
            <span>Tải Vector (.SVG)</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Xuất Ảnh Nền Trắng (.PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-lg shadow-amber-500/10"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang tạo bản vẽ...' : 'Xuất PDF Nền Trắng Chữ Đen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
