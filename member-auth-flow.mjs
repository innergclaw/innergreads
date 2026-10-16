export const ACCOUNT_PATH = "/account/";
export const DASHBOARD_PATH = "/dashboard/";
// Only this fixed destination is accepted. Never redirect to a URL supplied in a query.
export const readsDestination = (search = "") => {
  const params = new URLSearchParams(search);
  const slug = params.get("read") || "";
  return /^[a-z0-9-]{1,80}$/.test(slug) ? `/reads/?read=${encodeURIComponent(slug)}#reading-room` : "/reads/";
};

export const accountDestination = (search = "") =>
  new URLSearchParams(search).get("from") === "reads" ? readsDestination(search) : DASHBOARD_PATH;

export const isRecoveryCallback = (hash = "") => {
  const params = new URLSearchParams(String(hash).replace(/^#/, ""));
  return params.get("type") === "recovery";
};

export const shouldOpenDashboard = ({ session, recovery = false, path = ACCOUNT_PATH } = {}) =>
  Boolean(session?.user && !recovery && path === ACCOUNT_PATH);

export const shouldReturnToAccount = ({ session, path = DASHBOARD_PATH } = {}) =>
  Boolean(!session?.user && path === DASHBOARD_PATH);

// New passwords must match Supabase Auth hardening (shared pool): 10+ characters with letters and digits.
// Sign-in is not checked here so existing members with older passwords can still sign in.
export const NEW_PASSWORD_RULE = "Use at least 10 characters, including letters and numbers.";
export const newPasswordProblem = (password = "") => {
  const value = String(password);
  if (value.length < 10 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return NEW_PASSWORD_RULE;
  return "";
};
