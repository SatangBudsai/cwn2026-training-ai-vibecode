import { describe, expect, it } from 'vitest';
import { bangkokInstant } from '@/lib/date';
import { assignTherapists, computeSlots, rankTherapists, type BusySpan, type DayOccupancy, type RatedTherapist } from './assign';
import type { TherapistId } from '@/types';

const RATING: Record<TherapistId, number | null> = { T01: 5.0, T02: 4.5, T03: 4.4, T04: null, T05: 4.6, T06: 4.0 };

function team(...ids: TherapistId[]): RatedTherapist[] {
  return ids.map((id) => ({ id, rating: RATING[id] }));
}

const S01 = team('T01', 'T02', 'T03', 'T04', 'T05', 'T06');
const S04 = team('T01', 'T03', 'T05');
const S06 = team('T03', 'T04');
const S07 = team('T04', 'T05');
const NONE = new Set<string>();

function busy(therapistId: string, date: string, start: string, end: string): BusySpan {
  return { therapistId, start: bangkokInstant(date, start).getTime(), end: bangkokInstant(date, end).getTime() };
}

function occupancy(items: BusySpan[], suite: [string, string, string][] = []): DayOccupancy {
  return {
    therapists: items,
    suite: suite.map(([d, s, e]) => ({ start: bangkokInstant(d, s).getTime(), end: bangkokInstant(d, e).getTime() })),
  };
}

function times(input: { date: string; dur: number; party: number; team: RatedTherapist[]; occ: DayOccupancy; pick?: string }) {
  return computeSlots({
    date: input.date,
    durationMinutes: input.dur,
    partySize: input.party,
    therapists: input.team,
    therapistId: input.pick,
    occupancy: input.occ,
  });
}

describe('จัดนักบำบัด', () => {
  it('E236 ฟังก์ชันจัดคน: 2 คนคะแนนปัดแล้ว 4.5 เท่ากัน เลือกรหัสน้อยกว่า', () => {
    const tied: RatedTherapist[] = [
      { id: 'T06', rating: 4.5 },
      { id: 'T02', rating: 4.5 },
    ];
    expect(assignTherapists(tied, NONE, 1)).toEqual(['T02']);
    expect(rankTherapists(tied).map((t) => t.id)).toEqual(['T02', 'T06']);
  });

  it('FR-08 ลำดับ "ใครก็ได้" ของ S01 ตามคะแนนปัดแล้ว ไม่มีรีวิวหลังสุด', () => {
    expect(rankTherapists(S01).map((t) => t.id)).toEqual(['T01', 'T05', 'T02', 'T03', 'T06', 'T04']);
  });

  it('FR-08 ไม่ว่างแล้วได้คนถัดไป · คนไม่พอคืน null', () => {
    expect(assignTherapists(S01, new Set(['T01']), 1)).toEqual(['T05']);
    expect(assignTherapists(S06, new Set(['T03']), 1)).toEqual(['T04']);
    expect(assignTherapists(S06, NONE, 1)).toEqual(['T03']);
    expect(assignTherapists(S06, NONE, 3)).toBeNull();
    expect(assignTherapists(S01, new Set(['T01']), 5)).toHaveLength(5);
    expect(assignTherapists(S01, new Set(['T01']), 6)).toBeNull();
  });

  it('FR-08 ไม่แก้ลำดับของรายการเดิม', () => {
    const input = team('T04', 'T01');
    rankTherapists(input);
    expect(input.map((t) => t.id)).toEqual(['T04', 'T01']);
  });
});

