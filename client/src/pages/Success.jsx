import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Success.css';

export default function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const { receiptId, electionTitle } = location.state || {};

  useEffect(() => {
    if (!receiptId) navigate('/home', { replace: true });
  }, [receiptId, navigate]);

  if (!receiptId) return null;

  return (
    <div className="sdec-success">
      <div className="sdec-success-check">
        <svg width="42" height="42" viewBox="0 0 24 24">
          <path
            d="M4 12.5l5 5 11-11"
            stroke="var(--sdec-teal)"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="sdec-success-check-path"
          />
        </svg>
      </div>
      <div>
        <div className="sdec-success-title">Your vote has been recorded</div>
        <div className="sdec-success-subtitle">
          Thank you for taking part in {electionTitle || 'this election'}.
        </div>
      </div>
      <div className="sdec-success-receipt">
        <div className="sdec-success-receipt-label">Confirmation ID</div>
        <div className="sdec-success-receipt-value">{receiptId}</div>
      </div>
      <div className="sdec-success-close">You may now close this window.</div>
      <div className="sdec-success-home" onClick={() => navigate('/home')}>
        Back to Home
      </div>
    </div>
  );
}
