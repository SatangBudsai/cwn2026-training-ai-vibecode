import { Card, LinkButton, SmartImage } from '@/components/ui';
import { f6 } from '@/i18n/f6';
import { format } from '@/i18n/locales';
import { formatBaht, formatDate } from '@/lib/format';
import type { GiftCardDesign, GiftCardSummary, Locale } from '@/types';
import { EmptyState } from './EmptyState';
import styles from './wallet.module.css';

export function GiftCards({ locale, cards }: { locale: Locale; cards: GiftCardSummary[] }) {
  const m = f6[locale];
  const buyHref = `/${locale}/gift-cards`;

  if (cards.length === 0) {
    return (
      <EmptyState locale={locale} testId="wallet-giftcards-empty" title={m.giftEmptyTitle} body={m.giftEmptyBody}>
        <LinkButton testId="wallet-giftcards-buy" href={buyHref} variant="ghost">
          {m.giftBuy}
        </LinkButton>
      </EmptyState>
    );
  }

  const designName: Record<GiftCardDesign, string> = {
    ORCHID: m.designOrchid,
    LOTUS: m.designLotus,
    GOLD: m.designGold,
  };

  return (
    <div className={styles.giftGrid}>
      {cards.map((card) => (
        <Card gold key={card.code} testId={`wallet-giftcard-${card.code}`} className={card.usable ? undefined : styles.giftUnusable}>
          <SmartImage
            src={card.imagePath}
            alt={format(m.giftAlt, { design: designName[card.design] })}
            ratio="3 / 2"
            sizes="(max-width: 640px) 100vw, (max-width: 1040px) 50vw, 360px"
          />
          <div className={styles.giftBody}>
            <p className={styles.giftCode} data-testid={`wallet-giftcard-code-${card.code}`}>
              {card.code}
            </p>
            <dl className={styles.giftFacts}>
              <div>
                <dt>{m.giftBalance}</dt>
                <dd className={styles.giftBalance} data-testid={`wallet-giftcard-balance-${card.code}`}>
                  {formatBaht(card.balance, locale)}
                </dd>
              </div>
              <div>
                <dt>{m.giftInitial}</dt>
                <dd data-testid={`wallet-giftcard-initial-${card.code}`}>{formatBaht(card.initialValue, locale)}</dd>
              </div>
              <div>
                <dt>{m.giftExpires}</dt>
                <dd data-testid={`wallet-giftcard-expires-${card.code}`}>{formatDate(card.expiresOn, locale)}</dd>
              </div>
            </dl>
            {card.expired ? (
              <p className={styles.giftNotice} data-testid={`wallet-giftcard-expired-${card.code}`}>
                {m.giftExpired}
              </p>
            ) : (
              card.balance <= 0 && (
                <p className={styles.giftNotice} data-testid={`wallet-giftcard-no-balance-${card.code}`}>
                  {m.giftNoBalance}
                </p>
              )
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
