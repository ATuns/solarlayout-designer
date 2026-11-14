/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  allowZero?: boolean;
  errorMessage?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  label,
  unit,
  min,
  max,
  step = 1,
  placeholder,
  allowZero = false,
  errorMessage = 'Giá trị phải lớn hơn 0',
  className = '',
  inputClassName = '',
  disabled = false,
}) => {
  const inputId = useId();

  // Cho phép chuỗi rỗng "" để người dùng có thể xóa hết số và nhập số mới
  const [textValue, setTextValue] = useState<string>(() => {
    if (value === 0 && !allowZero) return '';
    return isNaN(value) ? '' : String(value);
  });

  // Đồng bộ khi value từ ngoài thay đổi (ví dụ khi chọn preset)
  useEffect(() => {
    const parsed = parseFloat(textValue);
    if (parsed !== value && !(textValue === '' && value === 0 && !allowZero)) {
      setTextValue(value === 0 && !allowZero ? '' : String(value));
    }
  }, [value, allowZero]);

  const numericVal = parseFloat(textValue);
  const isEmpty = textValue.trim() === '';
  const isZero = numericVal === 0;
  const isBelowMin = min !== undefined && !isEmpty && !isNaN(numericVal) && numericVal < min;

  // Lỗi khi: rỗng, hoặc là 0 (nếu không cho phép 0), hoặc nhỏ hơn min
  const hasError = isEmpty || (isZero && !allowZero) || isBelowMin;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);

    if (raw.trim() === '') {
      // Khi xóa hết ô nhập, truyền 0 để hệ thống biết đang trống
      onChange(0);
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-400"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={textValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder || (allowZero ? '0' : 'Nhập số...')}
          className={`w-full bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors focus:outline-none ${
            unit ? 'pr-7' : ''
          } ${
            hasError
              ? 'border-2 border-rose-500 bg-rose-500/10 text-rose-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
              : 'border border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-950' : ''} ${inputClassName}`}
        />

        {unit && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono pointer-events-none select-none">
            {unit}
          </span>
        )}
      </div>

      {hasError && (
        <div className="flex items-center gap-1 text-[10px] text-rose-400 font-medium animate-fade-in leading-tight pt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{isEmpty ? 'Vui lòng nhập giá trị' : isZero && !allowZero ? errorMessage : isBelowMin ? `Tối thiểu ${min}` : errorMessage}</span>
        </div>
      )}
    </div>
  );
};
