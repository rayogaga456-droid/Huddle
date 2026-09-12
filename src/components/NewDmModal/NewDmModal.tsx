import React, { useState, useEffect, useRef } from 'react';
import type { Member } from '../../types';
import { avatarColorFor, initialsFrom } from '../../types';
import styles from './NewDmModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentUserName: string;
  currentUserEmail?: string;
  onSelectUser: (name: string, id?: string, email?: string) => void;
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.searchIcon}>
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const NewDmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  members,
  currentUserName,
  currentUserEmail,
  onSelectUser,
}) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const resetTimer = window.setTimeout(() => {
        setSearch('');
        inputRef.current?.focus();
      }, 50);

      return () => window.clearTimeout(resetTimer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter out the current user so they don't DM themselves
  const otherMembers = members.filter(m => {
    const isSameName = m.name.trim().toLowerCase() === currentUserName.trim().toLowerCase();
    const isSameEmail = currentUserEmail && m.email && m.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase();
    return !isSameName && !isSameEmail;
  });

  const query = search.trim().toLowerCase();
  const filtered = otherMembers.filter(m => {
    const nameMatch = m.name.toLowerCase().includes(query);
    const emailMatch = m.email ? m.email.toLowerCase().includes(query) : false;
    return nameMatch || emailMatch;
  });

  const handleSelect = (member: Member) => {
    onSelectUser(member.name, member.id, member.email);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleSelect(filtered[0]);
      }
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={styles.header}>
          <h2 className={styles.title}>New Direct Message</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.searchBox}>
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search member by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.listHeader}>
          {query ? `Search results (${filtered.length})` : `Signed-up members (${otherMembers.length})`}
        </div>

        <ul className={styles.userList}>
          {filtered.map(member => (
            <li key={member.id || member.email || member.name}>
              <button
                type="button"
                className={styles.userItem}
                onClick={() => handleSelect(member)}
              >
                <div
                  className={styles.avatar}
                  style={{ backgroundColor: member.avatarColor || avatarColorFor(member.email || member.name) }}
                >
                  {initialsFrom(member.name)}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{member.name}</span>
                  {member.email && <span className={styles.userEmail}>{member.email}</span>}
                </div>
                <span className={styles.messageBadge}>Message</span>
              </button>
            </li>
          ))}

          {filtered.length === 0 && search.trim() && (
            <div className={styles.customUser}>
              <p className={styles.customUserText}>
                No signed-up member found matching <strong>"{search.trim()}"</strong>.
              </p>
            </div>
          )}

          {filtered.length === 0 && !search.trim() && (
            <div className={styles.emptyState}>
              No other members have joined yet.
            </div>
          )}
        </ul>
      </div>
    </div>
  );
};

export default NewDmModal;
