/**
 * The RFC 7807 body the backend returns for every failure. `rule` names the business rule
 * that rejected the request, so the UI can branch on it rather than parse prose.
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

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
