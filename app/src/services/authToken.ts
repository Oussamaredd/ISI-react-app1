export const ACCESS_TOKEN_STORAGE_KEY = 'ecotrack_access_token';

export const getAccessToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const setAccessToken = (token: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
};

export const clearAccessToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const withAuthHeader = (headers?: HeadersInit) => {
  const resolved = new Headers(headers ?? {});
  const token = getAccessToken();

  if (token && !resolved.has('Authorization')) {
    resolved.set('Authorization', `Bearer ${token}`);
  }

  return resolved;
};
