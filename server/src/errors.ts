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
