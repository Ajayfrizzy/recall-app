export const INVITATION_PREFIX = 'RCL-';
export const INVITATION_BODY_LENGTH = 20;
export const INVITATION_CODE_LENGTH = 27;

const BODY_PATTERN = /^[A-HJ-NP-Z2-9]{20}$/;

function compactInvitationCode(value: string): string {
  const compact = value.toUpperCase().replace(/[\s-]+/g, '');
  return compact.startsWith('RCL') ? compact.slice(3) : compact;
}

export function normalizeInvitationCode(value: string): string {
  const body = compactInvitationCode(value);
  const groups = body.match(/.{1,5}/g)?.join('-') ?? '';
  return `${INVITATION_PREFIX}${groups}`;
}

export function isCompleteInvitationCode(value: string): boolean {
  return BODY_PATTERN.test(compactInvitationCode(value));
}

export type InvitationCodeEdit = {
  value: string;
  selection: { start: number; end: number };
};

export function formatInvitationCodeInput(
  value: string,
  cursor = value.length,
): InvitationCodeEdit {
  const prefixless = value.replace(/^\s*RCL-?/i, '');
  const beforeCursor = value.slice(0, cursor).replace(/^\s*RCL-?/i, '');
  const body = prefixless
    .replace(/[\s-]+/g, '')
    .toUpperCase()
    .slice(0, INVITATION_BODY_LENGTH);
  const bodyCursor = Math.min(beforeCursor.replace(/[\s-]+/g, '').length, INVITATION_BODY_LENGTH);
  const valueFormatted = normalizeInvitationCode(body);
  const formattedCursor = INVITATION_PREFIX.length + bodyCursor + Math.floor(bodyCursor / 5);
  const position = Math.min(formattedCursor, valueFormatted.length);
  return { value: valueFormatted, selection: { start: position, end: position } };
}
