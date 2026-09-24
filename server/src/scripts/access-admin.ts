import 'dotenv/config';
import { getAnalysisAccessStore } from '../services/access-control.js';

const [command, argument] = process.argv.slice(2);
const store = getAnalysisAccessStore();

try {
  if (command === 'create-invitations' || command === 'create-judge-invitations') {
    const count = Number(argument ?? '1');
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new Error('Count must be an integer from 1 to 100.');
    }
    for (let index = 0; index < count; index += 1) {
      const invitation =
        command === 'create-judge-invitations'
          ? store.createJudgeInvitation()
          : store.createInvitation();
      console.log(
        `${invitation.code}\t${new Date(invitation.expiresAt).toISOString()}\t${invitation.invitationId}`,
      );
    }
  } else if (command === 'list-invitations') {
    for (const invitation of store.listInvitations()) {
      const status = invitation.revokedAt
        ? `revoked:${new Date(invitation.revokedAt).toISOString()}`
        : invitation.redeemedAt
          ? `redeemed:${new Date(invitation.redeemedAt).toISOString()}`
          : invitation.expiresAt <= Date.now()
            ? 'expired'
            : 'active';
      console.log(
        [
          invitation.id,
          invitation.invitationType,
          new Date(invitation.createdAt).toISOString(),
          new Date(invitation.expiresAt).toISOString(),
          status,
        ].join('\t'),
      );
    }
  } else if (command === 'revoke-invitation') {
    if (!argument) throw new Error('An invitation ID is required.');
    if (!store.revokeInvitation(argument)) throw new Error('Active invitation not found.');
    console.log(`Revoked invitation ${argument}.`);
  } else if (command === 'list-tokens') {
    for (const token of store.listTokens()) {
      console.log(
        [
          token.id,
          new Date(token.createdAt).toISOString(),
          new Date(token.expiresAt).toISOString(),
          token.revokedAt ? `revoked:${new Date(token.revokedAt).toISOString()}` : 'active',
          token.invitationType,
          token.invitationType === 'standard'
            ? 'pro:n/a'
            : token.promotionalProvisionedAt
              ? `pro:${new Date(token.promotionalProvisionedAt).toISOString()}`
              : 'pro:not-provisioned',
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
      'Usage: access-admin <create-invitations [count] | create-judge-invitations [count] | list-invitations | revoke-invitation INVITATION_ID | list-tokens | revoke-token TOKEN_ID | usage>',
    );
  }
} finally {
  store.close();
}
