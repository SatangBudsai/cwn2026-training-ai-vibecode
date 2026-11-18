import { describe, expect, it } from 'vitest';
import { checkQuizAnswers, QUIZ_QUESTIONS, recommendForQuiz } from './quiz';

const THAI_BLOCK = /[฀-๿]/;
const ALLOWED = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'P01'];

function allCombinations(): string[][] {
  return QUIZ_QUESTIONS.reduce<string[][]>(
    (rows, question) => rows.flatMap((row) => question.options.map((choice) => [...row, choice.id])),
    [[]],
  );
}

describe('แบบทดสอบ BR-50', () => {
  it('มี 4 ข้อพอดี และไม่มีข้อที่ 5', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(4);
    expect(QUIZ_QUESTIONS[4]).toBeUndefined();
  });

  it('ตอบไม่ครบ เกิน หรือผิด ได้ error ของตัวเอง', () => {
    const valid = QUIZ_QUESTIONS.map((question) => question.options[0].id);
    expect(checkQuizAnswers(valid)).toBeNull();
    expect(checkQuizAnswers(undefined)).toBe('quiz-incomplete');
    expect(checkQuizAnswers([])).toBe('quiz-incomplete');
    expect(checkQuizAnswers(valid.slice(0, 3))).toBe('quiz-incomplete');
    expect(checkQuizAnswers([...valid, 'q4-deep'])).toBe('quiz-too-many');
    expect(checkQuizAnswers('q1-relax')).toBe('quiz-invalid-answer');
    expect(checkQuizAnswers(['q1-relax', 'q1-relax', 'q3-60', 'q4-deep'])).toBe('quiz-invalid-answer');
    expect(checkQuizAnswers(['nope', 'q2-body', 'q3-60', 'q4-deep'])).toBe('quiz-invalid-answer');
    expect(checkQuizAnswers([1, 2, 3, 4])).toBe('quiz-invalid-answer');
  });

  it('ทุกชุดคำตอบได้ 1 รายการจาก S01–S07 หรือ P01 พร้อมเหตุผล 3 ภาษา', () => {
    const combinations = allCombinations();
    expect(combinations).toHaveLength(144);
    const reached = new Set<string>();
    for (const answers of combinations) {
      expect(checkQuizAnswers(answers)).toBeNull();
      const result = recommendForQuiz(answers);
      expect(ALLOWED).toContain(result.serviceId);
      expect(result.reason.th).not.toBe('');
      expect(result.reason.en).not.toBe('');
      expect(result.reason.zh).not.toMatch(THAI_BLOCK);
      reached.add(result.serviceId);
    }
    expect([...reached].sort()).toEqual([...ALLOWED].sort());
  });

  it('แถวสำคัญของตารางกฎตรงตามที่ร่าง', () => {
    expect(recommendForQuiz(['q1-tour', 'q2-body', 'q3-120', 'q4-deep']).serviceId).toBe('P01');
    expect(recommendForQuiz(['q1-tour', 'q2-body', 'q3-60', 'q4-deep']).serviceId).toBe('S01');
    expect(recommendForQuiz(['q1-skin', 'q2-face', 'q3-60', 'q4-gentle']).serviceId).toBe('S07');
    expect(recommendForQuiz(['q1-skin', 'q2-body', 'q3-60', 'q4-gentle']).serviceId).toBe('S06');
    expect(recommendForQuiz(['q1-relax', 'q2-feet', 'q3-90', 'q4-deep']).serviceId).toBe('S05');
    expect(recommendForQuiz(['q1-ache', 'q2-back', 'q3-60', 'q4-herbal']).serviceId).toBe('S03');
    expect(recommendForQuiz(['q1-relax', 'q2-body', 'q3-90', 'q4-gentle']).serviceId).toBe('S04');
    expect(recommendForQuiz(['q1-ache', 'q2-back', 'q3-90', 'q4-deep']).serviceId).toBe('S02');
  });

  it('คำถามและตัวเลือกภาษาจีนไม่มีอักขระไทย และรหัสตัวเลือกไม่ซ้ำ', () => {
    const ids = QUIZ_QUESTIONS.flatMap((question) => question.options.map((choice) => choice.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const question of QUIZ_QUESTIONS) {
      expect(question.text.zh).not.toMatch(THAI_BLOCK);
      for (const choice of question.options) expect(choice.text.zh).not.toMatch(THAI_BLOCK);
    }
  });

  it('รัน 20 รอบได้ผลเดียวกันทุกตัวอักษร', () => {
    const answers = ['q1-relax', 'q2-back', 'q3-90', 'q4-gentle'];
    const first = JSON.stringify(recommendForQuiz(answers));
    for (let round = 0; round < 20; round++) {
      expect(JSON.stringify(recommendForQuiz(answers))).toBe(first);
    }
  });
});
