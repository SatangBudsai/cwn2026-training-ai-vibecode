'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, ErrorMessage, LinkButton, SmartImage } from '@/components/ui';
import { priceText } from '@/components/widgets/price';
import { toUiError, type UiError } from '@/components/widgets/ui-error';
import { f8 } from '@/i18n/f8';
import { format, pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import type { Locale, QuizQuestion, QuizQuestionsResponse, QuizRequest, QuizResponse } from '@/types';
import styles from './quiz.module.css';

export function QuizClient({ locale }: { locale: Locale }) {
  const m = f8[locale];
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResponse | null>(null);
  const [loadError, setLoadError] = useState<UiError | null>(null);
  const [submitError, setSubmitError] = useState<UiError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const quizRef = useRef<HTMLDivElement>(null);
  const restarted = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    api<QuizQuestionsResponse>('/api/quiz', { locale, signal: controller.signal })
      .then((res) => setQuestions(res.questions))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setLoadError(toUiError(e, m.errorNetwork));
      });
    return () => controller.abort();
  }, [locale, m.errorNetwork, reloadKey]);

  useEffect(() => {
    if (result) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ block: 'start' });
    } else if (restarted.current) {
      // ปุ่มทำใหม่หายไปพร้อมผลลัพธ์ จึงย้ายโฟกัสกลับมาที่ต้นแบบทดสอบ
      restarted.current = false;
      quizRef.current?.focus({ preventScroll: true });
    }
  }, [result]);

  const total = questions?.length ?? 0;
  const answered = questions ? questions.filter((q) => answers[q.id]).length : 0;
  const complete = total > 0 && answered === total;

  const submit = async () => {
    if (!questions || !complete || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: QuizRequest = { answers: questions.map((q) => answers[q.id]) };
      setResult(await api<QuizResponse>('/api/quiz', { locale, body }));
    } catch (e) {
      setSubmitError(toUiError(e, m.errorNetwork));
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    restarted.current = true;
    setAnswers({});
    setResult(null);
    setSubmitError(null);
  };

  if (loadError) {
    return (
      <div className={styles.center} data-testid="quiz-load-error">
        <ErrorMessage code={loadError.code} message={loadError.message} />
        <Button
          testId="quiz-retry"
          variant="ghost"
          onClick={() => {
            setLoadError(null);
            setReloadKey((k) => k + 1);
          }}
        >
          {m.quizRetry}
        </Button>
      </div>
    );
  }

  if (!questions) {
    return (
      <p className={styles.loading} data-testid="quiz-loading" role="status">
        {m.quizLoading}
      </p>
    );
  }

  if (result) {
    const name = pick(result.service.name, locale);
    return (
      <div ref={resultRef} tabIndex={-1} className={styles.result} data-testid="quiz-result" data-service={result.serviceId}>
        <SmartImage src={result.service.imagePath} alt={name} sizes="(max-width: 760px) calc(100vw - 32px), 520px" ratio="4 / 3" wrapperClassName={styles.resultImage} />
        <div className={styles.resultBody}>
          <p className="eyebrow">{m.recommended}</p>
          <h2 data-testid="quiz-service-name">{name}</h2>
          <p data-testid="quiz-reason">{pick(result.reason, locale)}</p>
          <p className={styles.price}>
            <strong data-testid="quiz-price">{priceText(result.service.price, locale)}</strong>
            <span>
              {m.perPerson} · {format(m.minutes, { n: result.service.durationMinutes })}
            </span>
          </p>
          <div className={styles.actions}>
            <LinkButton testId="quiz-book" href={`/${locale}/booking?service=${result.serviceId}`} variant="gold">
              {m.bookThis}
            </LinkButton>
            <Button testId="quiz-restart" variant="ghost" onClick={restart}>
              {m.quizRestart}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={quizRef} tabIndex={-1} className={styles.quiz}>
      <div className={styles.progress}>
        <p data-testid="quiz-progress" aria-live="polite">
          {format(m.quizProgress, { n: answered, total })}
        </p>
        <div className={styles.bar} aria-hidden="true">
          <span style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
        </div>
      </div>

      <ol className={styles.questions}>
        {questions.map((q, i) => {
          const labelId = `quiz-q-${q.id}`;
          return (
            <li key={q.id} className={styles.question} data-testid={`quiz-question-${i}`}>
              <div role="group" aria-labelledby={labelId}>
                <p className={styles.number} aria-hidden="true">
                  {format(m.quizQuestionNo, { n: i + 1 })}
                </p>
                <h2 id={labelId} className={styles.text}>
                  {pick(q.text, locale)}
                </h2>
                <div className={styles.options}>
                  {q.options.map((o) => {
                    const on = answers[q.id] === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={on ? `${styles.option} ${styles.optionOn}` : styles.option}
                        data-testid={`quiz-option-${q.id}-${o.id}`}
                        aria-pressed={on}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                      >
                        <span aria-hidden="true" className={styles.dot} />
                        <span>{pick(o.text, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className={styles.submitRow}>
        {submitError && (
          <div data-testid="quiz-error">
            <ErrorMessage code={submitError.code} message={submitError.message} />
          </div>
        )}
        {!complete && (
          <p className={styles.hint} data-testid="quiz-hint">
            {m.quizHint}
          </p>
        )}
        <Button testId="quiz-submit" variant="gold" size="lg" disabled={!complete || submitting} onClick={() => void submit()}>
          {submitting ? m.quizSubmitting : m.quizSubmit}
        </Button>
      </div>
    </div>
  );
}
