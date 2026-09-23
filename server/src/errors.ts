export class AnalysisNotConfiguredError extends Error {
  constructor() {
    super('Semantic analysis is not configured.');
    this.name = 'AnalysisNotConfiguredError';
  }
}

export type ProviderFailureCategory =
  | 'request_timeout'
  | 'openai_api_error'
  | 'invalid_json_response'
  | 'schema_validation_failure'
  | 'network_connection_failure'
  | 'unexpected_error';

export class ProviderUnavailableError extends Error {
  readonly category: ProviderFailureCategory;

  constructor(category: ProviderFailureCategory, options?: ErrorOptions) {
    super('The analysis provider is unavailable.', options);
    this.name = 'ProviderUnavailableError';
    this.category = category;
  }
}

export class InvalidJsonError extends Error {
  constructor(options?: ErrorOptions) {
    super('The request body is not valid JSON.', options);
    this.name = 'InvalidJsonError';
  }
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super('The request payload is too large.');
    this.name = 'PayloadTooLargeError';
  }
}

export class RateLimitExceededError extends Error {
  constructor() {
    super('Too many analysis requests.');
    this.name = 'RateLimitExceededError';
  }
}

export type AccessErrorCode =
  | 'missing_access_token'
  | 'invalid_access_token'
  | 'access_token_revoked'
  | 'access_token_expired'
  | 'installation_allowance_exhausted'
  | 'global_allowance_exhausted'
  | 'analysis_busy'
  | 'analysis_disabled'
  | 'estimated_spending_limit_exhausted'
  | 'duplicate_analysis_in_progress'
  | 'invalid_invitation'
  | 'redemption_rate_limited';

export class AccessControlError extends Error {
  readonly code: AccessErrorCode;
  readonly status: number;

  constructor(code: AccessErrorCode, status: number) {
    super(code);
    this.name = 'AccessControlError';
    this.code = code;
    this.status = status;
  }
}
