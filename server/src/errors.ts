export class AnalysisNotConfiguredError extends Error {
  constructor() {
    super('Semantic analysis is not configured.');
    this.name = 'AnalysisNotConfiguredError';
  }
}

export class ProviderUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('The analysis provider is unavailable.', options);
    this.name = 'ProviderUnavailableError';
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
