import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Channel, ChannelStatus, avatarColorFor, initialsFrom, formatTimestamp } from './types';
import { WORKSPACE, MOCK_CHANNELS, MOCK_DMS } from './data/mockData';
import { getChannels, getMessages, sendMessage } from './api/client';
import WorkspaceSwitcher from './components/WorkspaceSwitcher/WorkspaceSwitcher';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPane from './components/ChatPane/ChatPane';
import styles from './App.module.css';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    workspace: WORKSPACE,
    channels: MOCK_CHANNELS,
    directMessages: MOCK_DMS,
    activeChannelId: MOCK_CHANNELS[0].id,
    channelStatus: 'loaded',
  });
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>('loaded');
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  const allChannels: Channel[] = [...appState.channels, ...appState.directMessages];
  const activeChannel = allChannels.find(c => c.id === appState.activeChannelId) ?? allChannels[0];

  // Load channels from API on mount
  useEffect(() => {
    getChannels()
      .then(({ channels }) => {
        if (!channels.length) return;
        const mapped: Channel[] = channels.map(c => ({
          id: c.id,
          name: c.name,
          type: 'channel' as const,
          messages: [],
        }));
        setAppState(prev => ({
          ...prev,
          channels: mapped,
          activeChannelId: mapped[0].id,
        }));
      })
      .catch(() => {
        // API not running keep mock data
      });
  }, []);

  // Load messages when active channel changes
  const loadMessages = useCallback(async (channelId: string) => {
    setChannelStatus('loading');
    try {
      const { messages } = await getMessages(channelId);
      const mapped = messages.map(m => ({
        id: m.id,
        author: m.userName,
        authorInitials: initialsFrom(m.userName),
        avatarColor: avatarColorFor(m.userId),
        timestamp: formatTimestamp(m.createdAt),
        content: m.content,
      }));
      setAppState(prev => ({
        ...prev,
        channels: prev.channels.map(ch =>
          ch.id === channelId ? { ...ch, messages: mapped } : ch
        ),
      }));
      setChannelStatus(mapped.length === 0 ? 'empty' : 'loaded');
    } catch {
      // API not available — keep existing mock messages and show as loaded
      setAppState(prev => {
        const ch = prev.channels.find(c => c.id === channelId);
        const hasMock = ch && ch.messages.length > 0;
        setChannelStatus(hasMock ? 'loaded' : 'empty');
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    const isDm = appState.directMessages.some(dm => dm.id === appState.activeChannelId);
    if (!isDm) loadMessages(appState.activeChannelId);
  }, [appState.activeChannelId, loadMessages]);

  // Select channel
  const handleSelectChannel = (id: string) => {
    setAppState(prev => ({ ...prev, activeChannelId: id }));
    setMobileView('chat');
  };

  // Send message
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

    setAppState(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.id === prev.activeChannelId
          ? { ...ch, messages: [...ch.messages, optimistic] }
          : ch
      ),
      directMessages: prev.directMessages.map(dm =>
        dm.id === prev.activeChannelId
          ? { ...dm, messages: [...dm.messages, optimistic] }
          : dm
      ),
    }));
    if (channelStatus === 'empty') setChannelStatus('loaded');

    try {
      const saved = await sendMessage(appState.activeChannelId, text);
      const real = {
        id: saved.id,
        author: saved.userName,
        authorInitials: initialsFrom(saved.userName),
        avatarColor: avatarColorFor(saved.userId),
        timestamp: formatTimestamp(saved.createdAt),
        content: saved.content,
      };
      setAppState(prev => ({
        ...prev,
        channels: prev.channels.map(ch =>
          ch.id === prev.activeChannelId
            ? { ...ch, messages: ch.messages.map(m => m.id === optimistic.id ? real : m) }
            : ch
        ),
      }));
    } catch {
      // Keep optimistic message visible even if API fails
    }
  };

  // Retry
  const handleRetry = () => {
    loadMessages(appState.activeChannelId);
  };

  return (
    <div className={styles.app}>
      <div className={styles.shell}>
        <WorkspaceSwitcher workspace={appState.workspace} />
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

export default App;
