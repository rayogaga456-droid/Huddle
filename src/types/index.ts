export type ChannelStatus = 'loaded' | 'empty' | 'loading' | 'error';

export interface Message {
  id: string;
  author: string;       // userName from API or author.name
  authorId?: string;
  authorInitials: string;
  avatarColor: string;
  timestamp: string;    // formatted from createdAt
  content: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  participantId?: string;
  memberCount?: number;
  messages: Message[];
  unreadCount?: number;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  avatarColor?: string;
}

export interface Workspace {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface AppState {
  workspace: Workspace;
  channels: Channel[];
  directMessages: Channel[];
  activeChannelId: string;
  channelStatus: ChannelStatus;
}

// Helpers
export function initialsFrom(name?: string | null): string {
  if (!name || typeof name !== 'string') return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar colour from a user ID/name string
const AVATAR_COLORS = [
  '#9B4DD1', // brand-500
  '#C165D6', // brand-400
  '#7B3AAE', // brand-600
  '#5E2A88', // brand-700
  '#DB8FDE', // brand-300
  '#2E9E6D', // success
];

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function canonicalDmId(userA: string, userB: string): string {
  const a = String(userA ?? '').trim();
  const b = String(userB ?? '').trim();
  if (!a && !b) return 'dm:anon';
  if (!a) return `dm:${b}`;
  if (!b) return `dm:${a}`;
  const [first, second] = [a, b].sort((left, right) => left.localeCompare(right));
  return `dm:${first}:${second}`;
}
