'use client';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button, ErrorMessage } from '@/components/ui';
import { f8 } from '@/i18n/f8';
import { format, pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { BookingDetail, ChatRequest, ChatResponse, ChatState, Locale, QuoteResponse } from '@/types';
import { priceText } from './price';
import { toUiError, type UiError } from './ui-error';
import styles from './chat.module.css';

export interface ChatWidgetProps {
  locale: Locale;
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  /** ภาษาของคำตอบตามที่ API บอก (FR-58) */
  language?: Locale;
  quote?: QuoteResponse;
  booking?: BookingDetail;
}

type Messages = (typeof f8)[Locale];

const SUGGESTIONS = [
  { id: 'hours', label: 'chatSuggestHours', ask: 'chatSuggestHoursAsk' },
  { id: 'price', label: 'chatSuggestPrice', ask: 'chatSuggestPriceAsk' },
  { id: 'book', label: 'chatSuggestBook', ask: 'chatSuggestBookAsk' },
] as const;

/** แชตมุมขวาล่างทุกหน้า · ไม่มีรูปในแผง · คำตอบมาจาก POST /api/chat เท่านั้น */
export function ChatWidget({ locale }: ChatWidgetProps) {
  const m = f8[locale];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatState, setChatState] = useState<ChatState | undefined>(undefined);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const sendingRef = useRef(false);
  const wasOpen = useRef(false);
  const openRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // จอสัมผัสไม่เด้งคีย์บอร์ดขึ้นมาบังคำถามตัวอย่าง
      if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
      else panelRef.current?.focus();
    } else if (wasOpen.current) {
      openRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, sending, open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    try {
      const body: ChatRequest = { message: text, state: chatState };
      const res = await api<ChatResponse>('/api/chat', { locale, body });
      setChatState(res.state);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: res.reply, language: res.language, quote: res.quote, booking: res.booking },
      ]);
    } catch (e) {
      // คืนข้อความให้ส่งใหม่ได้โดยลำดับข้อความไม่ซ้ำ
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
      setError(toUiError(e, m.errorNetwork));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  if (!open) {
    return (
      <button ref={openRef} type="button" className={styles.fab} data-testid="chat-open" aria-label={m.chatOpen} title={m.chatOpen} onClick={() => setOpen(true)}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-8.6 8.2 9 9 0 0 1-3.6-.7L4 20.5l1.4-4.1A7.9 7.9 0 0 1 3.8 11.5a8.4 8.4 0 0 1 8.6-8.2 8.4 8.4 0 0 1 8.6 8.2Z" />
          <path d="M8.5 11.5h.01M12.4 11.5h.01M16.3 11.5h.01" strokeWidth="2.2" />
        </svg>
      </button>
    );
  }

  return (
    <div ref={panelRef} className={styles.panel} role="dialog" aria-label={m.chatTitle} tabIndex={-1} data-testid="chat-panel" onKeyDown={onKeyDown}>
      <header className={styles.head}>
        <div>
          <p className={styles.title}>{m.chatTitle}</p>
          <p className={styles.subtitle}>{m.chatSubtitle}</p>
        </div>
        <button type="button" className={styles.close} data-testid="chat-close" aria-label={m.chatClose} title={m.chatClose} onClick={() => setOpen(false)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div ref={logRef} className={styles.log} role="log" aria-live="polite" data-testid="chat-log">
        <p className={styles.welcome} data-testid="chat-welcome">
          {m.chatWelcome}
        </p>
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? styles.rowUser : styles.rowBot}>
            <span className={styles.srOnly}>{msg.role === 'user' ? m.chatYou : m.chatBot}: </span>
            <div className={msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot} lang={msg.language} data-testid={`chat-message-${i}`} data-role={msg.role}>
              {msg.text}
            </div>
            {msg.quote && <QuoteSummary quote={msg.quote} index={i} locale={locale} m={m} />}
            {msg.booking && <BookingSummary booking={msg.booking} index={i} locale={locale} m={m} />}
          </div>
        ))}
        {sending && (
          <p className={styles.typing} data-testid="chat-typing">
            {m.chatTyping}
          </p>
        )}
      </div>

      {error && (
        <div className={styles.error} data-testid="chat-error">
          <ErrorMessage code={error.code} message={error.message} />
        </div>
      )}

      <div className={styles.suggest}>
        {SUGGESTIONS.map((s) => (
          <button key={s.id} type="button" className={styles.chip} data-testid={`chat-suggest-${s.id}`} disabled={sending} onClick={() => void send(m[s.ask])}>
            {m[s.label]}
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          ref={inputRef}
          className={`input ${styles.input}`}
          data-testid="chat-input"
          type="text"
          value={input}
          maxLength={500}
          autoComplete="off"
          aria-label={m.chatInputLabel}
          placeholder={m.chatInputPlaceholder}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button testId="chat-send" type="submit" size="sm" className={styles.send} disabled={sending || input.trim() === ''}>
          {m.chatSend}
        </Button>
      </form>
    </div>
  );
}

function QuoteSummary({ quote, index, locale, m }: { quote: QuoteResponse; index: number; locale: Locale; m: Messages }) {
  const { lines } = quote;
  return (
    <div className={styles.summary} data-testid={`chat-quote-${index}`}>
      <p className={styles.summaryTitle}>{m.chatQuoteTitle}</p>
      <dl className={styles.summaryList}>
        <div className={styles.summaryRow}>
          <dt>{m.chatQuoteFull}</dt>
          <dd>{priceText(lines.fullPrice, locale)}</dd>
        </div>
        {lines.discountAmount > 0 && (
          <div className={styles.summaryRow}>
            <dt>{format(m.chatQuoteDiscount, { percent: lines.discountPercent })}</dt>
            <dd>{priceText(-lines.discountAmount, locale)}</dd>
          </div>
        )}
        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <dt>{m.chatQuotePay}</dt>
          <dd data-testid={`chat-quote-total-${index}`}>{priceText(lines.payAtShop, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}

function BookingSummary({ booking, index, locale, m }: { booking: BookingDetail; index: number; locale: Locale; m: Messages }) {
  return (
    <div className={styles.summary} data-testid={`chat-booking-${index}`}>
      <p className={styles.summaryTitle}>{m.chatBookingTitle}</p>
      <p className={styles.code}>
        <span>{m.chatBookingCode}</span>
        <strong data-testid={`chat-booking-code-${index}`}>{booking.bookingCode}</strong>
      </p>
      <p>{pick(booking.serviceName, locale)}</p>
      <p>
        {formatDate(booking.date, locale)} · {booking.time}–{booking.endTime} · {format(m.chatParty, { n: booking.partySize })}
      </p>
      <p className={styles.summaryTotal}>
        {m.chatQuotePay} {priceText(booking.lines.payAtShop, locale)}
      </p>
    </div>
  );
}
