import type { AppState } from '../types';

export const WORKSPACE: AppState['workspace'] = {
  id: 'w1',
  name: 'Brightly Co',
  initials: 'BC',
  avatarColor: '#7B3AAE',
};

// Fallback channels used when the API is unreachable
export const MOCK_CHANNELS: AppState['channels'] = [
  {
    id: 'c-general',
    name: 'general',
    type: 'channel',
    memberCount: 4,
    unreadCount: 7,
    messages: [
      {
        id: 'm1',
        author: 'Jordan Tate',
        authorInitials: 'JT',
        avatarColor: '#9B4DD1',
        timestamp: '10:14 AM',
        content: 'Morning! Auth API is live on staging.',
      },
      {
        id: 'm2',
        author: 'Maya Chen',
        authorInitials: 'MC',
        avatarColor: '#C165D6',
        timestamp: '10:16 AM',
        content: 'Nice — pulling it into the login screen now.',
      },
    ],
  },
  {
    id: 'c-design',
    name: 'design',
    type: 'channel',
    memberCount: 3,
    messages: [],
  },
  {
    id: 'c-random',
    name: 'random',
    type: 'channel',
    memberCount: 8,
    messages: [],
  },
];

export const MOCK_DMS: AppState['directMessages'] = [
  {
    id: 'dm-jordan',
    name: 'Jordan Tate',
    type: 'dm',
    messages: [],
  },
];
