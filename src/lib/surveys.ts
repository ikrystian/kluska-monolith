import type { ISurvey, ISurveyQuestion } from '@/models/Survey';
import { notifyUser } from '@/lib/friends';

interface SurveyAnswerInput {
  questionId?: unknown;
  answer?: unknown;
}

/** Sprawdza odpowiedzi na ankietę: wymagane pytania wypełnione, zamknięte to jedna z opcji. Zwraca komunikat błędu albo null. */
export function validateSurveyAnswers(survey: Pick<ISurvey, 'questions'>, answers: unknown): string | null {
  if (!Array.isArray(answers)) return 'Brak odpowiedzi.';
  const byQuestion = new Map<string, string>();
  for (const item of answers as SurveyAnswerInput[]) {
    if (typeof item?.questionId !== 'string' || typeof item?.answer !== 'string') return 'Nieprawidłowy format odpowiedzi.';
    byQuestion.set(item.questionId, item.answer.trim());
  }

  for (const question of survey.questions as ISurveyQuestion[]) {
    const answer = byQuestion.get(question.id) ?? '';
    if (question.required && !answer) return `Odpowiedz na pytanie: ${question.text}`;
    if (answer && question.type === 'closed' && !(question.options ?? []).includes(answer)) {
      return `Nieprawidłowa opcja w pytaniu: ${question.text}`;
    }
  }
  return null;
}

/**
 * Informuje sportowców o aktywnej ankiecie. `alreadyNotified` to osoby, które
 * dostały powiadomienie wcześniej (np. przy zmianie samych odpowiedzi nie wysyłamy go drugi raz).
 */
export function notifyAssignedAthletes(survey: Pick<ISurvey, '_id' | 'title' | 'trainerName' | 'status' | 'assignedAthleteIds'>, alreadyNotified: string[] = []) {
  if (survey.status !== 'active') return;
  const link = `/athlete/surveys/${String(survey._id)}`;
  const targets = survey.assignedAthleteIds.filter(id => !alreadyNotified.includes(id));
  for (const athleteId of targets) {
    void notifyUser(athleteId, 'Nowa ankieta od trenera', `${survey.trainerName} przypisał(a) Ci ankietę: ${survey.title}`, link, { push: true });
  }
}
