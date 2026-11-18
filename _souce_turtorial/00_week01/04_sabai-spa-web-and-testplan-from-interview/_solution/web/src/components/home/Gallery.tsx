import { LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { f1 } from '@/i18n/f1';
import type { Locale } from '@/types';
import { SectionHead } from './SectionHead';
import styles from './home.module.css';

type MessageKey = keyof (typeof f1)['th'];

/**
 * ratio ต่างกันเพื่อให้ masonry มีจังหวะ · รูปต้นฉบับกว้าง 3:2 เมื่อครอปเป็นกล่องแคบจะถูกขยายตามความสูง
 * zoom คืออัตราขยายนั้น ใช้คำนวณ sizes ให้เลือกไฟล์ขนาดพอดี
 */
const ITEMS: { id: string; src: string; ratio: string; zoom: number; label: MessageKey }[] = [
  { id: 'exterior-day', src: '/brand/shop/exterior-day.jpg', ratio: '4 / 5', zoom: 1.875, label: 'galleryExteriorDay' },
  { id: 'lobby', src: '/brand/shop/lobby.jpg', ratio: '3 / 2', zoom: 1, label: 'galleryLobby' },
  { id: 'couple-suite', src: '/brand/shop/couple-suite.jpg', ratio: '1 / 1', zoom: 1.5, label: 'galleryCoupleSuite' },
  { id: 'foot-lounge', src: '/brand/shop/foot-lounge.jpg', ratio: '3 / 2', zoom: 1, label: 'galleryFootLounge' },
  { id: 'garden-sala', src: '/brand/shop/garden-sala.jpg', ratio: '4 / 5', zoom: 1.875, label: 'galleryGardenSala' },
  { id: 'herb-bar', src: '/brand/shop/herb-bar.jpg', ratio: '3 / 2', zoom: 1, label: 'galleryHerbBar' },
  { id: 'herbal-steam', src: '/brand/shop/herbal-steam.jpg', ratio: '4 / 5', zoom: 1.875, label: 'galleryHerbalSteam' },
  { id: 'welcome-tea', src: '/brand/shop/welcome-tea.jpg', ratio: '1 / 1', zoom: 1, label: 'galleryWelcomeTea' },
  { id: 'team-group', src: '/brand/shop/team-group.jpg', ratio: '3 / 2', zoom: 1, label: 'galleryTeamGroup' },
];

function sizesFor(zoom: number) {
  return `(min-width: 1240px) ${Math.round(380 * zoom)}px, (min-width: 900px) ${Math.round(33 * zoom)}vw, ${Math.round(50 * zoom)}vw`;
}

export function Gallery({ locale }: { locale: Locale }) {
  const m = f1[locale];
  return (
    <Section testId="home-gallery" className={styles.roomy}>
      <SectionHead eyebrow={m.galleryEyebrow} title={m.galleryTitle} center />
      <div className={styles.masonry}>
        {ITEMS.map((item) => (
          <Reveal key={item.id} as="figure" className={styles.masonryItem}>
            <div data-testid={`home-gallery-${item.id}`}>
              <SmartImage src={item.src} alt={m[item.label]} ratio={item.ratio} zoom rounded sizes={sizesFor(item.zoom)} />
            </div>
            <figcaption className={styles.masonryCaption}>{m[item.label]}</figcaption>
          </Reveal>
        ))}
      </div>
      <Reveal className={styles.moreRow}>
        <LinkButton testId="home-gallery-all" href={`/${locale}/gallery`} variant="ghost">
          {m.galleryAll}
        </LinkButton>
      </Reveal>
    </Section>
  );
}
