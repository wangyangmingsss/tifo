const API = '/api';

export async function fetchStats() {
  const res = await fetch(`${API}/stats`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchMapState() {
  const res = await fetch(`${API}/map/state`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${API}/leaderboard`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchFaction(id: number) {
  const res = await fetch(`${API}/faction/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchRegionHistory(id: number) {
  const res = await fetch(`${API}/region/${id}/history`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchHealthz() {
  try {
    const res = await fetch(`${API}/healthz`);
    return res.ok;
  } catch {
    return false;
  }
}
