import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import type { AppState, Channel, ChannelStatus, Message, Member } from './types';
import { avatarColorFor, initialsFrom, formatTimestamp, canonicalDmId } from './types';
import {
  getChannels,
  getMessages,
  sendMessage,
  createChannel,
  forgotPassword,
  resetPassword,
  ApiRequestError,
} from './api/client';
import type { ApiMessage } from './api/client';
import { AuthError, loginUser as loginWithPassword, registerUser } from './services/auth';
import { clearSession, getSession, saveSession } from './services/sessionStore';
import WorkspaceSwitcher from './components/WorkspaceSwitcher/WorkspaceSwitcher';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPane from './components/ChatPane/ChatPane';
import NewDmModal from './components/NewDmModal/NewDmModal';
import CreateChannelModal from './components/CreateChannelModal/CreateChannelModal';
import styles from './App.module.css';

type AuthMode = 'login' | 'register';

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const EyeIcon = ({ hidden }: { hidden: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {hidden ? (
      <>
        <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.4A10.8 10.8 0 0 1 12 5.2c5.2 0 8.5 5 8.5 5s-.9 1.4-2.4 2.8M6.2 6.3C3.8 7.8 2.5 10.2 2.5 10.2s3.3 5 9.5 5c.7 0 1.4-.1 2-.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <path d="M2.5 12s3.3-5 9.5-5 9.5 5 9.5 5-3.3 5-9.5 5-9.5-5-9.5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </>
    )}
  </svg>
);

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  visible: boolean;
  onToggleVisibility: () => void;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ visible, onToggleVisibility, className = '', ...props }) => (
  <div className="password-input-wrap">
    <input {...props} type={visible ? 'text' : 'password'} className={`input password-input ${className}`} />
    <button
      type="button"
      className="password-visibility-toggle"
      onClick={onToggleVisibility}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      disabled={props.disabled}
    >
      <EyeIcon hidden={!visible} />
    </button>
  </div>
);

function getRecoveryApiErrorMessage(error: unknown, fallback: string): string {
  const rawMessage = error instanceof Error ? error.message : '';

  if (/no route found|route not found/i.test(rawMessage)) {
    const status = error instanceof ApiRequestError ? ` (HTTP ${error.status})` : '';
    return `Password recovery API route is unavailable${status}. Please try again later.`;
  }

  if (error instanceof ApiRequestError) {
    if (error.status === 404) {
      return `Password recovery API is unavailable (HTTP ${error.status}). Please try again later.`;
    }
    return `Password recovery request failed (HTTP ${error.status}).`;
  }

  return rawMessage ? `Password recovery request failed: ${rawMessage}` : fallback;
}

// ── Token + user handoff from login app ──────────────────
// Login app redirects here with ?token=xxx&name=xxx&email=xxx
const params = new URLSearchParams(window.location.search);
const urlToken = params.get('token');
const urlName  = params.get('name');
const urlEmail = params.get('email');

if (urlToken) {
  localStorage.setItem('huddle_token', urlToken);
  if (urlName)  localStorage.setItem('huddle_user_name', urlName);
  if (urlEmail) localStorage.setItem('huddle_user_email', urlEmail);
  // Remove credentials from URL bar
  params.delete('token');
  params.delete('name');
  params.delete('email');
  const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
  window.history.replaceState({}, '', clean);
}

function redirectToLogin() {
  localStorage.removeItem('huddle_token');
  localStorage.removeItem('huddle_user_name');
  localStorage.removeItem('huddle_user_email');
  clearSession();
  window.location.href = window.location.pathname;
}

// Accept the previous local login storage shape and expose the token key used by api/client.
function bridgeStoredSession(): boolean {
  if (localStorage.getItem('huddle_token')) return true;

  const session = getSession();
  if (!session) return false;

  localStorage.setItem('huddle_token', session.accessToken);
  if (session.user.name) localStorage.setItem('huddle_user_name', session.user.name);
  if (session.user.email) localStorage.setItem('huddle_user_email', session.user.email);
  return true;
}

bridgeStoredSession();

const storedName  = localStorage.getItem('huddle_user_name') ?? '';
const storedEmail = localStorage.getItem('huddle_user_email') ?? '';

