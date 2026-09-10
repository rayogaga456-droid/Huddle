import React from 'react';
import styles from './ChannelStates.module.css';

// ── Empty ──────────────────────────────────────────────
interface EmptyProps { channelName: string; }

export const ChannelEmpty: React.FC<EmptyProps> = ({ channelName }) => (
  <div className={styles.emptyContainer}>
    <div className={styles.emptyIcon}>💬</div>
    <h4 className={styles.emptyTitle}>No messages yet</h4>
    <p className={styles.emptyDesc}>
      This is the very start of #{channelName}. Say something to get the conversation going.
    </p>
  </div>
);

// ── Loading skeleton ────────────────────────────────────
const SkeletonRow: React.FC<{ widths: string[] }> = ({ widths }) => (
  <div className={styles.skeletonRow}>
    <div className={styles.skeletonAvatar} />
    <div className={styles.skeletonLines}>
      {widths.map((w, i) => (
        <div key={i} className={styles.skeletonLine} style={{ width: w }} />
      ))}
    </div>
  </div>
);

export const ChannelLoading: React.FC = () => (
  <div className={styles.loadContainer}>
    <SkeletonRow widths={['90px', '70%']} />
    <SkeletonRow widths={['80px', '55%']} />
    <SkeletonRow widths={['100px', '64%']} />
  </div>
);

// ── Error ───────────────────────────────────────────────
interface ErrorProps { onRetry: () => void; }

export const ChannelError: React.FC<ErrorProps> = ({ onRetry }) => (
  <div className={styles.errorContainer}>
    <div className={styles.errorIcon}>⚠</div>
    <h4 className={styles.errorTitle}>Couldn't load messages</h4>
    <p className={styles.errorDesc}>Check your connection and try again.</p>
    <button className={styles.retryBtn} onClick={onRetry}>Retry</button>
  </div>
);