describe('รอบว่างตามคิวของวันนั้น', () => {
  const B10 = occupancy([busy('T01', '2026-06-22', '14:00', '15:00')]);

  it('BR-05 T01 มีคิว 14:00–15:00: 13:00 ได้ · 13:30 14:00 14:30 ไม่ได้ · 15:00 15:30 ได้', () => {
    const shown = times({ date: '2026-06-22', dur: 60, party: 1, team: S01, occ: B10, pick: 'T01' }).map((s) => s.time);
    expect(shown).toContain('13:00');
    expect(shown).not.toContain('13:30');
    expect(shown).not.toContain('14:00');
    expect(shown).not.toContain('14:30');
    expect(shown).toContain('15:00');
    expect(shown).toContain('15:30');
  });

  it('BR-11 S01 มี 1 คนไม่ว่าง: 5 คนได้ · 6 คนไม่มีรอบนี้', () => {
    const at = (party: number) =>
      times({ date: '2026-06-22', dur: 60, party, team: S01, occ: B10 }).some((s) => s.time === '14:00');
    expect(at(5)).toBe(true);
    expect(at(6)).toBe(false);
  });

  it('FR-08 คนจัดให้ของรอบที่ T01 ไม่ว่างคือ T05', () => {
    const slot = times({ date: '2026-06-22', dur: 60, party: 1, team: S01, occ: B10 }).find((s) => s.time === '14:00');
    expect(slot?.autoAssignIds).toEqual(['T05']);
    expect(slot?.availableTherapistIds).toEqual(['T05', 'T02', 'T03', 'T06', 'T04']);
  });

  it('BR-11 S06 ถือ T03 และ T04 เวลา 16:00–17:00: 15:00 กับ 17:00 ได้ ที่เหลือไม่ได้', () => {
    const occ = occupancy([busy('T03', '2026-06-23', '16:00', '17:00'), busy('T04', '2026-06-23', '16:00', '17:00')]);
    const shown = times({ date: '2026-06-23', dur: 60, party: 1, team: S06, occ }).map((s) => s.time);
    expect(shown).toContain('15:00');
    expect(shown).not.toContain('15:30');
    expect(shown).not.toContain('16:00');
    expect(shown).not.toContain('16:30');
    expect(shown).toContain('17:00');
  });

  it('BR-11 ถือครบทุกคนแล้วรอบหาย', () => {
    const occ = occupancy(S01.map((t) => busy(t.id, '2026-06-26', '12:00', '13:00')));
    const shown = times({ date: '2026-06-26', dur: 60, party: 1, team: S01, occ }).map((s) => s.time);
    expect(shown).not.toContain('12:00');
    expect(shown).toContain('11:00');
    expect(shown).toContain('13:00');
  });

  it('BR-07 Couple Suite 18:00–19:00: เริ่ม 18:30 ไม่ได้ · 19:00 19:30 ได้ · คู่เท่านั้นที่ติดห้อง', () => {
    const occ = occupancy(
      [busy('T01', '2026-06-20', '18:00', '19:00'), busy('T05', '2026-06-20', '18:00', '19:00')],
      [['2026-06-20', '18:00', '19:00']],
    );
    const couple = times({ date: '2026-06-20', dur: 60, party: 2, team: S01, occ }).map((s) => s.time);
    expect(couple).not.toContain('17:30');
    expect(couple).not.toContain('18:00');
    expect(couple).not.toContain('18:30');
    expect(couple).toContain('19:00');
    expect(couple).toContain('19:30');
    const trio = times({ date: '2026-06-20', dur: 60, party: 3, team: S01, occ }).map((s) => s.time);
    expect(trio).toContain('18:00');
  });

  it('FR-15 คู่ S04 ห้องว่างแต่เหลือคนเดียวไม่มีรอบ · 1 คนยังได้ T05', () => {
    const occ = occupancy([busy('T01', '2026-06-28', '11:00', '12:30'), busy('T03', '2026-06-28', '11:00', '12:30')]);
    expect(times({ date: '2026-06-28', dur: 90, party: 2, team: S04, occ }).some((s) => s.time === '11:00')).toBe(false);
    const single = times({ date: '2026-06-28', dur: 90, party: 1, team: S04, occ }).find((s) => s.time === '11:00');
    expect(single?.autoAssignIds).toEqual(['T05']);
  });

  it('FR-15 คู่ S07 T04 ไม่ว่าง เหลือ T05 คนเดียว', () => {
    const occ = occupancy([busy('T04', '2026-06-23', '16:00', '17:00')]);
    expect(times({ date: '2026-06-23', dur: 60, party: 2, team: S07, occ }).some((s) => s.time === '16:00')).toBe(false);
  });

  it('BR-11 เลือกคนเองแล้วทำบริการไม่ได้ไม่มีรอบ · มีผลเฉพาะ 1 คน', () => {
    const occ = occupancy([]);
    expect(times({ date: '2026-06-17', dur: 60, party: 1, team: S06, occ, pick: 'T01' })).toEqual([]);
    expect(times({ date: '2026-06-17', dur: 60, party: 2, team: S06, occ, pick: 'T01' }).length).toBeGreaterThan(0);
  });
});
