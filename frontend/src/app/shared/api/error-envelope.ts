/**
 * Uniform error envelope — mirrors the backend `ErrorEnvelope` record
 * (api-standards.yaml): timestamp / status / error / message / path.
 * Responses are unwrapped; only failures carry this shape.
 */
export interface ErrorEnvelope {
  readonly timestamp: string;
  readonly status: number;
  readonly error: string;
  readonly message: string;
  readonly path: string;
}

/**
 * Typed API error thrown by {@link ApiClient} when the backend returns a
 * non-2xx response. Carries the parsed envelope plus the originating HTTP status.
 */
export class ApiError extends Error {
  constructor(
    readonly envelope: ErrorEnvelope,
    readonly httpStatus: number
  ) {
    super(envelope.message || envelope.error);
    this.name = 'ApiError';
  }
}