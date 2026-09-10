import React from 'react';
import type { Message } from '../../types';
import styles from './MessageBubble.module.css';

interface Props {
  message: Message;
}

const MessageBubble: React.FC<Props> = ({ message }) => {
  return (
    <div className={styles.bubble}>
      <div className={styles.avatar} style={{ backgroundColor: message.avatarColor }}>
        {message.authorInitials}
      </div>
      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.author}>{message.author}</span>
          <span className={styles.timestamp}>{message.timestamp}</span>
        </div>
        <p className={styles.text}>{message.content}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
