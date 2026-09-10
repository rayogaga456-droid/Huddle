import React, { useRef, useEffect } from 'react';
import { Channel, ChannelStatus, Message } from '../../types';
import ChannelHeader from '../ChannelHeader/ChannelHeader';
import MessageBubble from '../MessageBubble/MessageBubble';
import MessageComposer from '../MessageComposer/MessageComposer';
import { ChannelEmpty, ChannelLoading, ChannelError } from '../ChannelStates/ChannelStates';
import styles from './ChatPane.module.css';

interface Props {
  channel: Channel;
  status: ChannelStatus;
  onSend: (text: string) => void;
  onRetry: () => void;
  onBack?: () => void;
  hidden?: boolean;
}

const ChatPane: React.FC<Props> = ({ channel, status, onSend, onRetry, onBack, hidden }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channel.messages]);

  const renderBody = () => {
    if (status === 'loading') return <ChannelLoading />;
    if (status === 'error')   return <ChannelError onRetry={onRetry} />;
    if (status === 'empty' || channel.messages.length === 0) {
      return <ChannelEmpty channelName={channel.name} />;
    }
    return (
      <div className={styles.messages}>
        {channel.messages.map((msg: Message) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    );
  };

  return (
    <div className={`${styles.pane}${hidden ? ` ${styles.hidden}` : ''}`}>
      <ChannelHeader channel={channel} onBack={onBack} />
      <div className={styles.body}>{renderBody()}</div>
      <MessageComposer channelName={channel.name} onSend={onSend} />
    </div>
  );
};

export default ChatPane;

