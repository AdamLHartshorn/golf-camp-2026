export type PlayerSession = {
  id: string;
  display_name: string;
  login_name: string | null;
  is_admin: boolean;
};

const sessionKey = "golfCampPlayerSession";
const sessionEventName = "golfCampPlayerSessionChange";

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
  window.dispatchEvent(new Event(sessionEventName));
}

export function clearPlayerSession() {
  window.localStorage.removeItem(sessionKey);
  window.dispatchEvent(new Event(sessionEventName));
}

export function subscribeToPlayerSession(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(sessionEventName, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(sessionEventName, callback);
    window.removeEventListener("storage", callback);
  };
}
