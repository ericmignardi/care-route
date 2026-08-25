/**
 * The RFC 7807 body the backend returns for every failure, including 401 and 403 from
 * the filter chain. `rule` is the extension property that names the business rule that
 * rejected the request, so the UI can branch on CAREGIVER_DOUBLE_BOOKED rather than
 * parse prose; `errors` is the field-error map from bean validation.
 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  rule?: string;
  errors?: Record<string, string>;
  timestamp?: string;
  path?: string;
}

/**
 * The page envelope the backend returns instead of Spring Data's `Page`, whose JSON
 * shape is explicitly not contractual.
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
