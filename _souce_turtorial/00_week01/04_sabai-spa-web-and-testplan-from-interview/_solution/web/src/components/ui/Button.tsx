import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

export type ButtonVariant = 'primary' | 'gold' | 'ghost' | 'ghost-light' | 'danger';

function classes(variant: ButtonVariant, size: 'md' | 'lg' | 'sm', extra?: string) {
  return [styles.btn, styles[`btn-${variant}`], styles[`btn-${size}`], extra].filter(Boolean).join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** บังคับ: ทุกปุ่มต้องมี data-testid (NFR-19) */
  testId: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'sm';
}

export function Button({ testId, variant = 'primary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} data-testid={testId} className={classes(variant, size, className)} {...rest} />;
}

export interface LinkButtonProps {
  testId: string;
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'sm';
  className?: string;
  ariaLabel?: string;
}

export function LinkButton({ testId, href, children, variant = 'primary', size = 'md', className, ariaLabel }: LinkButtonProps) {
  return (
    <Link href={href} data-testid={testId} className={classes(variant, size, className)} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
