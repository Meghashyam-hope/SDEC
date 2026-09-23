import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import './Login.css';
import './Admin.css';

let idSeq = 1;
function genId() {
  return 'id' + idSeq++ + '-' + Math.random().toString(36).slice(2, 6);
}

function emptyPosition() {
  return { localId: genId(), title: '', candidates: [emptyCandidate()] };
}
function emptyCandidate() {
  return { localId: genId(), name: '', manifesto: '' };
}

export default function Admin() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('sdec_admin_token'));

  useEffect(() => {
    if (adminToken) localStorage.setItem('sdec_admin_token', adminToken);
    else localStorage.removeItem('sdec_admin_token');
  }, [adminToken]);

  if (!adminToken) return <AdminLogin onLogin={setAdminToken} />;
  return <AdminPanel token={adminToken} onSignOut={() => setAdminToken(null)} />;
}

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.adminLogin(username, password);
      onLogin(res.token);
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sdec-admin-login-page">
      <form className="sdec-admin-login-card" onSubmit={handleSubmit}>
        <div className="sdec-admin-login-eyebrow">SDEC Admin</div>
        <div className="sdec-admin-login-title">Election Management</div>
        <div className="sdec-field">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div className="sdec-field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="sdec-login-error">{error}</div>}
        <button className="sdec-btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function AdminPanel({ token, onSignOut }) {
  const [tab, setTab] = useState('create');

  return (
    <div className="sdec-admin-page">
      <div className="sdec-admin-card">
        <div className="sdec-admin-header">
          <div>
            <div className="sdec-admin-eyebrow">SDEC Admin</div>
            <div className="sdec-admin-title">Election Management</div>
          </div>
          <div className="sdec-admin-tabs">
            <div
              className={`sdec-admin-tab ${tab === 'create' ? 'active' : ''}`}
              onClick={() => setTab('create')}
            >
              Create Election
            </div>
            <div
              className={`sdec-admin-tab ${tab === 'turnout' ? 'active' : ''}`}
              onClick={() => setTab('turnout')}
            >
              Turnout Summary
            </div>
            <div className="sdec-admin-tab sdec-admin-signout" onClick={onSignOut}>
              Sign out
            </div>
          </div>
        </div>

        {tab === 'create' ? <CreateElectionTab token={token} /> : <TurnoutTab token={token} />}
      </div>
    </div>
  );
}

