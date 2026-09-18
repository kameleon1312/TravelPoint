export type CircleRole = 'MEMBER' | 'GUIDE' | 'FOUNDER';

export interface Circle {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isInviteOnly: boolean;
  memberCount?: number;
  _count?: { members: number };
  createdAt: string;
}

export interface CircleMember {
  id: string;
  circleId: string;
  explorerId: string;
  role: CircleRole;
  joinedAt: string;
}
