export const INVITATION_PREFIX = 'RCL-';
export const INVITATION_BODY_LENGTH = 20;
export const INVITATION_CODE_LENGTH = 27;

const BODY_PATTERN = /^[A-HJ-NP-Z2-9]{20}$/;

function compactInvitationCode(value: string): string {
  const compact = value.toUpperCase().replace(/[\s-]+/g, '');
  return compact.startsWith('RCL') && compact.length > INVITATION_BODY_LENGTH
    ? compact.slice(3)
    : compact;
}

export function normalizeInvitationBodyInput(value: string): string {
  return compactInvitationCode(value).slice(0, INVITATION_BODY_LENGTH);
}

export function normalizeInvitationCode(value: string): string {
  const body = compactInvitationCode(value);
  const groups = body.match(/.{1,5}/g)?.join('-') ?? '';
  return `${INVITATION_PREFIX}${groups}`;
}

export function isCompleteInvitationCode(value: string): boolean {
  return BODY_PATTERN.test(compactInvitationCode(value));
}

export function invitationCodePreview(body: string): string {
  const padded = normalizeInvitationBodyInput(body).padEnd(INVITATION_BODY_LENGTH, 'X');
  return normalizeInvitationCode(padded);
}
