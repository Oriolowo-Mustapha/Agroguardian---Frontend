import { create } from 'zustand';

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const loadStoredUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  return safeJsonParse(raw);
};

const persistUser = (user) => {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
};

const useAuthStore = create((set) => ({
  user: loadStoredUser(),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),

  setAuth: (user, accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    else localStorage.removeItem('accessToken');

    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');

    persistUser(user ?? null);

    set({
      user: user ?? null,
      accessToken: accessToken ?? null,
      refreshToken: refreshToken ?? null,
      isAuthenticated: !!accessToken,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  setUser: (user) => {
    persistUser(user ?? null);
    set({ user: user ?? null });
  },

  updateUser: (data) =>
    set((state) => {
      const nextUser = { ...(state.user || {}), ...(data || {}) };
      persistUser(nextUser);
      return { user: nextUser };
    }),
}));

export default useAuthStore;
