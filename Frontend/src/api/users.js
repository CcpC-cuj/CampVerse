import api from './axiosInstance';

export async function findUserByEmail(email) {
  const response = await api.get('/api/find-user', { params: { email } });
  return response.data;
}
