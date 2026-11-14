import { NextResponse } from 'next/server';
import { getRequestUser, type RequestUser } from '@/lib/api-auth';

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
  }
}

/** The signed-in admin behind a request; throws a 401/403 `AdminApiError` otherwise. */
export async function requireAdmin(request: Request): Promise<RequestUser> {
  const user = await getRequestUser(request);
  if (!user) throw new AdminApiError(401, 'Zaloguj się, aby kontynuować.');
  if (user.role !== 'admin') throw new AdminApiError(403, 'Ta operacja wymaga uprawnień administratora.');
  return user;
}

interface MongooseValidationError {
  name: 'ValidationError';
  errors: Record<string, { message: string }>;
}

function isValidationError(error: unknown): error is MongooseValidationError {
  return Boolean(error) && (error as { name?: string }).name === 'ValidationError' && 'errors' in (error as object);
}

/** Turns anything thrown inside an admin route into a JSON response with a Polish message. */
export function adminErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof AdminApiError) {
    return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status });
  }
  if (isValidationError(error)) {
    const fields = Object.fromEntries(Object.entries(error.errors).map(([path, issue]) => [path, issue.message]));
    return NextResponse.json(
      { error: `Nieprawidłowe dane: ${Object.keys(fields).join(', ')}.`, fields },
      { status: 400 }
    );
  }
  const code = (error as { code?: number })?.code;
  if (code === 11000) {
    const keys = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {});
    return NextResponse.json(
      { error: `Taki rekord już istnieje (powtórzona wartość: ${keys.join(', ') || 'pole unikalne'}).` },
      { status: 409 }
    );
  }
  if ((error as { name?: string })?.name === 'CastError') {
    const cast = error as { path?: string };
    return NextResponse.json(
      { error: `Nieprawidłowa wartość pola ${cast.path ?? ''}.`, fields: cast.path ? { [cast.path]: 'Nieprawidłowa wartość.' } : undefined },
      { status: 400 }
    );
  }
  console.error(`${context} error:`, error);
  return NextResponse.json({ error: 'Wystąpił błąd serwera. Spróbuj ponownie.' }, { status: 500 });
}
