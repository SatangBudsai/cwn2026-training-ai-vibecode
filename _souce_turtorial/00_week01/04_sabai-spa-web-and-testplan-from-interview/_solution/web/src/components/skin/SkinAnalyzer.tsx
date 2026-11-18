'use client';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, ErrorMessage, LinkButton, SmartImage } from '@/components/ui';
import { priceText } from '@/components/widgets/price';
import type { UiError } from '@/components/widgets/ui-error';
import { f8 } from '@/i18n/f8';
import { format, pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { classifySkin, MAX_BRIGHTNESS, SKIN_TABLE, type SkinRecommendation } from '@/lib/rules/skin';
import type { Locale, Service, ServicesResponse } from '@/types';
import { brightnessFromFile, brightnessFromSample } from './analyze';
import { SkinPreview } from './SkinPreview';
import styles from './skin.module.css';

const SAMPLE_URL = '/brand/misc/skin-sample.jpg';

export interface SkinAnalyzerProps {
  locale: Locale;
  /** FR-76 · อ่านจาก isSkinPreviewEnabled() ฝั่งเซิร์ฟเวอร์ */
  previewEnabled: boolean;
}

export function SkinAnalyzer({ locale, previewEnabled }: SkinAnalyzerProps) {
  const m = f8[locale];
  const [services, setServices] = useState<Service[] | null>(null);
  const [result, setResult] = useState<SkinRecommendation | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [busy, setBusy] = useState(false);
  const runId = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // ใช้แสดงชื่อ ราคา และสมุนไพรของบริการ · ไม่เกี่ยวกับรูป โหลดไม่ได้ก็ยังแสดงผลและปุ่มจองได้
  useEffect(() => {
    const controller = new AbortController();
    api<ServicesResponse>('/api/services', { locale, signal: controller.signal })
      .then((res) => setServices(res.services))
      .catch(() => {});
    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ block: 'nearest' });
  }, [result]);

  const run = async (measure: () => Promise<number>, onError: UiError) => {
    const id = ++runId.current;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const brightness = await measure();
      if (id === runId.current) setResult(classifySkin(brightness));
    } catch {
      if (id === runId.current) setError(onError);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // ล้างค่าทันที ไม่ให้ช่องเลือกไฟล์ถือชื่อไฟล์หรือตัวไฟล์ไว้ และเลือกรูปเดิมซ้ำได้
    e.target.value = '';
    if (!file) return;
    // บางระบบไม่บอกชนิดไฟล์ (type ว่าง) จึงปล่อยให้ขั้นถอดรหัสเป็นตัวตัดสิน
    if (file.type !== '' && !file.type.startsWith('image/')) {
      setResult(null);
      setError({ code: 'skin-file-type', message: m.skinErrorFileType });
      return;
    }
    void run(() => brightnessFromFile(file), { code: 'skin-image-unreadable', message: m.skinErrorUnreadable });
  };

  const analyzeSample = () => {
    void run(() => brightnessFromSample(SAMPLE_URL), { code: 'skin-image-unreadable', message: m.skinErrorUnreadable });
  };

  const reset = () => {
    runId.current += 1;
    setBusy(false);
    setResult(null);
    setError(null);
  };

  const service = result && services ? services.find((s) => s.id === result.serviceId) : undefined;

  return (
    <div className={styles.layout}>
      <div className={styles.intake}>
        <aside className={styles.privacy} data-testid="skin-privacy-notice">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={styles.privacyIcon}>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
          </svg>
          <div>
            <h2 className={styles.privacyTitle}>{m.skinPrivacyTitle}</h2>
            <ul className={styles.privacyList}>
              <li>{m.skinPrivacyLocal}</li>
              <li>{m.skinPrivacyNoUpload}</li>
              <li>{m.skinPrivacyNoStore}</li>
            </ul>
          </div>
        </aside>

        <div className={styles.choose}>
          <div className={styles.chooseBody}>
            <h2 className={styles.chooseTitle}>{m.skinChooseTitle}</h2>
            <div className={styles.chooseActions}>
              <span className={styles.fileWrap}>
                <input id="skin-file" className={styles.fileInput} data-testid="skin-file" type="file" accept="image/*" disabled={busy} onChange={onFile} />
                <label htmlFor="skin-file" className={styles.fileLabel} data-testid="skin-file-label">
                  {m.skinFileLabel}
                </label>
              </span>
              <Button testId="skin-use-sample" variant="ghost" disabled={busy} onClick={analyzeSample}>
                {m.skinUseSample}
              </Button>
            </div>
          </div>
          <figure className={styles.sample}>
            <SmartImage src={SAMPLE_URL} alt={m.skinSampleAlt} sizes="160px" ratio="1 / 1" rounded />
            <figcaption>{m.skinSampleCaption}</figcaption>
          </figure>
        </div>
      </div>

      <div aria-live="polite">
        {busy && (
          <p className={styles.status} data-testid="skin-status">
            {m.skinAnalyzing}
          </p>
        )}
        {error && (
          <div data-testid="skin-error">
            <ErrorMessage code={error.code} message={error.message} />
          </div>
        )}
        {result && (
          <div ref={resultRef} className={styles.result} data-testid="skin-result" data-band={result.band} data-service={result.serviceId}>
            <div className={styles.resultMain}>
              <h2 className={styles.resultTitle}>{m.skinResultTitle}</h2>
              <div className={styles.meterRow}>
                <span>{m.skinBrightnessLabel}</span>
                <p className={styles.value}>
                  <strong data-testid="skin-brightness">{result.brightness}</strong>
                  <span> / {MAX_BRIGHTNESS}</span>
                </p>
              </div>
              <div className={styles.meter} aria-hidden="true">
                {SKIN_TABLE.map((band) => (
                  <span key={band.band} className={band.band === result.band ? styles.bandOn : styles.band} style={{ flexGrow: band.max - band.min + 1 }} />
                ))}
                <i className={styles.marker} style={{ left: `${(result.brightness / MAX_BRIGHTNESS) * 100}%` }} />
              </div>
              <p className={styles.disclaimer} data-testid="skin-disclaimer">
                {m.skinDisclaimer}
              </p>
              <p className={styles.cleared} data-testid="skin-cleared">
                {m.skinCleared}
              </p>
            </div>

            <div className={styles.service} data-testid="skin-service">
              {service && (
                <SmartImage src={service.imagePath} alt={pick(service.name, locale)} sizes="(max-width: 860px) calc(100vw - 32px), 520px" ratio="16 / 9" />
              )}
              <div className={styles.serviceBody}>
                <p className="eyebrow">{m.recommended}</p>
                {service && <h3 data-testid="skin-service-name">{pick(service.name, locale)}</h3>}
                <p data-testid="skin-reason">{pick(result.reason, locale)}</p>
                {service && (
                  <p className={styles.price}>
                    <strong data-testid="skin-price">{priceText(service.price, locale)}</strong>
                    <span>
                      {m.perPerson} · {format(m.minutes, { n: service.durationMinutes })}
                    </span>
                  </p>
                )}
                {service && service.herbs.length > 0 && (
                  <div className={styles.herbs}>
                    <p className={styles.herbsLabel}>{m.herbsLabel}</p>
                    <ul className={styles.herbList} data-testid="skin-herbs">
                      {service.herbs.map((h) => (
                        <li key={h.id} data-testid={`skin-herb-${h.id}`}>
                          {pick(h.name, locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className={styles.actions}>
                  <LinkButton testId="skin-book" href={`/${locale}/booking?service=${result.serviceId}`} variant="gold">
                    {m.bookThis}
                  </LinkButton>
                  <Button testId="skin-reset" variant="ghost" onClick={reset}>
                    {m.skinReset}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {previewEnabled && <SkinPreview locale={locale} />}
    </div>
  );
}
