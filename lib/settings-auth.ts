/** /settings and /api/settings/* are restricted to a single allowlisted Google account, on top of the app's normal SSO gate. */
export function isSettingsAllowed(email: string | null | undefined): boolean {
  const allowed = process.env.SETTINGS_ALLOWED_EMAIL;
  if (!allowed || !email) return false;
  return email.toLowerCase() === allowed.toLowerCase();
}
