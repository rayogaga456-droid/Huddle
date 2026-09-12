import React, { useState, useEffect, useCallback } from 'react';
import type { AppState, Channel, ChannelStatus } from '../../types';
import {
  avatarColorFor,
  initialsFrom,
  formatTimestamp,
} from '../../types';
import { MOCK_CHANNELS, MOCK_DMS } from '../../data/mockData';
import { getChannels, getMessages, sendMessage } from '../../api/client';
import { getSession } from '../../services/sessionStore';
import WorkspaceSwitcher from '../WorkspaceSwitcher/WorkspaceSwitcher';
import Sidebar from '../Sidebar/Sidebar';
import ChatPane from '../ChatPane/ChatPane';
import styles from '../../App.module.css';

const HuddleBoard: React.FC = () => {
  const session = getSession();

  const displayName =
    session?.user.name ||
    session?.user.email?.split('@')[0] ||
    'You';

  const userWorkspace: AppState['workspace'] = {
    id: 'user',
    name: displayName,
    initials: initialsFrom(displayName),
    avatarColor: avatarColorFor(session?.user.email || displayName),
  };

  const [appState, setAppState] = useState<AppState>({
    workspace: userWorkspace,
    channels: MOCK_CHANNELS,
    directMessages: MOCK_DMS,
    activeChannelId: '',
    channelStatus: 'loaded',
  });

  const [channelStatus, setChannelStatus] =
    useState<ChannelStatus>('loaded');

  const [mobileView, setMobileView] =
    useState<'sidebar' | 'chat'>('sidebar');

  const allChannels: Channel[] = [
    ...appState.channels,
    ...appState.directMessages,
  ];

  const activeChannel =
    allChannels.find(
      (channel) => channel.id === appState.activeChannelId
    ) ?? allChannels[0];

  useEffect(() => {
    getChannels()
      .then(({ channels }) => {
        if (!channels.length) return;

        const mapped: Channel[] = channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: 'channel' as const,
          messages: [],
        }));

        setAppState((prev) => ({
          ...prev,
          channels: mapped,
          activeChannelId: mapped[0].id,
        }));
      })
      .catch(() => {
        // API unavailable — fall back to mock data's first channel.
        setAppState((prev) => ({
          ...prev,
          activeChannelId: MOCK_CHANNELS[0]?.id ?? '',
        }));
      });
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    setChannelStatus('loading');

    try {
      const { messages } = await getMessages(channelId);

      const mapped = messages.map((message) => ({
        id: message.id,
        author: (message.author?.name ?? message.author?.email ?? 'Unknown'),
        authorInitials: initialsFrom((message.author?.name ?? message.author?.email ?? 'Unknown')),
        avatarColor: avatarColorFor(message.author?.id ?? 'unknown'),
        timestamp: formatTimestamp(message.createdAt),
        content: message.content,
      }));

      setAppState((prev) => ({
        ...prev,
        channels: prev.channels.map((channel) =>
          channel.id === channelId
            ? { ...channel, messages: mapped }
            : channel
        ),
      }));

      setChannelStatus(
        mapped.length === 0 ? 'empty' : 'loaded'
      );
    } catch {
      setAppState((prev) => {
        const channel = prev.channels.find(
          (item) => item.id === channelId
        );

        const hasMock = !!channel && channel.messages.length > 0;

        setChannelStatus(hasMock ? 'loaded' : 'empty');

        return prev;
      });
    }
  }, []);

  useEffect(() => {
    const isDm = appState.directMessages.some(
      (dm) => dm.id === appState.activeChannelId
    );

    if (appState.activeChannelId && !isDm) {
      const loadTimer = window.setTimeout(() => {
        loadMessages(appState.activeChannelId);
      }, 0);

      return () => window.clearTimeout(loadTimer);
    }
  }, [
    appState.activeChannelId,
    appState.directMessages,
    loadMessages,
  ]);

  const handleSelectChannel = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      activeChannelId: id,
    }));

    setMobileView('chat');
  };

  const handleSend = async (text: string) => {
    const now = new Date().toISOString();

    const optimistic = {
      id: `local-${Date.now()}`,
      author: displayName,
      authorInitials: initialsFrom(displayName),
      avatarColor: avatarColorFor(
        session?.user.email || displayName
      ),
      timestamp: formatTimestamp(now),
      content: text,
    };

    setAppState((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) =>
        channel.id === prev.activeChannelId
          ? {
              ...channel,
              messages: [...channel.messages, optimistic],
            }
          : channel
      ),
      directMessages: prev.directMessages.map((dm) =>
        dm.id === prev.activeChannelId
          ? {
              ...dm,
              messages: [...dm.messages, optimistic],
            }
          : dm
      ),
    }));

    if (channelStatus === 'empty') {
      setChannelStatus('loaded');
    }

    try {
      const saved = await sendMessage(
        appState.activeChannelId,
        text
      );

      const real = {
        id: saved.id,
        author: (saved.author?.name ?? saved.author?.email ?? 'Unknown'),
        authorInitials: initialsFrom((saved.author?.name ?? saved.author?.email ?? 'Unknown')),
        avatarColor: avatarColorFor(saved.author?.id ?? 'unknown'),
        timestamp: formatTimestamp(saved.createdAt),
        content: saved.content,
      };

      setAppState((prev) => ({
        ...prev,
        channels: prev.channels.map((channel) =>
          channel.id === prev.activeChannelId
            ? {
                ...channel,
                messages: channel.messages.map((message) =>
                  message.id === optimistic.id
                    ? real
                    : message
                ),
              }
            : channel
        ),
      }));
    } catch {
      // Keep optimistic message visible if the API fails.
    }
  };

  const handleRetry = () => {
    loadMessages(appState.activeChannelId);
  };

  if (!activeChannel) {
    return null;
  }

  return (
    <div className={styles.app}>
      <div className={styles.shell}>
        <WorkspaceSwitcher
          workspace={appState.workspace}
        />

        <Sidebar
          workspace={appState.workspace}
          channels={appState.channels}
          directMessages={appState.directMessages}
          activeChannelId={appState.activeChannelId}
          onSelectChannel={handleSelectChannel}
          hidden={mobileView === 'chat'}
        />

        <ChatPane
          channel={activeChannel}
          status={channelStatus}
          onSend={handleSend}
          onRetry={handleRetry}
          onBack={() => setMobileView('sidebar')}
          hidden={mobileView === 'sidebar'}
        />
      </div>
    </div>
  );
};

export default HuddleBoard;
