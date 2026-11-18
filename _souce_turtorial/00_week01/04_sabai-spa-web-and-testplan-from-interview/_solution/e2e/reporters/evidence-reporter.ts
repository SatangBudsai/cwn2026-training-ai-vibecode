import type { FullResult, Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import fs from 'node:fs';
import path from 'node:path';

const stripAnsi = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, '');

/**
 * เขียนผลของแต่ละ test ลง test-report/results/<project>/<ID>.json ทันทีเมื่อจบ
 * รันซ้ำเฉพาะบางข้อก็ทับเฉพาะข้อนั้น ไม่กระทบข้ออื่น และเก็บผลรอบก่อนไว้ใน attempts
 */
export default class EvidenceReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    const project = test.parent.project()?.name ?? 'unknown';
    const id = test.title.split(' ')[0];
    const dir = path.resolve('test-report', 'results', project);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.json`);

    let attempts: { status: string; durationMs: number; at: string }[] = [];
    try {
      const previous = JSON.parse(fs.readFileSync(file, 'utf8'));
      attempts = [...(previous.attempts ?? []), { status: previous.status, durationMs: previous.durationMs, at: previous.at }];
    } catch { /* รอบแรก */ }

    const steps = (list: TestStep[]): string[] =>
      list.flatMap((s) => (s.category === 'test.step' ? [s.title + (s.error ? ' ✗' : '')] : []));

    fs.writeFileSync(file, JSON.stringify({
      id,
      title: test.title,
      project,
      file: path.basename(test.location.file),
      tags: test.tags,
      annotations: test.annotations,
      status: result.status,
      durationMs: result.duration,
      at: new Date().toISOString(),
      attempts,
      errors: result.errors.map((e) => stripAnsi(e.message ?? e.value ?? String(e))),
      steps: steps(result.steps),
    }, null, 2));
  }

  onEnd(_result: FullResult) { /* no-op */ }

  printsToStdio() { return false; }
}
