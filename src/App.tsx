import { useState } from "react";
import "./App.css";
import { loginUser, registerUser } from "./services/auth";

type Mode = "login" | "register";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function App() {
  const [mode, setMode] = useState<Mode>("register");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setFullName("");
    setEmail("");
    setPassword("");
    setTermsAccepted(false);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");
    setLoading(false);
  };

  // Silent real-time check used only to enable/disable the submit button.
  // Never sets fieldErrors, so it doesn't show red borders pre-submit —
  // per annotation: "no error copy needed since it's not yet an attempt."
  const isFormValid = isRegister
    ? fullName.trim().length > 0 &&
      EMAIL_RE.test(email) &&
      password.length >= 8 &&
      termsAccepted
    : email.trim().length > 0 && password.length > 0;

  const validate = () => {
    const errors: FieldErrors = {};

    if (isRegister && !fullName.trim()) {
      errors.fullName = "Enter your name";
    }

    if (!email.trim()) {
      errors.email = "Enter your email address";
    } else if (!EMAIL_RE.test(email)) {
      errors.email = "Enter a valid email address";
    }

    if (!password) {
      errors.password = "Enter your password";
    } else if (password.length < 8) {
      errors.password = "Use at least 8 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFieldErrors({});

    if (!validate()) {
      setFormError(
        isRegister
          ? "We couldn't create your account. Fix the fields below and try again."
          : "That email and password don't match. Try again or reset your password."
      );
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await registerUser({ fullName: fullName.trim(), email: email.trim(), password });
        setFormSuccess("Account created successfully.");
      } else {
        await loginUser({ email: email.trim(), password });
        setFormSuccess("Signed in successfully.");
      }
    } catch {
      setFormError(
        isRegister
          ? "We couldn't create your account. Fix the fields below and try again."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-form-col">
        <div className="mini-brand">
          <div className="mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20H6L4 22V12Z"
                fill="white"
              />
            </svg>
          </div>
          <span>huddle</span>
        </div>

        <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
        <div className="sub">{isRegister ? "Takes about a minute." : "Sign in to jump into your channels."}</div>

        {formError && <div className="top-alert">⚠ {formError}</div>}
        {formSuccess && !formError && <div className="top-alert success">✓ {formSuccess}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="field">
              <label htmlFor="fullName">
                Full name <span className="req">*</span>
              </label>
              <input
                id="fullName"
                className={`input ${fieldErrors.fullName ? "error" : ""}`}
                placeholder="Maya Chen"
                value={fullName}
                disabled={loading}
                onChange={(event) => {
                  setFullName(event.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
              />
              {fieldErrors.fullName && <div className="hint error">⚠ {fieldErrors.fullName}</div>}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">
              Email {isRegister && <span className="req">*</span>}
            </label>
            <input
              id="email"
              className={`input ${fieldErrors.email ? "error" : ""}`}
              placeholder="you@company.com"
              value={email}
              disabled={loading}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            {fieldErrors.email && <div className="hint error">⚠ {fieldErrors.email}</div>}
          </div>

          <div className="field">
            <label htmlFor="password">
              Password {isRegister && <span className="req">*</span>}
            </label>
            <input
              id="password"
              type="password"
              className={`input ${fieldErrors.password ? "error" : ""}`}
              placeholder={isRegister ? "At least 8 characters" : "••••••••••"}
              value={password}
              disabled={loading}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
            />
            {isRegister && !fieldErrors.password && <div className="hint">Use 8+ characters with a number.</div>}
            {fieldErrors.password && <div className="hint error">⚠ {fieldErrors.password}</div>}
          </div>

          {!isRegister && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, marginTop: -8 }}>
              <button
                type="button"
                className="forgot-link"
                onClick={() => setFormError("Password reset will be connected to the backend.")}
              >
                Forgot password?
              </button>
            </div>
          )}

          {isRegister && (
            <div className="field checkbox-row" style={{ marginBottom: 20 }}>
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                disabled={loading}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <label htmlFor="terms">
                I agree to the <button type="button">Terms</button> and <button type="button">Privacy Policy</button>
              </label>
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary btn-block ${loading || !isFormValid ? "disabled" : ""}`}
            disabled={loading || !isFormValid}
          >
            {loading && <span className="spinner" />}
            {loading ? (isRegister ? "Creating account…" : "Signing in…") : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="divider-line">or continue with</div>
        <div className="oauth-row">
          <button type="button" className="btn oauth-btn">
            <span className="oauth-ic google">G</span>
            Continue with Google
          </button>
          <button type="button" className="btn oauth-btn">
            <span className="oauth-ic slack">#</span>
            Continue with Slack
          </button>
        </div>

        <div className="auth-switch">
          {isRegister ? (
            <>
              Already have an account? <button onClick={() => switchMode("login")}>Log in</button>
            </>
          ) : (
            <>
              Need an account? <button onClick={() => switchMode("register")}>Sign up</button>
            </>
          )}
        </div>
      </div>

      <div className="auth-illustration">
        <div className="illus-hero">
          <h3>{isRegister ? <>One place for the whole team to talk.</> : <>Pick up right where you left off.</>}</h3>
          <p>
            {isRegister
              ? "Channels for topics, not endless email threads."
              : "Every channel and message, right where you expect it."}
          </p>
        </div>
        <div className="illus-card">
          <div className="msg-row">
            <div className="msg-avatar" style={{ background: "var(--brand-500)" }}>
              JT
            </div>
            <div className="msg-content">
              <div className="msg-top">
                <span className="msg-name">Jordan Tate</span>
                <span className="msg-time">10:14 AM</span>
              </div>
              <div className="msg-text">Pushed the auth API — ready to wire up whenever.</div>
            </div>
          </div>
          <div className="msg-row">
            <div className="msg-avatar" style={{ background: "var(--brand-400)" }}>
              MC
            </div>
            <div className="msg-content">
              <div className="msg-top">
                <span className="msg-name">Maya Chen</span>
                <span className="msg-time">10:16 AM</span>
              </div>
              <div className="msg-text">Nice — pulling it into the login screen now.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
