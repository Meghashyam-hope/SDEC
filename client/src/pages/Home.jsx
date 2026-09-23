import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const STATUS_STYLE = {
  active: { className: 'active', label: 'ACTIVE' },
  upcoming: { className: 'upcoming', label: 'UPCOMING' },
  closed: { className: 'closed', label: 'CLOSED' },
};

function formatCountdown(endTime) {
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return 'Closing soon';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `Closes in ${days}d ${hours}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `Closes in ${hours}h ${mins}m`;
}

export default function Home() {
  const { student, token, logout } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .activeElections(token)
      .then(setElections)
      .catch((err) => setError(err.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function openElection(e) {
    navigate(e.alreadyVoted ? `/results/${e.id}` : `/ballot/${e.id}`);
  }

  return (
    <div className="sdec-home">
      <div className="sdec-home-header">
        <div className="sdec-home-eyebrow">SDEC · {student?.department || 'Student Council'}</div>
        <div className="sdec-home-greeting">Hi, {student?.name}</div>
        <div className="sdec-home-roll">Roll No. {student?.rollNumber}</div>
        <div
          className="sdec-home-logout"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Sign out
        </div>
      </div>

      <div className="sdec-home-body">
        <div className="sdec-home-section-title">Elections</div>
        {loading && <div className="sdec-home-empty">Loading elections…</div>}
        {error && <div className="sdec-home-empty">{error}</div>}
        {!loading && !error && elections.length === 0 && (
          <div className="sdec-home-empty">No active elections right now.</div>
        )}
        {elections.map((e) => {
          const st = STATUS_STYLE[e.status] || STATUS_STYLE.active;
          return (
            <div key={e.id} className="sdec-election-card" onClick={() => openElection(e)}>
              <div className="sdec-election-card-top">
                <div className="sdec-election-title">{e.title}</div>
                <div className={`sdec-badge sdec-badge-${st.className}`}>{st.label}</div>
              </div>
              <div className="sdec-election-meta">
                {e.alreadyVoted ? 'You voted · Live results available' : formatCountdown(e.endTime)}
              </div>
              <div className="sdec-election-cta">
                {e.alreadyVoted ? 'View live results →' : 'Vote now →'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
