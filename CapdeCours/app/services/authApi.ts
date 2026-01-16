import { storeData, getData } from '@/utils/asyncStorage';

// const API_URL = 'https://capdecours.tuanemtramtinh.io.vn';
const API_URL = 'https://3f2c16f8bfb4.ngrok-free.app';
const TOKEN_KEY = 'AUTH_TOKEN';
const USERNAME_KEY = 'AUTH_USERNAME';

export interface LoginResponse {
  access_token: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = (await res.json()) as LoginResponse;
    await storeData(TOKEN_KEY, data.access_token);
    await storeData(USERNAME_KEY, username);
    return data;
  },

  register: async (name: string, username: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  getToken: async (): Promise<string | null> => {
    const token = await getData(TOKEN_KEY);
    return token ?? null;
  },

  getUsername: async (): Promise<string | null> => {
    const username = await getData(USERNAME_KEY);
    return username ?? null;
  },

  logout: async () => {
    await storeData(TOKEN_KEY, '');
    await storeData(USERNAME_KEY, '');
  },

  updateUser: async (username: string, name?: string, password?: string): Promise<void> => {
    const token = await getData(TOKEN_KEY);
    if (!token) {
      throw new Error('Not authenticated');
    }

    const body: { name?: string; password?: string } = {};
    if (name) body.name = name;
    if (password) body.password = password;

    const res = await fetch(`${API_URL}/user/${username}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update user');
    }
  },
};
