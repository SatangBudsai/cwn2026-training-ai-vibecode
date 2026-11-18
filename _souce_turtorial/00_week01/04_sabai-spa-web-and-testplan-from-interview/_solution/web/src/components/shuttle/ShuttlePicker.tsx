'use client';
import { useId, useState, type ChangeEvent } from 'react';
import { ErrorMessage } from '@/components/ui';
import { f7 } from '@/i18n/f7';
import { pick } from '@/i18n/locales';
import type { Hotel, HotelId, Locale, ShuttleInput } from '@/types';
import styles from './shuttle-picker.module.css';

export interface ShuttlePickerProps {
  locale: Locale;
  hotels: Hotel[];
  /** true = ต้องมีรถเสมอ (P01) ไม่มีช่องติ๊กปิด */
  required?: boolean;
  /** null = ไม่ใช้รถ */
  value: ShuttleInput | null;
  onChange: (value: ShuttleInput | null) => void;
  /** error จาก API เช่น distance-too-far แสดงใต้ช่อง */
  error?: { code: string; message: string } | null;
  /** ขึ้นต้น data-testid · default 'shuttle' */
  testIdPrefix?: string;
}

type Mode = 'hotel' | 'distance';

/**
 * ติ๊กใช้รถแล้วยังไม่เลือกอะไร ส่ง {} เพื่อให้ API ตอบ distance-required (FR-53)
 * ระยะส่งข้อความตามที่พิมพ์ ไม่ปัด ไม่ตัด ให้ API ตรวจ (BR-38) · ไม่คำนวณค่ารถเอง
 */
export function ShuttlePicker({ locale, hotels, required = false, value, onChange, error, testIdPrefix = 'shuttle' }: ShuttlePickerProps) {
  const m = f7[locale];
  const id = useId();
  const [modeChoice, setModeChoice] = useState<Mode>('hotel');

  const active = required || value !== null;
  const hotelId = value?.hotelId ?? '';
  const distance = value?.distanceKm ?? '';
  const mode: Mode = value?.distanceKm !== undefined ? 'distance' : value?.hotelId ? 'hotel' : modeChoice;
  const missing = !hotelId && value?.distanceKm === undefined;

  const onToggle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked ? {} : null);
  };
  const onMode = (next: Mode) => {
    setModeChoice(next);
    // เปลี่ยนวิธีแล้วล้างค่าเดิม จึงไม่มีทางส่งทั้งโรงแรมและระยะพร้อมกัน
    if (next !== mode) onChange({});
  };
  const onHotel = (e: ChangeEvent<HTMLSelectElement>) => {
    setModeChoice('hotel');
    onChange(e.target.value ? { hotelId: e.target.value as HotelId } : {});
  };
  const onDistance = (e: ChangeEvent<HTMLInputElement>) => {
    setModeChoice('distance');
    onChange(e.target.value === '' ? {} : { distanceKm: e.target.value });
  };

  return (
    <fieldset className={styles.picker} data-testid={`${testIdPrefix}-picker`}>
      <legend className={styles.legend}>{m.pickerLegend}</legend>

      {!required && (
        <label className={styles.toggle}>
          <input type="checkbox" checked={active} onChange={onToggle} data-testid={`${testIdPrefix}-toggle`} />
          <span>{m.pickerToggle}</span>
        </label>
      )}

      {active && (
        <div className={styles.choices}>
          <div className={mode === 'hotel' ? styles.choiceOn : styles.choice}>
            <label className={styles.choiceHead}>
              <input
                type="radio"
                name={`${id}-mode`}
                checked={mode === 'hotel'}
                onChange={() => onMode('hotel')}
                data-testid={`${testIdPrefix}-mode-hotel`}
              />
              <span>{m.pickerModeHotel}</span>
            </label>
            <select
              className="select"
              aria-label={m.pickerModeHotel}
              value={hotelId}
              onChange={onHotel}
              data-testid={`${testIdPrefix}-hotel`}
            >
              <option value="">{m.pickerHotelPlaceholder}</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {`${pick(h.name, locale)} · ${h.distanceKm} ${m.km}`}
                </option>
              ))}
            </select>
          </div>

          <div className={mode === 'distance' ? styles.choiceOn : styles.choice}>
            <label className={styles.choiceHead}>
              <input
                type="radio"
                name={`${id}-mode`}
                checked={mode === 'distance'}
                onChange={() => onMode('distance')}
                data-testid={`${testIdPrefix}-mode-distance`}
              />
              <span>{m.pickerModeDistance}</span>
            </label>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label={m.pickerModeDistance}
              placeholder={m.pickerDistancePlaceholder}
              value={distance}
              onChange={onDistance}
              data-testid={`${testIdPrefix}-distance`}
            />
            <span className={styles.unit}>{m.pickerDistanceUnit}</span>
          </div>
        </div>
      )}

      {active && missing && !error && (
        <p className={styles.hint} data-testid={`${testIdPrefix}-hint`}>
          {m.pickerNeedDistance}
        </p>
      )}
      {active && error && <ErrorMessage code={error.code} message={error.message} />}

      <ul className={styles.rules} data-testid={`${testIdPrefix}-rules`}>
        <li>{m.ruleFree}</li>
        <li>{m.rulePaid}</li>
        <li>{m.ruleFar}</li>
        <li>{m.ruleCar}</li>
        <li>{m.ruleUnlimited}</li>
        <li>{m.rulePackage}</li>
      </ul>
    </fieldset>
  );
}
