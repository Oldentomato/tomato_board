export const AUTH_RELOGIN_MESSAGE_KEY = "auth_relogin_message";

export function redirectToLogin(message?: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;

  if (message) {
    sessionStorage.setItem(AUTH_RELOGIN_MESSAGE_KEY, message);
  }

  window.location.href = "/login";
}

export function consumeReloginMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(AUTH_RELOGIN_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(AUTH_RELOGIN_MESSAGE_KEY);
  }
  return message;
}

const REAUTH_HINT = "sign in again";

function isReauthRequired(status: number, message: string): boolean {
  if (status === 401) return true;
  return status === 403 && message.toLowerCase().includes(REAUTH_HINT);
}

export function handleAuthFailure(status: number, message: string) {
  if (!isReauthRequired(status, message)) return;

  const displayMessage =
    status === 401 && message.includes("Google token expired")
      ? "Google 연동이 만료되었습니다. 다시 로그인해 주세요."
      : "로그인이 만료되었습니다. 다시 로그인해 주세요.";

  redirectToLogin(displayMessage);
}
