import { useState } from "react";

import "./App.css";
import {
  AuthError,
  loginUser,
  registerUser,
} from "./services/auth";
import { getSession, saveSession } from "./services/sessionStore";
import HuddleBoard from "./components/HuddleBoard/HuddleBoard";

type Mode = "login" | "register";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(getSession());
  });
  const [mode, setMode] = useState<Mode>("register");
  const [accountCreated, setAccountCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    setAccountCreated(false);
    setShowPassword(false);
    setFullName("");
    setEmail("");
    setPassword("");
    setTermsAccepted(false);
    setFieldErrors({});
    setFormError("");
    setFormSuccess("");
    setLoading(false);
  };

  const handleBack = () => {
    setFormError("");
    setFormSuccess("");
    setFieldErrors({});
    setShowPassword(false);

    if (accountCreated) {
      setAccountCreated(false);
      setMode("register");
      setPassword("");
      return;
    }

    setMode(isRegister ? "login" : "register");
    setFullName("");
    setEmail("");
    setPassword("");
    setTermsAccepted(false);
  };

  const isFormValid = isRegister
    ? fullName.trim().length > 0 &&
      EMAIL_RE.test(email) &&
      PASSWORD_RE.test(password) &&
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
    } else if (isRegister && !PASSWORD_RE.test(password)) {
      errors.password =
        "Use at least 8 characters with at least one letter and one number";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
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
        await registerUser({
          name: fullName.trim(),
          email: email.trim(),
          password,
        });

        setAccountCreated(true);
        setPassword("");
        setFormError("");
        setFormSuccess("");
        setFieldErrors({});
        return;
      }

      const { accessToken, user } = await loginUser({
        email: email.trim(),
        password,
      });

      saveSession({
        accessToken,
        user,
      });

      setIsAuthenticated(true);
    } catch (error) {
      if (isRegister && error instanceof AuthError) {
        if (error.status === 409) {
          setFormError(
            error.message ||
              "An account with this email already exists."
          );
        } else {
          setFormError(
            error.message ||
              "We couldn't create your account. Please check your details and try again."
          );
        }
      } else if (!isRegister && error instanceof AuthError) {
        setFormError(
          "That email and password don't match. Try again or reset your password."
        );
      } else {
        setFormError(
          isRegister
            ? "We couldn't create your account. Please try again."
            : "That email and password don't match. Try again."
        );
      }
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  if (isAuthenticated) {
    return <HuddleBoard />;
  }

  return (
    <div className="auth-screen">
      <div className="auth-form-col">
        {accountCreated ? (
          <div
            style={{
              minHeight: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              position: "relative",
              padding: "40px 20px",
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              style={{
                position: "absolute",
                top: 24,
                left: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 28,
                lineHeight: 1,
                color: "#6f6680",
                padding: "8px",
              }}
            >
              ←
            </button>

            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#e9f8f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 22,
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M5 12.5L9.5 17L19 7"
                  stroke="#18a875"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 style={{ marginBottom: 10, color: "#111827" }}>
              Account created
            </h2>

            <div className="sub" style={{ marginBottom: 28 }}>
              Sign in with your new account to continue.
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setAccountCreated(false);
                setMode("login");
                setShowPassword(false);
                setFormError("");
                setFormSuccess("");
                setFieldErrors({});
              }}
            >
              Go to sign in
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 28,
                lineHeight: 1,
                color: "#6f6680",
                padding: "4px 8px 4px 0",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                width: "fit-content",
              }}
            >
              ←
            </button>

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

            <h2>
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>

            <div className="sub">
              {isRegister
                ? "Takes about a minute."
                : "Sign in to jump into your channels."}
            </div>

            {formError && (
              <div className="top-alert">
                ⚠ {formError}
              </div>
            )}

            {formSuccess && !formError && (
              <div className="top-alert success">
                ✓ {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {isRegister && (
                <div className="field">
                  <label htmlFor="fullName">
                    Full name <span className="req">*</span>
                  </label>

                  <input
                    id="fullName"
                    className={`input ${
                      fieldErrors.fullName ? "error" : ""
                    }`}
                    placeholder="Maya Chen"
                    value={fullName}
                    disabled={loading}
                    onChange={(event) => {
                      setFullName(event.target.value);

                      if (fieldErrors.fullName) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          fullName: undefined,
                        }));
                      }

                      if (formError) {
                        setFormError("");
                      }
                    }}
                  />

                  {fieldErrors.fullName && (
                    <div className="hint error">
                      ⚠ {fieldErrors.fullName}
                    </div>
                  )}
                </div>
              )}

              <div className="field">
                <label htmlFor="email">
                  Email{" "}
                  {isRegister && (
                    <span className="req">*</span>
                  )}
                </label>

                <input
                  id="email"
                  className={`input ${
                    fieldErrors.email ? "error" : ""
                  }`}
                  placeholder="you@company.com"
                  value={email}
                  disabled={loading}
                  onChange={(event) => {
                    setEmail(event.target.value);

                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }

                    if (formError) {
                      setFormError("");
                    }
                  }}
                />

                {fieldErrors.email && (
                  <div className="hint error">
                    ⚠ {fieldErrors.email}
                  </div>
                )}
              </div>

              <div className="field">
                <label htmlFor="password">
                  Password{" "}
                  {isRegister && (
                    <span className="req">*</span>
                  )}
                </label>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                  }}
                >
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`input ${
                      fieldErrors.password ? "error" : ""
                    }`}
                    placeholder={
                      isRegister
                        ? "At least 8 characters"
                        : "••••••••••"
                    }
                    value={password}
                    disabled={loading}
                    style={{ paddingRight: 50 }}
                    onChange={(event) => {
                      setPassword(event.target.value);

                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }

                      if (formError) {
                        setFormError("");
                      }
                    }}
                  />

                  <button
                    type="button"
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() => {
                      setShowPassword(
                        (previous) => !previous
                      );
                    }}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      padding: 4,
                      cursor: loading ? "default" : "pointer",
                      color: "#7b7287",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {showPassword ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M2 12C3.8 7.9 7.3 5.5 12 5.5C16.7 5.5 20.2 7.9 22 12C20.2 16.1 16.7 18.5 12 18.5C7.3 18.5 3.8 16.1 2 12Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M3 3L21 21"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.6 5.7C11.05 5.57 11.52 5.5 12 5.5C16.7 5.5 20.2 7.9 22 12C21.2 13.82 20.05 15.27 18.62 16.32"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6.3 7.05C4.45 8.18 3.03 9.82 2 12C3.8 16.1 7.3 18.5 12 18.5C13.05 18.5 14.04 18.35 14.96 18.06"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {isRegister &&
                  !fieldErrors.password && (
                    <div className="hint">
                      Use 8+ characters with at least one letter and one number.
                    </div>
                  )}

                {fieldErrors.password && (
                  <div className="hint error">
                    ⚠ {fieldErrors.password}
                  </div>
                )}
              </div>

              {!isRegister && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 20,
                    marginTop: -8,
                  }}
                >
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() =>
                      setFormError(
                        "Password reset will be connected to the backend."
                      )
                    }
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {isRegister && (
                <div
                  className="field checkbox-row"
                  style={{ marginBottom: 20 }}
                >
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    disabled={loading}
                    onChange={(event) =>
                      setTermsAccepted(event.target.checked)
                    }
                  />

                  <label htmlFor="terms">
                    I agree to{" "}
                    <button type="button">
                      Terms
                    </button>{" "}
                    and{" "}
                    <button type="button">
                      Privacy Policy
                    </button>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className={`btn btn-primary btn-block ${
                  loading || !isFormValid
                    ? "disabled"
                    : ""
                }`}
                disabled={loading || !isFormValid}
              >
                {loading && <span className="spinner" />}

                {loading
                  ? isRegister
                    ? "Creating account…"
                    : "Signing in…"
                  : isRegister
                  ? "Create account"
                  : "Sign in"}
              </button>
            </form>

            <div className="divider-line">
              or continue with
            </div>

            <div className="oauth-row">
              <button
                type="button"
                className="btn oauth-btn"
              >
                <span className="oauth-ic google">
                  G
                </span>
                Continue with Google
              </button>

              <button
                type="button"
                className="btn oauth-btn"
              >
                <span className="oauth-ic slack">
                  #
                </span>
                Continue with Slack
              </button>
            </div>

            <div className="auth-switch">
              {isRegister ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() =>
                      switchMode("login")
                    }
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Need an account?{" "}
                  <button
                    type="button"
                    onClick={() =>
                      switchMode("register")
                    }
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="auth-illustration">
        <div className="illus-hero">
          <h3>
            {isRegister ? (
              <>One place for the whole team to talk.</>
            ) : (
              <>Pick up right where you left off.</>
            )}
          </h3>

          <p>
            {isRegister
              ? "Channels for topics, not endless email threads."
              : "Every channel and message, right where you expect it."}
          </p>
        </div>

        <div className="illus-card">
          <div className="msg-row">
            <div
              className="msg-avatar"
              style={{
                background: "var(--brand-500)",
              }}
            >
              JT
            </div>

            <div className="msg-content">
              <div className="msg-top">
                <span className="msg-name">
                  Jordan Tate
                </span>

                <span className="msg-time">
                  10:14 AM
                </span>
              </div>

              <div className="msg-text">
                Pushed the auth API — ready to wire up whenever.
              </div>
            </div>
          </div>

          <div className="msg-row">
            <div
              className="msg-avatar"
              style={{
                background: "var(--brand-400)",
              }}
            >
              MC
            </div>

            <div className="msg-content">
              <div className="msg-top">
                <span className="msg-name">
                  Maya Chen
                </span>

                <span className="msg-time">
                  10:16 AM
                </span>
              </div>

              <div className="msg-text">
                Nice — pulling it into the login screen now.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;