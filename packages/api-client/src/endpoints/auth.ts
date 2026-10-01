import type { ApiClient } from '../client';
import type { Explorer } from '@travelpoint/types';

export interface CompleteSignupResult {
  id: string;
  handle: string;
  rank: string;
  emailVerified: boolean;
}

export interface InviteResult {
  code: string;
  expiresAt: string | null;
}

export function createAuthEndpoints(client: ApiClient) {
  return {
    // Called once after Supabase signUp() to create the Explorer profile in our DB.
    // Supabase JWT in Authorization header identifies the user.
    completeSignup: (body: { handle: string; inviteCode?: string }) =>
      client.post<CompleteSignupResult>('/api/auth/complete-signup', body),

    // INSIDER+ rank required. Generates an invite code, optionally emails the recipient.
    invite: (body: { recipientEmail?: string }) =>
      client.post<InviteResult>('/api/auth/invite', body),
  };
}
