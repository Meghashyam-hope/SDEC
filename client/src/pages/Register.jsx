import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const initialForm = {
  rollNumber: '',
  name: '',
  phoneNumber: '',
  department: '',
  year: '',
  password: '',
  confirmPassword: '',
};

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState('details');
  const [form, setForm] = useState(initialForm);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({
        rollNumber: form.rollNumber,
        name: form.name,
        phoneNumber: form.phoneNumber,
        password: form.password,
        department: form.department || undefined,
        year: form.year ? Number(form.year) : undefined,
      });
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
      const res = await api.verifyRegisterOtp(form.rollNumber, otp);
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
      <div className="sdec-login-content">
        <div className="sdec-login-brand">
          <div className="sdec-login-logo">S</div>
          <div className="sdec-login-brand-text">
            <div className="sdec-login-title">SDEC</div>
            <div className="sdec-login-subtitle">Student Digital Election Commission</div>
          </div>
        </div>

        <div className="sdec-login-card">
          {step === 'details' ? (
            <form onSubmit={handleRegister}>
              <div className="sdec-login-card-title">Create your voter account</div>
              <div className="sdec-field">
                <label>Roll Number</label>
                <input
                  value={form.rollNumber}
                  onChange={(e) => update('rollNumber', e.target.value)}
                  placeholder="e.g. 2473A05132"
                  autoFocus
                />
              </div>
              <div className="sdec-field">
                <label>Full Name</label>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your full name" />
              </div>
              <div className="sdec-field">
                <label>Mobile Number</label>
                <input
                  value={form.phoneNumber}
                  onChange={(e) => update('phoneNumber', e.target.value)}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div className="sdec-field">
                <label>Department</label>
                <input
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="sdec-field">
                <label>Year</label>
                <input
                  value={form.year}
                  onChange={(e) => update('year', e.target.value)}
                  placeholder="e.g. 3"
                  inputMode="numeric"
                />
              </div>
              <div className="sdec-field">
                <label>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="sdec-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error && <div className="sdec-login-error">{error}</div>}
              <button className="sdec-btn-primary" type="submit" disabled={loading}>
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
              <div className="sdec-login-back">
                Already registered?{' '}
                <Link to="/login" style={{ color: 'var(--sdec-teal)', fontWeight: 600 }}>
                  Sign in
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="sdec-login-card-title">Verify your mobile number</div>
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
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>
              <div
                className="sdec-login-back"
                onClick={() => {
                  setStep('details');
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
