// RFC 9110 ProblemDetails as produced by ExceptionHandlingMiddleware (§1.2).

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface NormalizedApiError {
  status: number;
  title: string;
  message: string;
  fieldErrors: Record<string, string[]>;
  raw: ProblemDetails | null;
}

export function normalizeError(status: number, body: unknown): NormalizedApiError {
  const pd = (body ?? null) as ProblemDetails | null;
  const fieldErrors: Record<string, string[]> =
    pd && typeof pd === 'object' && pd.errors && typeof pd.errors === 'object' ? pd.errors : {};
  const message =
    (pd?.detail && String(pd.detail)) ||
    (pd?.title && String(pd.title)) ||
    httpStatusFallback(status);
  return {
    status,
    title: pd?.title ?? httpStatusFallback(status),
    message,
    fieldErrors,
    raw: pd,
  };
}

function httpStatusFallback(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request';
    case 401:
      return 'Authentication is required';
    case 403:
      return 'You do not have permission to perform this action';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Business rule violation';
    case 429:
      return 'Too many requests';
    case 500:
      return 'Something went wrong';
    default:
      return 'Request failed';
  }
}

export function isConcurrencyConflict(err: NormalizedApiError): boolean {
  return (
    err.status === 409 &&
    /modified by another request/i.test(err.message)
  );
}

/**
 * User-facing message for toasts/inline errors. ValidationProblemDetails
 * carries the real message in `errors` (title is the generic "One or more
 * validation errors occurred."), so prefer the first field error, e.g.
 * `dueDate: ["Due date cannot be in the past."]`.
 */
export function primaryMessage(err: NormalizedApiError | null | undefined): string {
  if (!err) return 'Request failed';
  const fields = Object.values(err.fieldErrors ?? {}).flat().filter(Boolean);
  if (fields.length > 0) return fields.join(' ');
  return err.message;
}
