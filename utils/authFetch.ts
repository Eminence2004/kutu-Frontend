import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants/constants';

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = await AsyncStorage.getItem('userToken');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // Token expired — try to refresh
  if (response.status === 401) {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) return response;

    const refreshRes = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      await AsyncStorage.setItem('userToken', data.access);
      token = data.access;

      // Retry original request with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      // Refresh also expired — force logout
      await AsyncStorage.clear();
      return response;
    }
  }

  return response;
}