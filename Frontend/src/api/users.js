import { getAuthHeaders, API_URL } from './api';

export async function findUserByEmail(email) {
  const res = await fetch(`${API_URL}/api/find-user?email=${encodeURIComponent(email)}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}
