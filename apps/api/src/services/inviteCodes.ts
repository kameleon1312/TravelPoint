export type InvitePurpose = 'ACCOUNT' | 'CIRCLE';

export interface InviteForValidation {
  purpose: InvitePurpose;
  circleId: string | null;
  expiresAt: Date;
  maxUses: number;
  useCount: number;
}

export type InviteValidationError =
  | 'INVALID_INVITE'
  | 'INVITE_WRONG_PURPOSE'
  | 'INVITE_WRONG_CIRCLE'
  | 'INVITE_EXPIRED'
  | 'INVITE_EXHAUSTED';

export function validateInvite(
  invite: InviteForValidation | null,
  expectedPurpose: InvitePurpose,
  expectedCircleId: string | null,
  now = new Date(),
): InviteValidationError | null {
  if (!invite) return 'INVALID_INVITE';
  if (invite.purpose !== expectedPurpose) return 'INVITE_WRONG_PURPOSE';
  if (invite.circleId !== expectedCircleId) return 'INVITE_WRONG_CIRCLE';
  if (invite.expiresAt <= now) return 'INVITE_EXPIRED';
  if (invite.useCount >= invite.maxUses) return 'INVITE_EXHAUSTED';
  return null;
}

export function inviteErrorMessage(error: InviteValidationError): string {
  switch (error) {
    case 'INVITE_WRONG_PURPOSE':
      return 'Invite code cannot be used for this action';
    case 'INVITE_WRONG_CIRCLE':
      return 'Invite code belongs to a different circle';
    case 'INVITE_EXPIRED':
      return 'Invite code has expired';
    case 'INVITE_EXHAUSTED':
      return 'Invite code has already been used';
    default:
      return 'Invite code is invalid';
  }
}
