import { getService } from '@/lib/catalog';
import { ApiError, json, readJson, withApi } from '@/lib/errors';
import { checkQuizAnswers, QUIZ_QUESTIONS, recommendForQuiz } from '@/lib/rules/quiz';
import type { QuizQuestionsResponse, QuizResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json<QuizQuestionsResponse>({ questions: [...QUIZ_QUESTIONS] }));

export const POST = withApi(async (req) => {
  const body = await readJson<{ answers?: unknown } | null>(req);
  const answers = body?.answers;
  const problem = checkQuizAnswers(answers);
  if (problem) throw new ApiError(problem);
  const { serviceId, reason } = recommendForQuiz(answers as string[]);
  const service = await getService(serviceId);
  if (!service) throw new ApiError('service-not-found');
  return json<QuizResponse>({ serviceId, service, reason });
});
