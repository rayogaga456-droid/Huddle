import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Channel, ChannelStatus, avatarColorFor, initialsFrom, formatTimestamp } from './types';
import { MOCK_DMS } from './data/mockData';
import { getChannels, getMessages, sendMessage } from './api/client';
import WorkspaceSwitcher from './components/WorkspaceSwitcher/WorkspaceSwitcher';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPane from './components/ChatPane/ChatPane';
import styles from './App.module.css';

// ── Token + user handoff from login app ──────────────────
// Login app redirects here with ?token=xxx&name=xxx&email=xxx
const LOGIN_URL = 'https://your-login-app.vercel.app'; // ← replace with real login app URL

const params = new URLSearchParams(window.location.search);
const urlToken = params.get('token');
const urlName  = params.get('name');
const urlEmail = params.get('email');

if (urlToken) {
  localStorage.setItem('huddle_token', urlToken);
  if (urlName)  localStorage.setItem('huddle_user_name', urlName);
  if (urlEmail) localStorage.setItem('huddle_user_email', urlEmail);
  // Remove credentials from URL bar
  params.delete('token');
  params.delete('name');
  params.delete('email');
  const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
  window.history.replaceState({}, '', clean);
}

// If no token at all → send to login
if (!localStorage.getItem('huddle_token')) {
  window.location.href = LOGIN_URL;
}

const storedName  = localStorage.getItem('huddle_user_name') ?? '';
const storedEmail = localStorage.getItem('huddle_user_email') ?? '';
// Use name → or part before @ in email → or fallback
const displayName = storedName || storedEmail.split('@')[0] || 'You';

// Build workspace from real logged-in user info instead of mock data
const userWorkspace: AppState['workspace'] = {
  id: 'user',
  name: displayName,
  initials: initialsFrom(displayName),
  avatarColor: avatarColorFor(storedEmail || displayName),
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    workspace: userWorkspace,   // ← real user info, not "Brightly Co"
    channels: [],          // start empty — real channels load from API
    directMessages: MOCK_DMS,
    activeChannelId: '',
    channelStatus: 'loaded',
  });
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>('loading');
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  const allChannels: Channel[] = [...appState.channels, ...appState.directMessages];
  const activeChannel = allChannels.find(c => c.id === appState.activeChannelId) ?? allChannels[0];

  // Load channels from API on mount
  useEffect(() => {
    getChannels()
      .then(({ channels }) => {
        if (!channels.length) {
          setChannelStatus('empty');
          return;
        }
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
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('401') || msg.includes('403')) {
          // Token expired or invalid — go back to login
          localStorage.removeItem('huddle_token');
          window.location.href = LOGIN_URL;
        } else {
          setChannelStatus('error');
        }
      });
  }, []);

  // Load messages when active channel changes
  const loadMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
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
      setChannelStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!appState.activeChannelId) return;
    const isDm = appState.directMessages.some(dm => dm.id === appState.activeChannelId);
    if (!isDm) loadMessages(appState.activeChannelId);
  }, [appState.activeChannelId, loadMessages]);

  // Select channel
  const handleSelectChannel = (id: string) => {
    setAppState(prev => ({ ...prev, activeChannelId: id }));
    setMobileView('chat');
  };

  // Send message — uses the logged-in user's name
  const handleSend = async (text: string) => {
    const now = new Date().toISOString();
    const optimistic = {
      id: `local-${Date.now()}`,
      author: storedName,
      authorInitials: initialsFrom(storedName),
      avatarColor: avatarColorFor(storedEmail || storedName),
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

  // Retry loading messages
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
        {activeChannel && (
          <ChatPane
            channel={activeChannel}
            status={channelStatus}
            onSend={handleSend}
            onRetry={handleRetry}
            onBack={() => setMobileView('sidebar')}
            hidden={mobileView === 'sidebar'}
          />
        )}
      </div>
    </div>
  );
};

export default App;
