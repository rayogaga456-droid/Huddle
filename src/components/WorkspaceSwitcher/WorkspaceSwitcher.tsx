import React from 'react';
import type { Workspace } from '../../types';
import styles from './WorkspaceSwitcher.module.css';

interface Props {
  workspace: Workspace;
}

const WorkspaceSwitcher: React.FC<Props> = ({ workspace }) => {
  return (
    <div className={styles.switcher}>
      {/* Brand logo mark */}
      <div className={styles.logo}>
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20H6L4 22V12Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Workspace chip */}
      <div className={styles.wsChip} title={workspace.name}>
        {workspace.initials}
      </div>
    </div>
  );
};

export default WorkspaceSwitcher;
