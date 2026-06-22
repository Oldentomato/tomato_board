const MOCK_SESSION_KEY = "tomato_board_mock_session";

export function setMockSession() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(MOCK_SESSION_KEY, "1");
  }
}

export function clearMockSession() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(MOCK_SESSION_KEY);
  }
}

export function hasMockSession() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(MOCK_SESSION_KEY) === "1";
}
