export type PlayerSession = {
  id: string;
  display_name: string;
  login_name: string | null;
  is_admin: boolean;
};

const sessionKey = "golfCampPlayerSession";

export function getPlayerSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(sessionKey);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as PlayerSession;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function setPlayerSession(session: PlayerSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearPlayerSession() {
  window.localStorage.removeItem(sessionKey);
}
