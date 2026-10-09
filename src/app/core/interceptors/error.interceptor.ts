import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { normalizeError } from '../models/problem-details';
import { ToastService } from '../services/toast.service';

// Normalizes ProblemDetails/ValidationProblemDetails into a friendly shape.
// Field-level 400s are rethrown for forms; status-driven toasts for the rest.
export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }
      // 401 is handled by authInterceptor (silent refresh) — don't toast here.
      if (err.status === 401) {
        return throwError(() => err);
      }
      const normalized = normalizeError(err.status, err.error);
      // Attach normalized error for components to consume.
      const enriched = Object.assign(err, { normalized });

      switch (err.status) {
        case 400:
          // If no field errors, surface summary (e.g. bad sortBy/search length).
          if (Object.keys(normalized.fieldErrors).length === 0) {
            toast.error(normalized.message);
          }
          break;
        case 403:
          toast.error('You do not have permission to perform this action.');
          break;
        case 404:
          // Components render not-found states; toast only for non-GET.
          if (req.method !== 'GET') toast.error(normalized.message);
          break;
        case 409:
          if (/modified by another request/i.test(normalized.message)) {
            toast.error('The resource was modified by another request. Reload and try again.');
          } else {
            toast.error(normalized.message);
          }
          break;
        case 422:
          toast.error(normalized.message);
          break;
        case 429: {
          const retryAfter = err.headers.get('Retry-After') ?? '60';
          toast.error(`Too many attempts. Try again in ${retryAfter}s.`);
          break;
        }
        case 500:
        default:
          if (err.status >= 500) toast.error('Something went wrong. Please try again.');
          break;
      }
      return throwError(() => enriched);
    }),
  );
}
