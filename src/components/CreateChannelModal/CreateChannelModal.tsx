import React, { useState, useEffect, useRef } from 'react';
import styles from './CreateChannelModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, isPrivate: boolean) => void;
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CreateChannelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreateChannel,
}) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const resetTimer = window.setTimeout(() => {
        setName('');
        setIsPrivate(false);
        inputRef.current?.focus();
      }, 50);

      return () => window.clearTimeout(resetTimer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format channel name to lowercase and replace spaces with hyphens
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    setName(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onCreateChannel(clean, isPrivate);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create a channel</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <p className={styles.description}>
            Channels are where your team communicates. They are best organized around a topic (e.g. #marketing, #leads, #announcements).
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="channel-name-input">
              Name
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.prefix}>#</span>
              <input
                id="channel-name-input"
                ref={inputRef}
                type="text"
                className={styles.input}
                placeholder="e.g. announcements"
                value={name}
                onChange={handleNameChange}
                maxLength={80}
              />
            </div>
            <span className={styles.hint}>
              Names must be lowercase, without spaces or periods.
            </span>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
            />
            <div className={styles.checkboxText}>
              <span className={styles.checkboxTitle}>Make private</span>
              <span className={styles.checkboxSub}>
                When a channel is private, it can only be viewed or joined by invitation.
              </span>
            </div>
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!name.trim()}
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
