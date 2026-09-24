import assert from 'node:assert/strict';
import {
  formatInvitationCodeInput,
  isCompleteInvitationCode,
  normalizeInvitationCode,
} from './invitation-code';

const complete = 'RCL-ABCDE-FGHJK-LMNPQ-RSTUV';

assert.equal(formatInvitationCodeInput('rcl-abcde').value, 'RCL-ABCDE');
assert.equal(formatInvitationCodeInput('RCL-ABCDEf').value, 'RCL-ABCDE-F');
assert.equal(formatInvitationCodeInput('RCL-ABCDE-FGHJ').value, 'RCL-ABCDE-FGHJ');
assert.equal(formatInvitationCodeInput('RCL-ABCDE-FGHJ', 14).selection.start, 14);
assert.equal(formatInvitationCodeInput('  rcl-abcde fghjk lmnpq rstuv  ').value, complete);
assert.equal(formatInvitationCodeInput(`${complete}WXYZ`).value, complete);
assert.equal(normalizeInvitationCode(' rcl-abcde fghjk-lmnpq rstuv '), complete);
assert(isCompleteInvitationCode(complete));
assert(isCompleteInvitationCode('abcde fghjk lmnpq rstuv'));
assert(!isCompleteInvitationCode('RCL-ABCDE-FGHJK-LMNPQ-RSTU'));
assert(!isCompleteInvitationCode('RCL-ABCDE-FGHIK-LMNPQ-RSTUV'));
assert(!isCompleteInvitationCode('RCL-ABCDE-FGHJK-LMNPQ-RSTUVW'));

const middleEdit = formatInvitationCodeInput('RCL-ABCDE-ZFGHJK-LMNPQ-RSTUV', 11);
assert.equal(middleEdit.value, 'RCL-ABCDE-ZFGHJ-KLMNP-QRSTU');
assert.equal(middleEdit.selection.start, 11);

console.log(
  'Invitation code typing, deletion, paste, casing, spacing, and validation checks passed',
);
