import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import './Results.css';

function formatCountdown(endTime) {
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function Results() {
  const { electionId } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .results(electionId, token)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.data?.message || err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [electionId, token, tick]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, [electionId]);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join', electionId);
    const onUpdate = (payload) => {
      if (String(payload.electionId) === String(electionId)) {
        setTick((n) => n + 1);
      }
    };
    socket.on('vote:updated', onUpdate);
    return () => {
      socket.off('vote:updated', onUpdate);
    };
  }, [electionId]);

  if (error) return <div className="sdec-results-status">{error}</div>;
  if (!data) return <div className="sdec-results-status">Loading results…</div>;

  const isActive = data.election.status === 'active';
  const turnoutPct = data.turnout.total > 0 ? Math.round((data.turnout.voted / data.turnout.total) * 100) : 0;

  return (
    <div className="sdec-results">
      <div className="sdec-results-hero">
        <div className="sdec-results-glow-a" />
        <div className="sdec-results-glow-b" />
        <div className="sdec-results-hero-content">
          <div className="sdec-results-live-row">
            {isActive && <div className="sdec-results-dot" />}
            <div className="sdec-results-live-label">{isActive ? 'LIVE RESULTS' : 'FINAL RESULTS'}</div>
          </div>
          <div className="sdec-results-title">{data.election.title}</div>
          <div className="sdec-results-stats">
            <div>
              <div className="sdec-results-stat-label">Turnout</div>
              <div className="sdec-results-stat-value">
                {data.turnout.voted.toLocaleString()} / {data.turnout.total.toLocaleString()} · {turnoutPct}%
              </div>
            </div>
            {isActive && (
              <div>
                <div className="sdec-results-stat-label">Closes in</div>
                <div className="sdec-results-stat-value">{formatCountdown(data.election.endTime)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sdec-results-body">
        {data.positions.map((pos) => (
          <div key={pos.id} className="sdec-results-position">
            <div className="sdec-results-position-title">{pos.title}</div>
            <div className="sdec-results-candidates">
              {pos.candidates.map((cand) => (
                <div key={cand.id}>
                  <div className="sdec-results-candidate-row">
                    <div className="sdec-results-candidate-name">{cand.name}</div>
                    <div className="sdec-results-candidate-pct">{cand.pct}%</div>
                  </div>
                  <div className="sdec-results-bar-track">
                    <div
                      className="sdec-results-bar-fill"
                      style={{ width: animated ? `${cand.pct}%` : '0%' }}
                    />
                  </div>
                  <div className="sdec-results-candidate-votes">{cand.votes.toLocaleString()} votes</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
