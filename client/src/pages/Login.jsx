import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const canvasRef = useRef(null);
  const particlesRef = useRef(null);
  const rafRef = useRef(null);

  const [step, setStep] = useState('credentials');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);

    if (!particlesRef.current) {
      particlesRef.current = Array.from({ length: 36 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.6 + 0.6,
        teal: Math.random() > 0.65,
      }));
    }

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.teal ? 'rgba(90,200,180,0.35)' : 'rgba(255,255,255,0.22)';
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  async function handleSignIn(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(rollNumber, password);
      setDevOtp(res.devOtp || '');
      setStep('otp');
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp(rollNumber, otp);
      login(res.token, res.student);
      navigate('/home');
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sdec-login">
      <canvas ref={canvasRef} className="sdec-login-canvas" />
      <div className="sdec-login-content">
        <div className="sdec-login-brand">
          <div className="sdec-login-logo">S</div>
          <div className="sdec-login-brand-text">
            <div className="sdec-login-title">SDEC</div>
            <div className="sdec-login-subtitle">Student Digital Election Commission</div>
          </div>
        </div>

        <div className="sdec-login-card">
          {step === 'credentials' ? (
            <form onSubmit={handleSignIn}>
              <div className="sdec-login-card-title">Sign in to vote</div>
              <div className="sdec-field">
                <label>Roll Number</label>
                <input
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 2473A05132"
                  autoFocus
                />
              </div>
              <div className="sdec-field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error && <div className="sdec-login-error">{error}</div>}
              <button className="sdec-btn-primary" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <div className="sdec-login-secured">
                <ShieldIcon /> Secured with your institution ID
              </div>
              <div className="sdec-login-back">
                New here?{' '}
                <Link to="/register" style={{ color: 'var(--sdec-teal)', fontWeight: 600 }}>
                  Create an account
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="sdec-login-card-title">Enter the OTP sent to your mobile</div>
              <div className="sdec-field">
                <label>One-Time Passcode</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  autoFocus
                />
              </div>
              {devOtp && (
                <div className="sdec-login-devhint">
                  Dev mode — OTP is <b>{devOtp}</b> (no SMS gateway configured yet)
                </div>
              )}
              {error && <div className="sdec-login-error">{error}</div>}
              <button className="sdec-btn-primary" type="submit" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <div
                className="sdec-login-back"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                }}
              >
                ← Back
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14">
      <path
        d="M6 0L0 2.2v3.5c0 3.6 2.4 6.9 6 8 3.6-1.1 6-4.4 6-8V2.2L6 0z"
        fill="currentColor"
      />
    </svg>
  );
}
