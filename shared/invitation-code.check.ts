import assert from 'node:assert/strict';
import {
  invitationCodePreview,
  isCompleteInvitationCode,
  normalizeInvitationBodyInput,
  normalizeInvitationCode,
} from './invitation-code';

const body = 'ABCDEFGHJKLMNPQRSTUV';
const complete = 'RCL-ABCDE-FGHJK-LMNPQ-RSTUV';

assert.equal(normalizeInvitationBodyInput(complete), body, 'formatted paste lost characters');
assert.equal(
  normalizeInvitationBodyInput(`rcl${body}`),
  body,
  'unformatted complete-code paste lost characters',
);
assert.equal(
  normalizeInvitationBodyInput('  rcl-abcde fghjk lmnpq rstuv  '),
  body,
  'lowercase or whitespace paste was not normalized',
);
assert.equal(normalizeInvitationBodyInput(`${body}WXYZ`), body, 'input exceeded the body limit');
assert.equal(
  normalizeInvitationBodyInput('RCLABCDEFGHJKLMNPQRS'),
  'RCLABCDEFGHJKLMNPQRS',
  'a body beginning with RCL was mistaken for the fixed prefix',
);

const deleted = normalizeInvitationBodyInput(`${body.slice(0, 9)}${body.slice(10)}`);
assert.equal(deleted, 'ABCDEFGHJLMNPQRSTUV', 'middle deletion changed another character');
const middleEdited = normalizeInvitationBodyInput(`${body.slice(0, 9)}Z${body.slice(10)}`);
assert.equal(middleEdited, 'ABCDEFGHJZLMNPQRSTUV', 'middle editing reordered characters');

assert.equal(normalizeInvitationCode(body), complete);
assert.equal(invitationCodePreview('ABC'), 'RCL-ABCXX-XXXXX-XXXXX-XXXXX');
assert(isCompleteInvitationCode(complete));
assert(isCompleteInvitationCode(body));
assert(!isCompleteInvitationCode('RCL-ABCDE-FGHJK-LMNPQ-RSTU'));
assert(!isCompleteInvitationCode('RCL-ABCDE-FGHIK-LMNPQ-RSTUV'));
assert(!isCompleteInvitationCode('RCL-ABCDE-FGHJK-LMNPQ-RSTUVW'));

console.log('Invitation code paste, normalization, length, deletion, and editing checks passed');
