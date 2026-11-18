import Image, { type ImageProps } from 'next/image';
import styles from './ui.module.css';

export interface SmartImageProps extends Omit<ImageProps, 'sizes' | 'alt' | 'fill'> {
  /** บังคับ: ทุกรูปต้องบอกขนาดที่ใช้จริง */
  sizes: string;
  /** บังคับ: ทุกรูปมีคำบรรยายตามภาษา ('' เฉพาะรูปประดับ) */
  alt: string;
  /** อัตราส่วนกล่องรูป เช่น '4 / 3' · รูปจะ cover เต็มกล่อง */
  ratio?: string;
  /** ซูมเบา ๆ เมื่อชี้ */
  zoom?: boolean;
  wrapperClassName?: string;
  rounded?: boolean;
}

/** ห่อ next/image: กล่องอัตราส่วนคงที่ (กัน layout shift) พื้นครีม · รูปอยู่ใน /brand /placeholder เท่านั้น */
export function SmartImage({ ratio = '4 / 3', zoom, wrapperClassName, rounded, className, style, sizes, alt, ...rest }: SmartImageProps) {
  const wrap = [styles.imgBox, zoom && styles.imgZoom, rounded && styles.imgRounded, wrapperClassName].filter(Boolean).join(' ');
  return (
    <div className={wrap} style={{ aspectRatio: ratio }}>
      <Image {...rest} alt={alt} fill sizes={sizes} className={className} style={{ objectFit: 'cover', ...style }} />
    </div>
  );
}
