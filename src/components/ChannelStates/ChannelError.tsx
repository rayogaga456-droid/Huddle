import React from 'react';
import styles from './ChannelError.module.css';

interface Props {
  onRetry: () => void;
}

const AlertIcon: React.FC = () => (
  <div className={styles.alertIconWrap}>
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M14 4L25 23H3L14 4Z"
        stroke="#EF4444"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="14" y1="11" x2="14" y2="17" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="20" r="0.8" fill="#EF4444" />
    </svg>
  </div>
);

const ChannelError: React.FC<Props> = ({ onRetry }) => {
  return (
    <div className={styles.container}>
      <AlertIcon />
      <h3 className={styles.title}>Couldn't load messages</h3>
      <p className={styles.description}>Check your connection and try again.</p>
      <button className={styles.retryBtn} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
};

export default ChannelError;
