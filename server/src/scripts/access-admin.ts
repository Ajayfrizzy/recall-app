import 'dotenv/config';
import { getAnalysisAccessStore } from '../services/access-control.js';

const [command, argument] = process.argv.slice(2);
const store = getAnalysisAccessStore();

try {
  if (command === 'create-invitations') {
    const count = Number(argument ?? '1');
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new Error('Count must be an integer from 1 to 100.');
    }
    for (let index = 0; index < count; index += 1) {
      const invitation = store.createInvitation();
      console.log(`${invitation.code}\t${new Date(invitation.expiresAt).toISOString()}`);
    }
  } else if (command === 'list-tokens') {
    for (const token of store.listTokens()) {
      console.log(
        [
          token.id,
          new Date(token.createdAt).toISOString(),
          new Date(token.expiresAt).toISOString(),
          token.revokedAt ? `revoked:${new Date(token.revokedAt).toISOString()}` : 'active',
        ].join('\t'),
      );
    }
  } else if (command === 'revoke-token') {
    if (!argument) throw new Error('A token ID is required.');
    if (!store.revokeToken(argument)) throw new Error('Active token not found.');
    console.log(`Revoked installation token ${argument}.`);
  } else if (command === 'usage') {
    const usage = store.getUsageSnapshot();
    console.log(
      JSON.stringify(
        {
          globalDailyCount: usage.globalDailyCount,
          activeCount: usage.activeCount,
          estimatedMonthlyUsd: usage.estimatedMicroUsd / 1_000_000,
          reservedUsd: usage.reservedMicroUsd / 1_000_000,
        },
        null,
        2,
      ),
    );
  } else {
    throw new Error(
      'Usage: access-admin <create-invitations [count] | list-tokens | revoke-token TOKEN_ID | usage>',
    );
  }
} finally {
  store.close();
}
