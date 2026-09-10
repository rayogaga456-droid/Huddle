import React, { useState } from 'react';
import type { Channel, Workspace } from '../../types';
import styles from './Sidebar.module.css';

interface Props {
  workspace: Workspace;
  channels: Channel[];
  directMessages: Channel[];
  activeChannelId: string;
  onSelectChannel: (id: string) => void;
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
  hidden,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className={`${styles.sidebar}${hidden ? ` ${styles.hidden}` : ''}`}>
      {/* Workspace name */}
      <div className={styles.wsName} onClick={() => setMenuOpen(o => !o)}>
        <span>{workspace.name}</span>
        <ChevronDown open={menuOpen} />
      </div>

      {/* Workspace dropdown menu */}
      {menuOpen && (
        <div className={styles.wsMenu}>
          <button className={styles.wsMenuItem} onClick={() => setMenuOpen(false)}>
            Invite people
          </button>
          <button className={styles.wsMenuItem} onClick={() => setMenuOpen(false)}>
            Settings &amp; administration
          </button>
          <div className={styles.wsMenuDivider} />
          <button className={styles.wsMenuItem} onClick={() => setMenuOpen(false)}>
            Sign out of {workspace.name}
          </button>
        </div>
      )}

      {/* Channels */}
      <div className={styles.groupLabel}>Channels</div>
      <ul className={styles.list}>
        {channels.map(ch => (
          <li key={ch.id}>
            <button
              className={`${styles.navItem} ${activeChannelId === ch.id ? styles.active : ""}`}
              onClick={() => onSelectChannel(ch.id)}
            >
              <span className={styles.icon}>
                {ch.name === 'design' ? <LockIcon /> : <HashIcon />}
              </span>
              <span className={styles.channelName}>{ch.name}</span>
              {ch.unreadCount != null && ch.unreadCount > 0 && (
                <span className={styles.badge}>{ch.unreadCount}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Direct Messages */}
      <div className={styles.groupLabel}>Direct Messages</div>
      <ul className={styles.list}>
        {directMessages.map(dm => (
          <li key={dm.id}>
            <button
              className={`${styles.navItem} ${activeChannelId === dm.id ? styles.active : ''}`}
              onClick={() => onSelectChannel(dm.id)}
            >
              <span className={styles.dmDot} />
              <span className={styles.channelName}>{dm.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
