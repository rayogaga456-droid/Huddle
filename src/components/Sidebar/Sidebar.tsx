import React, { useEffect, useRef, useState } from 'react';
import type { Channel, Workspace } from '../../types';
import styles from './Sidebar.module.css';

type DirectMessage = {
  id: string;
  name: string;
  avatarUrl?: string;
  status?: 'online' | 'offline' | 'away';
};

type SidebarProps = {
  workspace: Workspace;
  channels: Channel[];
  directMessages: DirectMessage[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onDeleteChannel?: (channelId: string) => void;
  onDeleteDm?: (dmId: string) => void;
  onSignOut?: () => void;
  onOpenNewDm?: () => void;
  onOpenCreateChannel?: () => void;
  hidden?: boolean;
};

const HashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const XIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export default function Sidebar({
  workspace,
  channels,
  directMessages,
  activeChannelId,
  onSelectChannel,
  onDeleteChannel,
  onDeleteDm,
  onSignOut,
  onOpenNewDm,
  onOpenCreateChannel,
  hidden = false,
}: SidebarProps) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceRef.current &&
        !workspaceRef.current.contains(event.target as Node)
      ) {
        setWorkspaceOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.workspaceHeader} ref={workspaceRef}>
        <button
          type="button"
          className={styles.workspaceButton}
          onClick={() => setWorkspaceOpen((open) => !open)}
        >
          <div className={styles.workspaceIcon}>
            {workspace.name?.charAt(0)?.toUpperCase() || 'H'}
          </div>

          <div className={styles.workspaceInfo}>
            <span className={styles.workspaceName}>{workspace.name}</span>
            <span className={styles.workspaceSubtitle}>
              Workspace
            </span>
          </div>

          <span className={styles.workspaceChevron}>
            {workspaceOpen ? '▲' : '▼'}
          </span>
        </button>

        {workspaceOpen && (
          <div className={styles.workspaceMenu}>
            <button
              type="button"
              className={styles.workspaceMenuItem}
              onClick={() => {
                setWorkspaceOpen(false);
                onSignOut?.();
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className={styles.sidebarContent}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Channels</span>

            {onOpenCreateChannel && (
              <button
                type="button"
                className={styles.addButton}
                onClick={onOpenCreateChannel}
                aria-label="Create channel"
                title="Create channel"
              >
                <PlusIcon />
              </button>
            )}
          </div>

          <div className={styles.channelList}>
            {channels.length === 0 ? (
              <div className={styles.emptyState}>No channels yet</div>
            ) : (
              channels.map((channel) => {
                const isActive = activeChannelId === channel.id;

                return (
                  <div
                    key={channel.id}
                    className={`${styles.channelRow} ${
                      isActive ? styles.active : ''
                    }`}
                  >
                    <button
                      type="button"
                      className={styles.channelButton}
                      onClick={() => onSelectChannel(channel.id)}
                    >
                      <span className={styles.channelIcon}>
                        {channel.isPrivate ? <LockIcon /> : <HashIcon />}
                      </span>

                      <span className={styles.channelName}>
                        {channel.name}
                      </span>
                    </button>

                    {onDeleteChannel && (
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={(event) => {
                          event.stopPropagation();

                          if (
                            window.confirm(
                              `Delete #${channel.name}? This cannot be undone.`
                            )
                          ) {
                            onDeleteChannel(channel.id);
                          }
                        }}
                        aria-label={`Delete ${channel.name}`}
                        title="Delete channel"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Direct Messages</span>

            {onOpenNewDm && (
              <button
                type="button"
                className={styles.addButton}
                onClick={onOpenNewDm}
                aria-label="New direct message"
                title="New direct message"
              >
                <PlusIcon />
              </button>
            )}
          </div>

          <div className={styles.dmList}>
            {directMessages.length === 0 ? (
              <div className={styles.emptyState}>No direct messages</div>
            ) : (
              directMessages.map((dm) => (
                <div key={dm.id} className={styles.dmRow}>
                  <button
                    type="button"
                    className={styles.dmButton}
                    onClick={() => onSelectChannel(dm.id)}
                  >
                    <div className={styles.avatar}>
                      {dm.avatarUrl ? (
                        <img
                          src={dm.avatarUrl}
                          alt={dm.name}
                          className={styles.avatarImage}
                        />
                      ) : (
                        dm.name?.charAt(0)?.toUpperCase() || '?'
                      )}

                      {dm.status && (
                        <span
                          className={`${styles.statusDot} ${
                            styles[dm.status]
                          }`}
                        />
                      )}
                    </div>

                    <span className={styles.dmName}>{dm.name}</span>
                  </button>

                  {onDeleteDm && (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={(event) => {
                        event.stopPropagation();

                        if (
                          window.confirm(
                            `Delete your conversation with ${dm.name}?`
                          )
                        ) {
                          onDeleteDm(dm.id);
                        }
                      }}
                      aria-label={`Delete conversation with ${dm.name}`}
                      title="Delete conversation"
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}