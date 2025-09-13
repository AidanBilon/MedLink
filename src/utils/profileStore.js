// Simple localStorage-backed profile store keyed by Auth0 user sub
// Shape: { firstName, lastName, phone, email, updatedAt }

const KEY_PREFIX = 'profile:';

export function loadProfile(sub) {
  if (!sub) return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + sub);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveProfile(sub, profile) {
  if (!sub) return;
  const payload = { ...profile, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY_PREFIX + sub, JSON.stringify(payload));
  return payload;
}

export function clearProfile(sub) {
  if (!sub) return;
  localStorage.removeItem(KEY_PREFIX + sub);
}
