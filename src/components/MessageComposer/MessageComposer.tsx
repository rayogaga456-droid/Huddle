import React from 'react';
import styles from './MessageComposer.module.css';

interface Props {
  channelName: string;
  onSend?: (text: string) => void;
}

const MessageComposer: React.FC<Props> = ({ channelName, onSend }) => {
  const [value, setValue] = React.useState('');

  const handleSend = () => {
    if (value.trim() && onSend) {
      onSend(value.trim());
      setValue('');
    }
  };

  return (
    <div className={styles.composerWrap}>
      <div className={styles.composerBox}>
        <input
          className={styles.input}
          type="text"
          placeholder={`Message #${channelName}`}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!value.trim()}
          aria-label="Send message"
        >
          {/* Send icon from the template */}
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 20L21 12L3 4V10L16 12L3 14V20Z" fill="white" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessageComposer;
