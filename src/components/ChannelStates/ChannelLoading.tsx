import React from 'react';
import styles from './ChannelLoading.module.css';

const SkeletonRow: React.FC<{ wide?: boolean }> = ({ wide }) => (
  <div className={styles.skeletonRow}>
    <div className={styles.skeletonAvatar} />
    <div className={styles.skeletonContent}>
      <div className={`${styles.skeletonLine} ${styles.nameLine}`} />
      <div className={`${styles.skeletonLine} ${wide ? styles.wideLine : styles.shortLine}`} />
    </div>
  </div>
);

const ChannelLoading: React.FC = () => {
  return (
    <div className={styles.container}>
      <SkeletonRow wide />
      <SkeletonRow />
      <SkeletonRow wide />
    </div>
  );
};

export default ChannelLoading;
