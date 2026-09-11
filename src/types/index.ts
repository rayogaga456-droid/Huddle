export type ChannelStatus = 'loaded' | 'empty' | 'loading' | 'error';

export interface Message {
  id: string;
  author: string;
  authorId?: string;
  authorInitials: string;
  avatarColor: string;
  timestamp: string;
  content: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  memberCount?: number;
  messages: Message[];
  unreadCount?: number;
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
export function initialsFrom(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
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


