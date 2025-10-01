import { getAuthHeaders, API_URL } from './user';

export async function findUserByEmail(email) {
  const res = await fetch(`${API_URL}/api/find-user?email=${encodeURIComponent(email)}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}