// If name/email weren't stored from login redirect, try to decode them from the JWT
if (!storedName && !storedEmail) {
  const token = localStorage.getItem('huddle_token') ?? '';
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.name)  { localStorage.setItem('huddle_user_name',  payload.name);  }
        if (payload.email) { localStorage.setItem('huddle_user_email', payload.email); }
      }
    } catch { /* ignore decode errors */ }
  }
}

const resolvedName  = localStorage.getItem('huddle_user_name') ?? '';
const resolvedEmail = localStorage.getItem('huddle_user_email') ?? '';
const displayName = resolvedName || resolvedEmail.split('@')[0] || 'You';

const USER_ID_KEY = 'huddle_user_id';

function getCurrentUserId(): string {
  const session = getSession();
  if (session?.user?.id) return session.user.id;
  const storedId = localStorage.getItem(USER_ID_KEY);
  if (storedId) return storedId;
  return resolvedEmail || resolvedName || 'guest';
}

const currentUserId = getCurrentUserId();
const DM_STORAGE_KEY = `huddle_dms_${currentUserId || 'guest'}`;
const CUSTOM_CHANNELS_KEY = `huddle_custom_channels`;

function loadSavedDms(): Channel[] {
  try {
    const raw = localStorage.getItem(DM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const unique = new Map<string, Channel>();
      parsed.forEach((dm: Channel) => {
        if (dm?.type !== 'dm' || !dm.id.startsWith('dm:')) return;
        unique.set(dm.id, dm);
      });
      return Array.from(unique.values());
    }
  } catch { /* ignore */ }
  return [];
}

function saveDms(dms: Channel[]) {
  try {
    localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(dms));
  } catch { /* ignore */ }
}

function loadCustomChannels(): Channel[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CHANNELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* ignore */ }
  return [];
}

function saveCustomChannels(channels: Channel[]) {
  try {
    localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(channels));
  } catch { /* ignore */ }
}

