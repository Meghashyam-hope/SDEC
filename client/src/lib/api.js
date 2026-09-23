const BASE = '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  verifyRegisterOtp: (rollNumber, otp) =>
    request('/auth/register/verify-otp', { method: 'POST', body: { rollNumber, otp } }),
  login: (rollNumber, password) =>
    request('/auth/login', { method: 'POST', body: { rollNumber, password } }),
  verifyOtp: (rollNumber, otp) =>
    request('/auth/verify-otp', { method: 'POST', body: { rollNumber, otp } }),
  activeElections: (token) => request('/elections/active', { token }),
  ballot: (electionId, token) => request(`/elections/${electionId}/ballot`, { token }),
  results: (electionId, token) => request(`/elections/${electionId}/results`, { token }),
  submitVote: (electionId, selections, token) =>
    request('/votes', { method: 'POST', body: { electionId, selections }, token }),
  adminLogin: (username, password) =>
    request('/admin/login', { method: 'POST', body: { username, password } }),
  adminElections: (token) => request('/admin/elections', { token }),
  adminCreateElection: (payload, token) =>
    request('/admin/elections', { method: 'POST', body: payload, token }),
  adminCloseElection: (electionId, token) =>
    request(`/admin/elections/${electionId}/close`, { method: 'POST', token }),
  adminTurnout: (electionId, token) => request(`/admin/elections/${electionId}/turnout`, { token }),
};
