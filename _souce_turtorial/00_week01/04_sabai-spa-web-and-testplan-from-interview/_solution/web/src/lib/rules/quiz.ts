// แบบทดสอบ 4 ข้อ (BR-50) และตารางกฎตายตัว · ฟังก์ชันล้วน ไม่สุ่ม ไม่เรียกบริการภายนอก (NFR-14)
import { a5Text, type A5Key } from '@/i18n/a5';
import type { I18nText, QuizQuestion, ServiceId } from '@/types';

type Goal = 'relax' | 'ache' | 'skin' | 'tour';
type Focus = 'body' | 'back' | 'feet' | 'face';
type Minutes = '60' | '90' | '120';
type Touch = 'gentle' | 'deep' | 'herbal';

function option(id: string, text: A5Key): { id: string; text: I18nText } {
  return { id, text: a5Text(text) };
}

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'q1',
    text: a5Text('quizQ1'),
    options: [
      option('q1-relax', 'quizQ1Relax'),
      option('q1-ache', 'quizQ1Ache'),
      option('q1-skin', 'quizQ1Skin'),
      option('q1-tour', 'quizQ1Tour'),
    ],
  },
  {
    id: 'q2',
    text: a5Text('quizQ2'),
    options: [
      option('q2-body', 'quizQ2Body'),
      option('q2-back', 'quizQ2Back'),
      option('q2-feet', 'quizQ2Feet'),
      option('q2-face', 'quizQ2Face'),
    ],
  },
  {
    id: 'q3',
    text: a5Text('quizQ3'),
    options: [
      option('q3-60', 'quizQ360'),
      option('q3-90', 'quizQ390'),
      option('q3-120', 'quizQ3120'),
    ],
  },
  {
    id: 'q4',
    text: a5Text('quizQ4'),
    options: [
      option('q4-gentle', 'quizQ4Gentle'),
      option('q4-deep', 'quizQ4Deep'),
      option('q4-herbal', 'quizQ4Herbal'),
    ],
  },
];

interface QuizRule {
  goal?: Goal[];
  focus?: Focus[];
  time?: Minutes[];
  touch?: Touch[];
  serviceId: ServiceId;
  reason: A5Key;
}

/** เลือกแถวแรกที่ตรง · แถวสุดท้ายไม่มีเงื่อนไข จึงทุกชุดคำตอบได้ผล */
const QUIZ_RULES: readonly QuizRule[] = [
  { goal: ['tour'], time: ['120'], serviceId: 'P01', reason: 'quizReasonPackage' },
  { focus: ['face'], serviceId: 'S07', reason: 'quizReasonFacial' },
  { goal: ['skin'], serviceId: 'S06', reason: 'quizReasonScrub' },
  { focus: ['feet'], serviceId: 'S05', reason: 'quizReasonFoot' },
  { touch: ['herbal'], serviceId: 'S03', reason: 'quizReasonCompress' },
  { touch: ['gentle'], time: ['90', '120'], serviceId: 'S04', reason: 'quizReasonAroma' },
  { touch: ['gentle'], serviceId: 'S05', reason: 'quizReasonGentleShort' },
  { touch: ['deep'], time: ['90', '120'], serviceId: 'S02', reason: 'quizReasonThai90' },
  { serviceId: 'S01', reason: 'quizReasonThai60' },
];

export type QuizErrorCode = 'quiz-incomplete' | 'quiz-too-many' | 'quiz-invalid-answer';

/** answers คือรหัสตัวเลือกเรียงตามข้อ · ไม่ส่งถือว่ายังไม่ตอบ */
export function checkQuizAnswers(answers: unknown): QuizErrorCode | null {
  if (answers === undefined || answers === null) return 'quiz-incomplete';
  if (!Array.isArray(answers)) return 'quiz-invalid-answer';
  if (answers.length < QUIZ_QUESTIONS.length) return 'quiz-incomplete';
  if (answers.length > QUIZ_QUESTIONS.length) return 'quiz-too-many';
  const valid = answers.every((answer, index) =>
    QUIZ_QUESTIONS[index].options.some((choice) => choice.id === answer),
  );
  return valid ? null : 'quiz-invalid-answer';
}

function answerValue<T extends string>(answer: string): T {
  return answer.slice(answer.indexOf('-') + 1) as T;
}

function matches<T>(allowed: T[] | undefined, value: T): boolean {
  return allowed === undefined || allowed.includes(value);
}

/** เรียกหลัง checkQuizAnswers ผ่านแล้ว */
export function recommendForQuiz(answers: readonly string[]): { serviceId: ServiceId; reason: I18nText } {
  const goal = answerValue<Goal>(answers[0]);
  const focus = answerValue<Focus>(answers[1]);
  const time = answerValue<Minutes>(answers[2]);
  const touch = answerValue<Touch>(answers[3]);
  const rule = QUIZ_RULES.find(
    (row) =>
      matches(row.goal, goal) && matches(row.focus, focus) && matches(row.time, time) && matches(row.touch, touch),
  );
  // แถวสุดท้ายไม่มีเงื่อนไข จึงหาเจอเสมอ
  const { serviceId, reason } = rule as QuizRule;
  return { serviceId, reason: a5Text(reason) };
}
