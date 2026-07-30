/** /settings and /api/settings/* are restricted to an allowlisted set of Google accounts, on top of the app's normal SSO gate. */
export function isSettingsAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.SETTINGS_ALLOWED_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
