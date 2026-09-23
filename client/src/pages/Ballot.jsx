import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import './Ballot.css';

export default function Ballot() {
  const { electionId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selections, setSelections] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .ballot(electionId, token)
      .then((data) => {
        setElection(data.election);
        setPositions(data.positions);
      })
      .catch((err) => {
        if (err.data?.alreadyVoted) navigate(`/results/${electionId}`, { replace: true });
        else setError(err.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  }, [electionId, token, navigate]);

  const selectedCount = Object.keys(selections).length;
  const allSelected = positions.length > 0 && selectedCount === positions.length;

  function selectCandidate(positionId, candidateId) {
    setSelections((s) => ({ ...s, [positionId]: candidateId }));
  }

  const confirmRows = useMemo(
    () =>
      positions.map((p) => {
        const candId = selections[p.id];
        const cand = p.candidates.find((c) => c.id === candId);
        return { positionTitle: p.title, candidateName: cand ? cand.name : '—' };
      }),
    [positions, selections]
  );

  async function handleConfirmSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const selectionsPayload = Object.entries(selections).map(([positionId, candidateId]) => ({
        positionId: Number(positionId),
        candidateId,
      }));
      const res = await api.submitVote(Number(electionId), selectionsPayload, token);
      navigate('/success', { state: { receiptId: res.receiptId, electionTitle: election?.title } });
    } catch (err) {
      setConfirmOpen(false);
      if (err.status === 409) navigate(`/results/${electionId}`, { replace: true });
      else setError(err.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="sdec-ballot-status">Loading ballot…</div>;
  if (error && positions.length === 0) return <div className="sdec-ballot-status">{error}</div>;

  return (
    <div className="sdec-ballot">
      <div className="sdec-ballot-header">
        <div className="sdec-ballot-title">{election?.title}</div>
        <div className="sdec-ballot-subtitle">Select one candidate per position</div>
      </div>

      <div className="sdec-ballot-body">
        {positions.map((pos) => {
          const isComplete = !!selections[pos.id];
          return (
            <div key={pos.id} className="sdec-position">
              <div className="sdec-position-title-row">
                <div className="sdec-position-title">{pos.title}</div>
                {isComplete && <CheckBadge />}
              </div>
              <div className="sdec-candidate-list">
                {pos.candidates.map((cand) => {
                  const selected = selections[pos.id] === cand.id;
                  return (
                    <div
                      key={cand.id}
                      className={`sdec-candidate-card ${selected ? 'selected' : ''}`}
                      onClick={() => selectCandidate(pos.id, cand.id)}
                    >
                      <Avatar name={cand.name} />
                      <div className="sdec-candidate-info">
                        <div className="sdec-candidate-name">{cand.name}</div>
                        <div className="sdec-candidate-manifesto">{cand.manifesto}</div>
                      </div>
                      <div className={`sdec-radio ${selected ? 'selected' : ''}`}>
                        {selected && <CheckIcon />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sdec-ballot-footer">
        {error && <div className="sdec-ballot-error">{error}</div>}
        <div className="sdec-progress-row">
          <div className="sdec-progress-label">
            {selectedCount} of {positions.length} positions selected
          </div>
          <div className="sdec-progress-track">
            <div
              className="sdec-progress-fill"
              style={{ width: `${positions.length ? (selectedCount / positions.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div
          className={`sdec-submit-btn ${allSelected ? 'enabled' : ''}`}
          onClick={() => allSelected && setConfirmOpen(true)}
        >
          Submit Vote
        </div>
      </div>

      {confirmOpen && (
        <>
          <div className="sdec-sheet-scrim" onClick={() => setConfirmOpen(false)} />
          <div className="sdec-sheet">
            <div className="sdec-sheet-title">Confirm your vote</div>
            <div className="sdec-sheet-warning">
              <WarnIcon />
              <span>This action is final. Votes cannot be changed once submitted.</span>
            </div>
            <div className="sdec-sheet-rows">
              {confirmRows.map((row, i) => (
                <div key={i} className="sdec-sheet-row">
                  <div className="sdec-sheet-row-label">{row.positionTitle}</div>
                  <div className="sdec-sheet-row-value">{row.candidateName}</div>
                </div>
              ))}
            </div>
            <div className="sdec-sheet-actions">
              <div className="sdec-sheet-cancel" onClick={() => setConfirmOpen(false)}>
                Cancel
              </div>
              <div className="sdec-sheet-confirm" onClick={handleConfirmSubmit}>
                {submitting ? 'Submitting…' : 'Confirm & Submit'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CheckBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="var(--sdec-teal)" />
      <path
        d="M6 12.5l4 4 8-8.5"
        stroke="white"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24">
      <path
        d="M4 12.5l5 5 11-11"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
      <path
        d="M12 2L1 21h22L12 2z"
        fill="none"
        stroke="var(--sdec-warn)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="12" y1="9" x2="12" y2="14" stroke="var(--sdec-warn)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17.5" r="1.2" fill="var(--sdec-warn)" />
    </svg>
  );
}