function loadLocalChannelMessages(channelId: string): Message[] {
  try {
    const raw = localStorage.getItem(`huddle_chan_msgs_${channelId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* ignore */ }
  return [];
}

function saveLocalChannelMessages(channelId: string, msgs: Message[]) {
  try {
    localStorage.setItem(`huddle_chan_msgs_${channelId}`, JSON.stringify(msgs));
  } catch { /* ignore */ }
}

// Initial directory of signed up users
const DEFAULT_KNOWN_MEMBERS: Member[] = [
  { id: 'u1', name: 'maya chen', email: 'adejumoyusluv@gmail.com' },
  { id: 'u2', name: 'Yusuf', email: 'adejumo@gmail.com' },
  { id: 'u3', name: 'Kessiena', email: 'kessakpobire@gmail.com' },
  { id: 'u4', name: 'OREOLUWA Onietan', email: 'oreoluwaonietan@gmail.com' },
  { id: 'u5', name: 'Ray', email: 'dreamxi27@gmail.com' },
  { id: 'u6', name: 'Mayowa', email: 'yusufadejumo09@gmail.com' },
  { id: 'u7', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'u8', name: 'Ade Tiger', email: 'ade@example.com' },
];

function loadSavedMembers(): Member[] {
  try {
    const raw = localStorage.getItem('huddle_known_members');
    if (!raw) return DEFAULT_KNOWN_MEMBERS;
    const parsed: Member[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const map = new Map<string, Member>();
      DEFAULT_KNOWN_MEMBERS.forEach(m => map.set((m.email || m.name).toLowerCase(), m));
      parsed.forEach(m => map.set((m.email || m.name).toLowerCase(), m));
      return Array.from(map.values());
    }
  } catch { /* ignore */ }
  return DEFAULT_KNOWN_MEMBERS;
}

// Build workspace from real user info instead of mock data
const userWorkspace: AppState['workspace'] = {
  id: 'user',
  name: displayName,
  initials: initialsFrom(displayName),
  avatarColor: avatarColorFor(resolvedEmail || displayName),
};

const mapApiMessage = (m: ApiMessage): Message => {
  const authorName = m.author?.name || m.userName || m.author?.email || 'User';
  const authorId = m.author?.id || m.userId || authorName;
  return {
    id: m.id,
    author: authorName,
    authorId: m.author?.id || m.userId,
    authorInitials: initialsFrom(authorName),
    avatarColor: avatarColorFor(authorId),
    timestamp: formatTimestamp(m.createdAt),
    content: m.content,
  };
};

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryView, setRecoveryView] = useState<'login' | 'request' | 'check-email' | 'reset' | 'success'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState(email.trim());
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const isRegister = mode === 'register';
  const isFormValid = isRegister
    ? fullName.trim().length > 0 && EMAIL_RE.test(email) && PASSWORD_RE.test(password) && termsAccepted
    : email.trim().length > 0 && password.length > 0;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setAccountCreated(false);
    setFullName('');
    setEmail('');
    setPassword('');
    setTermsAccepted(false);
    setFieldErrors({});
    setFormError('');
    setLoading(false);
    setRecoveryView('login');
    setRecoveryError('');
    setRecoverySuccess('');
    setResetError('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordVisible(false);
    setNewPasswordVisible(false);
    setConfirmPasswordVisible(false);
  };

  const validate = () => {
    const errors: FieldErrors = {};

    if (isRegister && !fullName.trim()) errors.fullName = 'Enter your name';
    if (!email.trim()) {
      errors.email = 'Enter your email address';
    } else if (!EMAIL_RE.test(email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Enter your password';
    } else if (isRegister && !PASSWORD_RE.test(password)) {
      errors.password = 'Use at least 8 characters with at least one letter and one number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (!validate()) {
      setFormError(
        isRegister
          ? "We couldn't create your account. Fix the fields below and try again."
          : "That email and password don't match. Try again or reset your password.",
      );
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await registerUser({
          name: fullName.trim(),
          email: email.trim(),
          password,
        });
        setAccountCreated(true);
        setPassword('');
        return;
      }

      const session = await loginWithPassword({
        email: email.trim(),
        password,
      });

      saveSession(session);
      localStorage.setItem('huddle_token', session.accessToken);
      localStorage.setItem(USER_ID_KEY, session.user.id ?? session.user.email);
      if (session.user.name) localStorage.setItem('huddle_user_name', session.user.name);
      if (session.user.email) localStorage.setItem('huddle_user_email', session.user.email);
      window.location.reload();
    } catch (error) {
      if (error instanceof AuthError && isRegister && error.status === 409) {
        setFormError(error.message || 'An account with this email already exists.');
      } else {
        setFormError(
          isRegister
            ? "We couldn't create your account. Please check your details and try again."
            : "That email and password don't match. Try again or reset your password.",
        );
      }
    } finally {
      setLoading(false);
      if (!isRegister) setPassword('');
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail = email.trim();
    if (!targetEmail || !EMAIL_RE.test(targetEmail)) {
      setRecoveryError('Enter a valid email address to receive a reset link.');
      setRecoveryView('request');
      return;
    }

    setRecoveryEmail(targetEmail);
    setRecoveryError('');
    setRecoverySuccess('');
    setIsRecovering(true);

    try {
      await forgotPassword(targetEmail);
      setRecoveryView('check-email');
      setRecoverySuccess(`Check your email`);
    } catch (error) {
      setRecoveryError(getRecoveryApiErrorMessage(error, 'We could not send the reset link right now.'));
      setRecoveryView('request');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleResendRecoveryEmail = async () => {
    setRecoveryError('');
    setRecoverySuccess('');
    setIsRecovering(true);

    try {
      await forgotPassword(recoveryEmail || email.trim());
      setRecoveryView('check-email');
      setRecoverySuccess('Check your email');
    } catch (error) {
      setRecoveryError(getRecoveryApiErrorMessage(error, 'We could not resend the reset link.'));
    } finally {
      setIsRecovering(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError('');

    if (!newPassword || !confirmPassword) {
      setResetError('Both password fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setResetError('This reset link is missing a valid token.');
      return;
    }

    setIsRecovering(true);

    try {
      await resetPassword(resetToken, newPassword, confirmPassword);
      setRecoveryView('success');
      setNewPassword('');
      setConfirmPassword('');
      setResetError('');
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    } catch (error) {
      setResetError(getRecoveryApiErrorMessage(error, 'We could not update your password.'));
    } finally {
      setIsRecovering(false);
    }
  };

  const renderRecoveryScreen = () => {
    const recoveryBrand = (
      <div className="recovery-brand" aria-label="Huddle home">
        <div className="recovery-mark">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20H6L4 22V12Z" fill="white" />
          </svg>
        </div>
        <span>huddle</span>
      </div>
    );

    if (recoveryView === 'request') {
      return (
        <div className="recovery-page">
          <div className="recovery-panel">
            {recoveryBrand}
            <h2>Forgot your password?</h2>
            <p className="recovery-subtitle">Enter your email below and we’ll send you a reset link to regain access to your account.</p>
            {recoveryError && <div className="top-alert">{recoveryError}</div>}
            <div className="field recovery-field">
              <label htmlFor="recoveryEmail">Email</label>
              <input
                id="recoveryEmail"
                className={`input ${recoveryError ? 'error' : ''}`}
                value={recoveryEmail || email}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                disabled={isRecovering}
                placeholder="you@company.com"
              />
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={handleForgotPassword} disabled={isRecovering}>
              {isRecovering ? 'Sending...' : 'Send reset link'}
            </button>
            <button type="button" className="recovery-link" onClick={() => { setRecoveryView('login'); setRecoveryError(''); setRecoverySuccess(''); }}>
              Back to sign in
            </button>
          </div>
        </div>
      );
    }

    if (recoveryView === 'check-email') {
      return (
        <div className="recovery-page">
          <div className="recovery-panel recovery-panel-center">
            {recoveryBrand}
            <div className="recovery-checkmark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5L9.5 17L19 7" stroke="#2e9e6d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>Check your email</h2>
            <p className="recovery-subtitle centered">A password reset link has been sent to <strong>{recoveryEmail || email}</strong>. The link expires shortly for security.</p>
            {recoveryError && <div className="top-alert">{recoveryError}</div>}
            {recoverySuccess && <div className="top-success">{recoverySuccess}</div>}
            <div className="recovery-actions">
              <button type="button" className="btn btn-primary btn-block" onClick={() => {
                setResetToken(new URLSearchParams(window.location.search).get('token') ?? '');
                setRecoveryView('reset');
              }}>
                Open reset screen
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={handleResendRecoveryEmail} disabled={isRecovering}>
                {isRecovering ? 'Sending...' : 'Resend email'}
              </button>
            </div>
            <button type="button" className="recovery-link" onClick={() => { setRecoveryView('login'); setRecoveryError(''); setRecoverySuccess(''); }}>
              Back to sign in
            </button>
          </div>
        </div>
      );
    }

    if (recoveryView === 'reset') {
      return (
        <div className="recovery-page">
          <div className="recovery-panel">
            {recoveryBrand}
            <h2>Reset your password</h2>
            <p className="recovery-subtitle">Create a new password for your account.</p>
            {resetError && <div className="top-alert">{resetError}</div>}
            <form onSubmit={handleResetPassword} noValidate>
              <div className="field recovery-field">
                <label htmlFor="newPassword">New password</label>
                <PasswordInput id="newPassword" visible={newPasswordVisible} onToggleVisibility={() => setNewPasswordVisible((visible) => !visible)} className={resetError ? 'error' : ''} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isRecovering} placeholder="New password" />
              </div>
              <div className="field recovery-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <PasswordInput id="confirmPassword" visible={confirmPasswordVisible} onToggleVisibility={() => setConfirmPasswordVisible((visible) => !visible)} className={resetError ? 'error' : ''} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isRecovering} placeholder="Confirm password" />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={isRecovering}>
                {isRecovering ? 'Updating...' : 'Update password'}
              </button>
            </form>
            <button type="button" className="recovery-link" onClick={() => { setRecoveryView('login'); setResetError(''); setNewPassword(''); setConfirmPassword(''); }}>
              Back to sign in
            </button>
          </div>
        </div>
      );
    }

    if (recoveryView === 'success') {
      return (
        <div className="recovery-page">
          <div className="recovery-panel recovery-panel-center">
            {recoveryBrand}
            <div className="recovery-checkmark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5L9.5 17L19 7" stroke="#2e9e6d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>Password updated</h2>
            <p className="recovery-subtitle centered">Your password was successfully changed. You can now sign in with your new password.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => { setRecoveryView('login'); setMode('login'); setEmail(''); setPassword(''); setRecoveryError(''); setRecoverySuccess(''); setResetError(''); }}>
              Return to sign in
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="auth-screen">
        <div className="auth-form-col">
          {accountCreated ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e9f8f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5L9.5 17L19 7" stroke="#18a875" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={{ marginBottom: 10 }}>Account created</h2>
              <div className="sub" style={{ marginBottom: 28 }}>Sign in with your new account to continue.</div>
              <button type="button" className="btn btn-primary" onClick={() => switchMode('login')}>
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="mini-brand">
                <div className="mark">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20H6L4 22V12Z" fill="white" />
                  </svg>
                </div>
                <span>huddle</span>
              </div>

              <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
              <div className="sub">{isRegister ? 'Takes about a minute.' : 'Sign in to jump into your channels.'}</div>

              {formError && <div className="top-alert">{formError}</div>}

              <form onSubmit={handleSubmit} noValidate>
                {isRegister && (
                  <div className="field">
                    <label htmlFor="fullName">Full name <span className="req">*</span></label>
                    <input id="fullName" className={`input ${fieldErrors.fullName ? 'error' : ''}`} placeholder="Maya Chen" value={fullName} disabled={loading} onChange={(event) => setFullName(event.target.value)} />
                    {fieldErrors.fullName && <div className="hint error">{fieldErrors.fullName}</div>}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="email">Email {isRegister && <span className="req">*</span>}</label>
                  <input id="email" className={`input ${fieldErrors.email ? 'error' : ''}`} placeholder="you@company.com" value={email} disabled={loading} onChange={(event) => setEmail(event.target.value)} />
                  {fieldErrors.email && <div className="hint error">{fieldErrors.email}</div>}
                </div>

                <div className="field">
                  <label htmlFor="password">Password {isRegister && <span className="req">*</span>}</label>
                  <PasswordInput id="password" visible={passwordVisible} onToggleVisibility={() => setPasswordVisible((visible) => !visible)} className={fieldErrors.password ? 'error' : ''} placeholder={isRegister ? 'At least 8 characters' : 'Password'} value={password} disabled={loading} onChange={(event) => setPassword(event.target.value)} />
                  {isRegister && !fieldErrors.password && (<div className="hint">Use 8+ characters with at least one letter and one number.</div>)}
                  {fieldErrors.password && <div className="hint error">{fieldErrors.password}</div>}
                </div>

                {!isRegister && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                    <button type="button" className="forgot-link" onClick={() => { setRecoveryEmail(email.trim()); setRecoveryError(''); setRecoverySuccess(''); setRecoveryView('request'); }}>
                      Forgot password?
                    </button>
                  </div>
                )}

                {isRegister && (
                  <div className="field checkbox-row" style={{ marginBottom: 20 }}>
                    <input type="checkbox" id="terms" checked={termsAccepted} disabled={loading} onChange={(event) => setTermsAccepted(event.target.checked)} />
                    <label htmlFor="terms">I agree to Terms and Privacy Policy</label>
                  </div>
                )}

                <button type="submit" className={`btn btn-primary btn-block ${loading || !isFormValid ? 'disabled' : ''}`} disabled={loading || !isFormValid}>
                  {loading && <span className="spinner" />}
                  {loading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create account' : 'Sign in')}
                </button>
              </form>

              <div className="auth-switch">
                {isRegister ? (
                  <>Already have an account? <button type="button" onClick={() => switchMode('login')}>Log in</button></>
                ) : (
                  <>Need an account? <button type="button" onClick={() => switchMode('register')}>Sign up</button></>
                )}
              </div>
            </>
          )}
        </div>

        <div className="auth-illustration">
          <div className="illus-hero">
            <h3>{isRegister ? 'One place for the whole team to talk.' : 'Pick up right where you left off.'}</h3>
            <p>{isRegister ? 'Channels for topics, not endless email threads.' : 'Every channel and message, right where you expect it.'}</p>
          </div>
          <div className="illus-card">
            <div className="msg-row">
              <div className="msg-avatar" style={{ background: 'var(--brand-500)' }}>JT</div>
              <div className="msg-content">
                <div className="msg-top">
                  <span className="msg-name">Jordan Tate</span>
                  <span className="msg-time">10:14 AM</span>
                </div>
                <div className="msg-text">Pushed the auth API. Ready to wire up whenever.</div>
              </div>
            </div>
            <div className="msg-row">
              <div className="msg-avatar" style={{ background: 'var(--brand-400)' }}>MC</div>
              <div className="msg-content">
                <div className="msg-top">
                  <span className="msg-name">Maya Chen</span>
                  <span className="msg-time">10:16 AM</span>
                </div>
                <div className="msg-text">Nice. Pulling it into the login screen now.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return renderRecoveryScreen();
}

const HuddleApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    workspace: userWorkspace,
    channels: loadCustomChannels(),
    directMessages: loadSavedDms(),
    activeChannelId: '',
    channelStatus: 'loading',
  });
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>('loading');
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const [knownMembers, setKnownMembers] = useState<Member[]>(loadSavedMembers);
  const [isNewDmOpen, setIsNewDmOpen] = useState<boolean>(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState<boolean>(false);

  const allChannels: Channel[] = [...appState.channels, ...appState.directMessages];
  const activeChannel = allChannels.find(c => c.id === appState.activeChannelId) ?? allChannels[0];

  const updateKnownMembers = useCallback((newMessages: ApiMessage[]) => {
    setKnownMembers(prev => {
      const map = new Map<string, Member>();
      prev.forEach(m => map.set((m.email || m.name).toLowerCase(), m));
      let changed = false;
      newMessages.forEach(m => {
        const name = m.author?.name || m.userName;
        const email = m.author?.email;
        if (name) {
          const key = (email || name).toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              id: m.author?.id || m.userId || key,
              name,
              email,
            });
            changed = true;
          }
        }
      });
      if (changed) {
        const updated = Array.from(map.values());
        try {
          localStorage.setItem('huddle_known_members', JSON.stringify(updated));
        } catch { /* ignore */ }
        return updated;
      }
      return prev;
    });
  }, []);

  // Load channels from API on mount
  useEffect(() => {
    getChannels()
      .then(({ channels }) => {
        const apiChannels: Channel[] = (channels || []).map(c => ({
          id: c.id,
          name: c.name,
          type: 'channel' as const,
          messages: [],
        }));

        // Merge backend channels with any custom-created channels
        const custom = loadCustomChannels();
        const existingIds = new Set(apiChannels.map(c => c.id));
        const merged = [...apiChannels, ...custom.filter(c => !existingIds.has(c.id))];

        setAppState(prev => ({
          ...prev,
          channels: merged,
          activeChannelId: prev.activeChannelId || (merged[0] ? merged[0].id : ''),
        }));

        // Discover members across channels
        apiChannels.forEach(ch => {
          getMessages(ch.id)
            .then(res => {
              if (res && res.messages) {
                updateKnownMembers(res.messages);
              }
            })
            .catch(() => {});
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('401') || msg.includes('403')) {
          redirectToLogin();
        } else {
          // If offline or API fails, still keep custom channels
          const custom = loadCustomChannels();
          if (custom.length > 0) {
            setAppState(prev => ({
              ...prev,
              channels: custom,
              activeChannelId: prev.activeChannelId || custom[0].id,
            }));
            setChannelStatus('loaded');
          } else {
            setChannelStatus('error');
          }
        }
      });
  }, [updateKnownMembers]);

  // Fetch messages for a channel
  const fetchChannelMessages = useCallback(async (channelId: string, isInitial: boolean = false) => {
    if (!channelId) return;

    // Check if this is a custom local channel
    if (channelId.startsWith('custom-')) {
      const localMsgs = loadLocalChannelMessages(channelId);
      setAppState(prev => ({
        ...prev,
        channels: prev.channels.map(ch =>
          ch.id === channelId ? { ...ch, messages: localMsgs } : ch
        ),
      }));
      setChannelStatus(localMsgs.length === 0 ? 'empty' : 'loaded');
      return;
    }

    if (isInitial) {
      setChannelStatus('loading');
    }
    try {
      const { messages } = await getMessages(channelId);
      const rawMessages = messages || [];
      const mapped = rawMessages.map(mapApiMessage);
      setAppState(prev => ({
        ...prev,
        channels: prev.channels.map(ch =>
          ch.id === channelId ? { ...ch, messages: mapped } : ch
        ),
      }));
      setChannelStatus(mapped.length === 0 ? 'empty' : 'loaded');
      updateKnownMembers(rawMessages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401') || msg.includes('403')) {
        redirectToLogin();
      } else if (isInitial) {
        setChannelStatus('error');
      }
    }
  }, [updateKnownMembers]);

  // Handle active channel change and auto-polling
  useEffect(() => {
    if (!appState.activeChannelId) return;

    const isDm = appState.directMessages.some(dm => dm.id === appState.activeChannelId);
    if (isDm) {
      const dm = appState.directMessages.find(d => d.id === appState.activeChannelId);
      const nextStatus = dm && dm.messages.length > 0 ? 'loaded' : 'empty';
      const statusTimer = window.setTimeout(() => setChannelStatus(nextStatus), 0);
      return () => window.clearTimeout(statusTimer);
    }

    const initialTimer = window.setTimeout(() => {
      fetchChannelMessages(appState.activeChannelId, true);
    }, 0);

    if (appState.activeChannelId.startsWith('custom-')) {
      return () => window.clearTimeout(initialTimer);
    }

    // Auto-poll every 3 seconds for real-time updates between multiple users.
    const pollInterval = window.setInterval(() => {
      fetchChannelMessages(appState.activeChannelId, false);
    }, 3000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(pollInterval);
    };
  }, [appState.activeChannelId, appState.directMessages, fetchChannelMessages]);

  // Select channel or DM
  const handleSelectChannel = (id: string) => {
    setAppState(prev => ({ ...prev, activeChannelId: id }));
    setMobileView('chat');
  };

  // Create a new channel
  const handleCreateChannel = async (name: string) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    if (!cleanName) return;

    try {
      // Attempt backend creation
      const apiChannel = await createChannel(cleanName);
      if (apiChannel && apiChannel.id) {
        const newChan: Channel = {
          id: apiChannel.id,
          name: apiChannel.name || cleanName,
          type: 'channel',
          messages: [],
        };
        setAppState(prev => ({
          ...prev,
          channels: [...prev.channels, newChan],
          activeChannelId: newChan.id,
        }));
        setChannelStatus('empty');
        setMobileView('chat');
        return;
      }
    } catch {
      // Backend create endpoint not available yet -> create and persist locally
    }

    const localId = `custom-${Date.now()}`;
    const newChan: Channel = {
      id: localId,
      name: cleanName,
      type: 'channel',
      messages: [],
    };
    const nextCustom = [...loadCustomChannels(), newChan];
    saveCustomChannels(nextCustom);

    setAppState(prev => ({
      ...prev,
      channels: [...prev.channels, newChan],
      activeChannelId: localId,
    }));
    setChannelStatus('empty');
    setMobileView('chat');
  };

  // Start a direct message with another user
  const handleStartDm = (authorName: string, authorId?: string) => {
    if (!authorName || !authorId || authorId === currentUserId) return;
    const dmId = canonicalDmId(currentUserId, authorId);

    setAppState(prev => {
      const matching = prev.directMessages.filter(d => d.id === dmId);
      const existing = matching[0];
      if (existing) {
        const deduplicated = prev.directMessages.filter(d => d.id !== dmId || d === existing);
        if (deduplicated.length !== prev.directMessages.length) saveDms(deduplicated);
        return { ...prev, directMessages: deduplicated, activeChannelId: dmId };
      }
      const newDm: Channel = {
        id: dmId,
        name: authorName,
        type: 'dm',
        participantId: authorId,
        messages: [],
      };
      const nextDms = [...prev.directMessages, newDm];
      saveDms(nextDms);
      return {
        ...prev,
        directMessages: nextDms,
        activeChannelId: dmId,
      };
    });
    setMobileView('chat');
  };

  // Send message — handles channels, custom channels, and direct messages
  const handleSend = async (text: string) => {
    if (!text.trim() || !appState.activeChannelId) return;

    const isDm = appState.directMessages.some(dm => dm.id === appState.activeChannelId);
    const now = new Date().toISOString();
    const optimisticId = `local-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      author: displayName,
      authorInitials: initialsFrom(displayName),
      avatarColor: avatarColorFor(storedEmail || displayName),
      timestamp: formatTimestamp(now),
      content: text,
    };

    if (isDm) {
      setAppState(prev => {
        const nextDms = prev.directMessages.map(dm =>
          dm.id === prev.activeChannelId
            ? { ...dm, messages: [...dm.messages, optimistic] }
            : dm
        );
        saveDms(nextDms);
        return { ...prev, directMessages: nextDms };
      });
      setChannelStatus('loaded');
      return;
    }

    // Custom local channel message
    if (appState.activeChannelId.startsWith('custom-')) {
      setAppState(prev => {
        const nextChannels = prev.channels.map(ch =>
          ch.id === prev.activeChannelId
            ? { ...ch, messages: [...ch.messages, optimistic] }
            : ch
        );
        const currentMsgs = prev.channels.find(c => c.id === prev.activeChannelId)?.messages || [];
        saveLocalChannelMessages(prev.activeChannelId, [...currentMsgs, optimistic]);
        return { ...prev, channels: nextChannels };
      });
      setChannelStatus('loaded');
      return;
    }

    // Backend Channel message: optimistic addition
    setAppState(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.id === prev.activeChannelId
          ? { ...ch, messages: [...ch.messages, optimistic] }
          : ch
      ),
    }));
    setChannelStatus('loaded');

    try {
      const saved = await sendMessage(appState.activeChannelId, text);
      const real = mapApiMessage(saved);
      setAppState(prev => ({
        ...prev,
        channels: prev.channels.map(ch =>
          ch.id === prev.activeChannelId
            ? {
                ...ch,
                messages: ch.messages.map(m => (m.id === optimisticId ? real : m)),
              }
            : ch
        ),
      }));
      if (saved) {
        updateKnownMembers([saved]);
      }
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401') || msg.includes('403')) {
        redirectToLogin();
      }
    }
  };

  // Delete a channel
  const handleDeleteChannel = (id: string) => {
    setAppState(prev => {
      const nextChannels = prev.channels.filter(c => c.id !== id);
      // If the deleted channel was active, switch to first remaining
      const nextActive = prev.activeChannelId === id
        ? (nextChannels[0]?.id || prev.directMessages[0]?.id || '')
        : prev.activeChannelId;
      return { ...prev, channels: nextChannels, activeChannelId: nextActive };
    });
    // Remove from localStorage if it was a custom channel
    if (id.startsWith('custom-')) {
      const updated = loadCustomChannels().filter(c => c.id !== id);
      saveCustomChannels(updated);
      localStorage.removeItem(`huddle_chan_msgs_${id}`);
    }
  };

  // Delete a DM conversation
  const handleDeleteDm = (id: string) => {
    setAppState(prev => {
      const nextDms = prev.directMessages.filter(d => d.id !== id);
      const nextActive = prev.activeChannelId === id
        ? (prev.channels[0]?.id || nextDms[0]?.id || '')
        : prev.activeChannelId;
      saveDms(nextDms);
      return { ...prev, directMessages: nextDms, activeChannelId: nextActive };
    });
  };

  // Retry loading messages
  const handleRetry = () => {
    fetchChannelMessages(appState.activeChannelId, true);
  };

  return (
    <div className={styles.app}>
      <div className={styles.shell}>
        <WorkspaceSwitcher workspace={appState.workspace} />
        <Sidebar
          workspace={appState.workspace}
          channels={appState.channels}
          directMessages={appState.directMessages}
          activeChannelId={appState.activeChannelId}
          onSelectChannel={handleSelectChannel}
          onDeleteChannel={handleDeleteChannel}
          onDeleteDm={handleDeleteDm}
          onSignOut={redirectToLogin}
          onOpenNewDm={() => setIsNewDmOpen(true)}
          onOpenCreateChannel={() => setIsCreateChannelOpen(true)}
          hidden={mobileView === 'chat'}
        />
        {activeChannel && (
          <ChatPane
            channel={activeChannel}
            status={channelStatus}
            onSend={handleSend}
            onRetry={handleRetry}
            onBack={() => setMobileView('sidebar')}
            hidden={mobileView === 'sidebar'}
            currentUserName={displayName}
            onStartDm={handleStartDm}
            onOpenNewDm={() => setIsNewDmOpen(true)}
          />
        )}
      </div>

      <NewDmModal
        isOpen={isNewDmOpen}
        onClose={() => setIsNewDmOpen(false)}
        members={knownMembers}
        currentUserName={displayName}
        currentUserEmail={storedEmail}
        onSelectUser={handleStartDm}
      />

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onCreateChannel={handleCreateChannel}
      />
    </div>
  );
};

const App: React.FC = () => (bridgeStoredSession() ? <HuddleApp /> : <AuthScreen />);

export default App;

