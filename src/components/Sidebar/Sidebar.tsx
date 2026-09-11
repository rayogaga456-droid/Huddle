import React, { useState, useRef, useEffect } from 'react';
import type { Channel, Workspace } from '../../types';
import styles from './Sidebar.module.css';

interface Props {
  workspace: Workspace;
  channels: Channel[];
  directMessages: Channel[];
  activeChannelId: string;
  onSelectChannel: (id: string) => void;
  onDeleteChannel?: (id: string) => void;
  onDeleteDm?: (id: string) => void;
  onSignOut?: () => void;
  onOpenNewDm?: () => void;
  onOpenCreateChannel?: () => void;
  hidden?: boolean;
}

const HashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 5.5h9M2.5 8.5h9M5.5 1.5l-1.5 11M10 1.5L8.5 12.5"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="6.5" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.5 6.5V5a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
    <path d="M2 4h10M5 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M3 4l.8 7.2a1 1 0 0 0 1 .8h4.4a1 1 0 0 0 1-.8L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const ChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
  >
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Sidebar: React.FC<Props> = ({
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
  hidden,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking anywhere outside it
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  return (
    <aside className={`${styles.sidebar}${hidden ? ` ${styles.hidden}` : ''}`}>
      {/* Workspace name */}
      <div className={styles.wsName} onClick={() => setMenuOpen(o => !o)}>
        <span>{workspace.name}</span>
        <ChevronDown open={menuOpen} />
      </div>

      {/* Workspace dropdown menu */}
      {menuOpen && (
        <div className={styles.wsMenu} ref={menuRef}>
          <button className={styles.wsMenuItem} onClick={() => setMenuOpen(false)}>
            Settings &amp; administration
          </button>
          <div className={styles.wsMenuDivider} />
          <button
            className={styles.wsMenuItem}
            onClick={() => {
              setMenuOpen(false);
              if (onSignOut) onSignOut();
            }}
          >
            Sign out of {workspace.name}
          </button>
        </div>
      )}

      {/* Channels */}
      <div className={styles.groupHeader}>
        <div className={styles.groupLabel}>Channels</div>
        {onOpenCreateChannel && (
          <button
            type="button"
            className={styles.addDmBtn}
            onClick={onOpenCreateChannel}
            title="Create a new channel"
            aria-label="Create channel"
          >
            <PlusIcon />
          </button>
        )}
      </div>
      <ul className={styles.list}>
        {channels.map(ch => (
          <li key={ch.id} className={styles.listItem}>
            <button
              className={`${styles.navItem} ${activeChannelId === ch.id ? styles.active : ""}`}
              onClick={() => { setMenuOpen(false); onSelectChannel(ch.id); }}
            >
              <span className={styles.icon}>
                {ch.name === 'design' ? <LockIcon /> : <HashIcon />}
              </span>
              <span className={styles.channelName}>{ch.name}</span>
              {ch.unreadCount != null && ch.unreadCount > 0 && (
                <span className={styles.badge}>{ch.unreadCount}</span>
              )}
            </button>
            {onDeleteChannel && (
              <button
                className={styles.deleteBtn}
                title={`Delete #${ch.name}`}
                aria-label={`Delete channel ${ch.name}`}
                onClick={e => { e.stopPropagation(); onDeleteChannel(ch.id); }}
              >
                <TrashIcon />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Direct Messages */}
      <div className={styles.groupHeader}>
        <div className={styles.groupLabel}>Direct Messages</div>
        {onOpenNewDm && (
          <button
            type="button"
            className={styles.addDmBtn}
            onClick={onOpenNewDm}
            title="Start a direct message with any signed up member"
            aria-label="New direct message"
          >
            <PlusIcon />
          </button>
        )}
      </div>
      <ul className={styles.list}>
        {directMessages.length === 0 ? (
          <li style={{ padding: '4px 12px' }}>
            {onOpenNewDm ? (
              <button
                type="button"
                className={styles.startDmLink}
                onClick={onOpenNewDm}
              >
                + Message a member
              </button>
            ) : (
              <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)' }}>
                Click any member in chat to message them
              </span>
            )}
          </li>
        ) : (
          directMessages.map(dm => (
            <li key={dm.id} className={styles.listItem}>
              <button
                className={`${styles.navItem} ${activeChannelId === dm.id ? styles.active : ''}`}
                onClick={() => { setMenuOpen(false); onSelectChannel(dm.id); }}
              >
                <span className={styles.dmDot} />
                <span className={styles.channelName}>{dm.name}</span>
              </button>
              {onDeleteDm && (
                <button
                  className={styles.deleteBtn}
                  title={`Close DM with ${dm.name}`}
                  aria-label={`Delete DM with ${dm.name}`}
                  onClick={e => { e.stopPropagation(); onDeleteDm(dm.id); }}
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;
