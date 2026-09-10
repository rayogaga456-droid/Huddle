import React from 'react';
import { Channel } from '../../types';
import styles from './ChannelHeader.module.css';

interface Props {
  channel: Channel;
  onInvite?: () => void;
  onBack?: () => void;
}

const HashIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2.5 6h11M2.5 10h11M6.5 1.5l-2 13M11.5 1.5l-2 13"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const PeopleIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="13" cy="5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
    <path d="M15 14c0-1.9-1-3.4-2.5-4.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const BackIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChannelHeader: React.FC<Props> = ({ channel, onInvite, onBack }) => {
  const isChannel = channel.type === 'channel';

  return (
    <div className={styles.header}>
      <button className={styles.backBtn} onClick={onBack} aria-label="Back to channels">
        <BackIcon />
        Channels
      </button>
      <div className={styles.info}>
        <div className={styles.name}>
          {isChannel && <HashIcon />}
          <span>{channel.name}</span>
        </div>
        {channel.memberCount && (
          <div className={styles.members}>
            <PeopleIcon />
            <span>{channel.memberCount} members</span>
          </div>
        )}
      </div>
      <button className={styles.inviteBtn} onClick={onInvite}>
        Invite
      </button>
    </div>
  );
};

export default ChannelHeader;

