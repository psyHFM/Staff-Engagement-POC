import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiError, ErrorEnvelope } from './error-envelope';

/**
 * Thin wrapper over {@link HttpClient} that enforces the constitution's
 * api-standards.yaml contract:
 *   - base path `/api/v1` (kebab-case URLs built by callers)
 *   - camelCase JSON, unwrapped responses (no envelope on success)
 *   - uniform {@link ErrorEnvelope} on failure → typed {@link ApiError}
 *
 * Bearer JWT is attached by the auth interceptor (added in Phase 1); Phase 0
 * keeps the surface so feature services can call the stub `/api/v1/health`.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.toParams(params) });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
  }

  private toParams(params?: Record<string, string | number>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }

  /** Maps a non-2xx response into the uniform {@link ApiError}. */
  static toApiError(response: HttpErrorResponse): ApiError {
    const body = response.error as Partial<ErrorEnvelope> | null;
    const envelope: ErrorEnvelope = {
      timestamp: body?.timestamp ?? new Date().toISOString(),
      status: body?.status ?? response.status,
      error: body?.error ?? response.statusText,
      message: body?.message ?? response.message,
      path: body?.path ?? response.url ?? ''
    };
    return new ApiError(envelope, response.status);
  }
}

/** Operator factory kept here so services can `pipe(catchApiError())`. */
export function catchApiError<T>(): (source: Observable<T>) => Observable<T> {
  return (source) =>
    source.pipe(
      catchError((err: HttpErrorResponse) => throwError(() => ApiClient.toApiError(err)))
    );
}