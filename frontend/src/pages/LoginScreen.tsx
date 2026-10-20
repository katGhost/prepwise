import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import "./LoginScreen.css";

const journey = [
  { number: "01", title: "Outage",  description: "Water or power goes down",    icon: "ti-bolt"         },
  { number: "02", title: "Report",  description: "Record what happened",         icon: "ti-clipboard"    },
  { number: "03", title: "Action",  description: "Turn reports into action",     icon: "ti-arrow-up-right" },
  { number: "04", title: "Impact",  description: "Measure what changes",         icon: "ti-chart-bar"    },
];

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setError(error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-layout">

        {/* LEFT HERO (desktop only) */}
        <section className="login-hero">
          <a className="brand" href="/" aria-label="prepWise home">
            <span>prep</span>
            <span className="brand-green">Wise</span>
            <span className="brand-dot" />
          </a>

          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" />
              HOUSEHOLD RESILIENCE PLATFORM
            </div>

            <h1>
              When services stop,
              <br />
              <span>your voice</span> shouldn't.
            </h1>

            <p className="hero-description">
              Water cuts. Power outages. Real household costs.
              Track disruptions, take action, and see the impact
              your community can make.
            </p>

            <div className="journey">
              {journey.map((step, index) => (
                <div className="journey-step" key={step.number}>
                  <div className="journey-marker">
                    <span className="journey-number">{step.number}</span>
                    {index < journey.length - 1 && <span className="journey-line" />}
                  </div>
                  <div className="journey-content">
                    <div className="journey-heading">
                      <i className={`ti ${step.icon} journey-icon`} aria-hidden="true" />
                      <h3>{step.title}</h3>
                    </div>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-footer">
            <span className="footer-mark">●</span>
            Built for households. Driven by accountability.
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="login-panel">
          <div className="login-card">

            {/* mobile-only brand */}
            <a className="mobile-brand brand" href="/" aria-label="prepWise home">
              <span>prep</span>
              <span className="brand-green">Wise</span>
              <span className="brand-dot" />
            </a>

            <div className="login-icon" aria-hidden="true">
              <i className="ti ti-shield-check" />
            </div>

            <div className="login-heading">
              <p className="form-eyebrow">YOUR HOUSEHOLD, CONNECTED</p>
              <h2>Welcome back.</h2>
              <p>
                Sign in to see your household's disruption impact and pick up where you left off.
              </p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <label htmlFor="email">Email address</label>
              <div className="input-wrap">
                <i className="ti ti-mail" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.co.za"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <i className="ti ti-lock" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} aria-hidden="true" />
                </button>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <i className="ti ti-alert-circle" aria-hidden="true" />
                  {error}
                </div>
              )}

              <button className="login-submit" type="submit" disabled={loading}>
                <span>{loading ? "Signing you in…" : "Sign in to prepWise"}</span>
                {!loading && <i className="ti ti-arrow-right" aria-hidden="true" />}
              </button>
            </form>

            <div className="login-divider">
              <span />
              <span>YOUR IMPACT MATTERS</span>
              <span />
            </div>

            <p className="privacy-note">
              <i className="ti ti-shield-check" aria-hidden="true" />
              Your household. Your data. Your community.
            </p>
          </div>

          <footer className="panel-footer">
            <span>prepWise © {new Date().getFullYear()}</span>
            <span>Made for a more accountable South Africa.</span>
          </footer>
        </section>

      </div>
    </main>
  );
}