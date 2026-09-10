import React from 'react';
import styles from './ChannelEmpty.module.css';

interface Props {
  channelName: string;
}

const ChatIcon: React.FC = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <rect width="36" height="36" rx="10" fill="#EDE9FE" />
    <path
      d="M9 12.5C9 11.4 9.9 10.5 11 10.5H25C26.1 10.5 27 11.4 27 12.5V22.5C27 23.6 26.1 24.5 25 24.5H19L15 28V24.5H11C9.9 24.5 9 23.6 9 22.5V12.5Z"
      stroke="#7C3AED"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="13.5" cy="17.5" r="1" fill="#7C3AED" />
    <circle cx="18" cy="17.5" r="1" fill="#7C3AED" />
    <circle cx="22.5" cy="17.5" r="1" fill="#7C3AED" />
  </svg>
);

const ChannelEmpty: React.FC<Props> = ({ channelName }) => {
  return (
    <div className={styles.container}>
      <ChatIcon />
      <h3 className={styles.title}>No messages yet</h3>
      <p className={styles.description}>
        This is the very start of #{channelName}. Say something to get the conversation going.
      </p>
    </div>
  );
};

export default ChannelEmpty;
