import { MoodPicker } from '@/components/widgets/MoodPicker';
import type { Locale } from '@/types';

/** variant="section" ของ F8 มีพื้นหลัง หัวข้อ และ container ในตัวแล้ว · หน้าแรกจึงไม่ครอบ Section ซ้ำ */
export function MoodSection({ locale }: { locale: Locale }) {
  return (
    <div data-testid="home-mood">
      <MoodPicker locale={locale} variant="section" />
    </div>
  );
}
