import React from 'react';
import type { Message } from '../../types';
import styles from './MessageBubble.module.css';

interface Props {
  message: Message;
  currentUserName?: string;
  onStartDm?: (authorName: string, authorId?: string) => void;
}

const MessageBubble: React.FC<Props> = ({ message, currentUserName, onStartDm }) => {
  const isOtherUser = currentUserName && message.author.toLowerCase() !== currentUserName.toLowerCase();

  const handleAuthorClick = () => {
    if (isOtherUser && onStartDm) {
      onStartDm(message.author, message.authorId);
    }
  };

  return (
    <div className={styles.bubble}>
      <div
        className={`${styles.avatar}${isOtherUser && onStartDm ? ` ${styles.avatarClickable}` : ''}`}
        style={{ backgroundColor: message.avatarColor }}
        onClick={handleAuthorClick}
        title={isOtherUser ? `Direct message ${message.author}` : undefined}
      >
        {message.authorInitials}
      </div>
      <div className={styles.content}>
        <div className={styles.meta}>
          <span
            className={`${styles.author}${isOtherUser && onStartDm ? ` ${styles.authorClickable}` : ''}`}
            onClick={handleAuthorClick}
            title={isOtherUser ? `Direct message ${message.author}` : undefined}
          >
            {isOtherUser ? message.author : 'You'}
          </span>
          <span className={styles.timestamp}>{message.timestamp}</span>
          {isOtherUser && onStartDm && (
            <button
              type="button"
              className={styles.dmActionBtn}
              onClick={handleAuthorClick}
              title={`Direct message ${message.author}`}
            >
              Direct message
            </button>
          )}
        </div>
        <p className={styles.text}>{message.content}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
