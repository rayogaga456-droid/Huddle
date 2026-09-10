import React, { useState, useEffect, useCallback } from 'react';
import type { AppState, Channel, ChannelStatus } from '../../types';
import {
  avatarColorFor,
  initialsFrom,
  formatTimestamp,
} from '../../types';
import { WORKSPACE, MOCK_CHANNELS, MOCK_DMS } from '../../data/mockData';
import { getChannels, getMessages, sendMessage } from '../../api/client';
import WorkspaceSwitcher from '../WorkspaceSwitcher/WorkspaceSwitcher';
import Sidebar from '../Sidebar/Sidebar';
import ChatPane from '../ChatPane/ChatPane';
import styles from '../../App.module.css';

const HuddleBoard: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    workspace: WORKSPACE,
    channels: MOCK_CHANNELS,
    directMessages: MOCK_DMS,
    activeChannelId: MOCK_CHANNELS[0].id,
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
        // Keep mock data if the API is unavailable.
      });
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    setChannelStatus('loading');

    try {
      const { messages } = await getMessages(channelId);

      const mapped = messages.map((message) => ({
        id: message.id,
        author: message.userName,
        authorInitials: initialsFrom(message.userName),
        avatarColor: avatarColorFor(message.userId),
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

    if (!isDm) {
      loadMessages(appState.activeChannelId);
    }
  }, [appState.activeChannelId, appState.directMessages, loadMessages]);

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
      author: 'You',
      authorInitials: 'YO',
      avatarColor: avatarColorFor('you'),
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
        author: saved.userName,
        authorInitials: initialsFrom(saved.userName),
        avatarColor: avatarColorFor(saved.userId),
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