function CreateElectionTab({ token }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [positions, setPositions] = useState([emptyPosition()]);
  const [justCreated, setJustCreated] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updatePosition(posId, field, value) {
    setPositions((ps) => ps.map((p) => (p.localId === posId ? { ...p, [field]: value } : p)));
  }
  function removePosition(posId) {
    setPositions((ps) => ps.filter((p) => p.localId !== posId));
  }
  function addPosition() {
    setPositions((ps) => [...ps, emptyPosition()]);
  }
  function addCandidate(posId) {
    setPositions((ps) =>
      ps.map((p) => (p.localId === posId ? { ...p, candidates: [...p.candidates, emptyCandidate()] } : p))
    );
  }
  function updateCandidate(posId, candId, field, value) {
    setPositions((ps) =>
      ps.map((p) =>
        p.localId !== posId
          ? p
          : { ...p, candidates: p.candidates.map((c) => (c.localId === candId ? { ...c, [field]: value } : c)) }
      )
    );
  }
  function removeCandidate(posId, candId) {
    setPositions((ps) =>
      ps.map((p) =>
        p.localId !== posId ? p : { ...p, candidates: p.candidates.filter((c) => c.localId !== candId) }
      )
    );
  }

  async function handleSubmit() {
    setError('');
    if (!title || !startTime || !endTime) {
      setError('Title, opens, and closes are all required.');
      return;
    }
    if (positions.some((p) => !p.title || p.candidates.some((c) => !c.name))) {
      setError('Every position needs a title, and every candidate needs a name.');
      return;
    }

    setSubmitting(true);
    try {
      await api.adminCreateElection(
        {
          title,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          positions: positions.map((p) => ({
            title: p.title,
            candidates: p.candidates.map((c) => ({ name: c.name, manifesto: c.manifesto })),
          })),
        },
        token
      );
      setJustCreated(true);
      setTimeout(() => setJustCreated(false), 3000);
      setTitle('');
      setStartTime('');
      setEndTime('');
      setPositions([emptyPosition()]);
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sdec-admin-body">
      {justCreated && (
        <div className="sdec-admin-banner">
          Election created — it will appear to students once its opening time arrives.
        </div>
      )}
      {error && <div className="sdec-login-error">{error}</div>}

      <div className="sdec-admin-form-grid">
        <div className="sdec-admin-field">
          <div className="sdec-admin-field-label">Election Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Student Council Elections 2027"
            className="sdec-admin-input"
          />
        </div>
        <div className="sdec-admin-field">
          <div className="sdec-admin-field-label">Opens</div>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="sdec-admin-input"
          />
        </div>
        <div className="sdec-admin-field">
          <div className="sdec-admin-field-label">Closes</div>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="sdec-admin-input"
          />
        </div>
      </div>

      <div className="sdec-admin-section-row">
        <div className="sdec-admin-section-title">Positions</div>
        <div className="sdec-admin-link" onClick={addPosition}>
          + Add position
        </div>
      </div>

      <div className="sdec-admin-positions">
        {positions.map((pos) => (
          <div key={pos.localId} className="sdec-admin-position-card">
            <div className="sdec-admin-position-row">
              <input
                value={pos.title}
                onChange={(e) => updatePosition(pos.localId, 'title', e.target.value)}
                placeholder="Position title"
                className="sdec-admin-input sdec-admin-input-bold"
              />
              <div className="sdec-admin-remove" onClick={() => removePosition(pos.localId)}>
                Remove
              </div>
            </div>
            <div className="sdec-admin-candidates">
              {pos.candidates.map((cand) => (
                <div key={cand.localId} className="sdec-admin-candidate-row">
                  <input
                    value={cand.name}
                    onChange={(e) => updateCandidate(pos.localId, cand.localId, 'name', e.target.value)}
                    placeholder="Candidate name"
                    className="sdec-admin-input sdec-admin-candidate-name"
                  />
                  <input
                    value={cand.manifesto}
                    onChange={(e) => updateCandidate(pos.localId, cand.localId, 'manifesto', e.target.value)}
                    placeholder="One-line manifesto"
                    className="sdec-admin-input sdec-admin-candidate-manifesto"
                  />
                  <div
                    className="sdec-admin-remove-x"
                    onClick={() => removeCandidate(pos.localId, cand.localId)}
                  >
                    ✕
                  </div>
                </div>
              ))}
              <div className="sdec-admin-link" onClick={() => addCandidate(pos.localId)}>
                + Add candidate
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sdec-admin-submit-row">
        <div className="sdec-admin-submit-btn" onClick={submitting ? undefined : handleSubmit}>
          {submitting ? 'Creating…' : 'Create Election'}
        </div>
      </div>
    </div>
  );
}

function TurnoutTab({ token }) {
  const [elections, setElections] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [turnout, setTurnout] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminElections(token)
      .then((list) => {
        setElections(list);
        if (list.length > 0) setSelectedId(String(list[0].id));
      })
      .catch((err) => setError(err.data?.message || err.message));
  }, [token]);

  useEffect(() => {
    if (!selectedId) return;
    api
      .adminTurnout(selectedId, token)
      .then(setTurnout)
      .catch((err) => setError(err.data?.message || err.message));
  }, [selectedId, token]);

  const selectedElection = elections.find((e) => String(e.id) === selectedId);

  async function handleClose() {
    if (!selectedId) return;
    try {
      await api.adminCloseElection(selectedId, token);
      const list = await api.adminElections(token);
      setElections(list);
    } catch (err) {
      setError(err.data?.message || err.message);
    }
  }

  if (error) return <div className="sdec-admin-body">{error}</div>;
  if (elections.length === 0) return <div className="sdec-admin-body">No elections created yet.</div>;

  return (
    <div className="sdec-admin-body">
      <div className="sdec-admin-turnout-picker-row">
        <select
          className="sdec-admin-input sdec-admin-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {elections.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({e.status})
            </option>
          ))}
        </select>
        {selectedElection && selectedElection.status !== 'closed' && (
          <div className="sdec-admin-remove" onClick={handleClose}>
            Close this election
          </div>
        )}
      </div>

      {turnout && (
        <>
          <div className="sdec-admin-stats-grid">
            <div className="sdec-admin-stat-card">
              <div className="sdec-admin-stat-label">Registered Voters</div>
              <div className="sdec-admin-stat-value">{turnout.registeredVoters.toLocaleString()}</div>
            </div>
            <div className="sdec-admin-stat-card">
              <div className="sdec-admin-stat-label">Votes Cast</div>
              <div className="sdec-admin-stat-value">{turnout.votesCast.toLocaleString()}</div>
            </div>
            <div className="sdec-admin-stat-card sdec-admin-stat-card-teal">
              <div className="sdec-admin-stat-label">Turnout</div>
              <div className="sdec-admin-stat-value">{turnout.turnoutPct}%</div>
            </div>
          </div>

          <div className="sdec-admin-section-title" style={{ marginBottom: 12 }}>
            Turnout by Department
          </div>
          <div className="sdec-admin-departments">
            {turnout.departments.map((d) => (
              <div key={d.name}>
                <div className="sdec-admin-dept-row">
                  <div className="sdec-admin-dept-name">{d.name}</div>
                  <div className="sdec-admin-dept-label">
                    {d.cast} / {d.total} · {d.pct}%
                  </div>
                </div>
                <div className="sdec-admin-dept-track">
                  <div className="sdec-admin-dept-fill" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
