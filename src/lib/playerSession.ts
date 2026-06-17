export type PlayerSession = {
  id: string;
  display_name: string;
  login_name: string | null;
  is_admin: boolean;
};

const sessionKey = "golfCampPlayerSession";
const temporarySessionKey = "golfCampPlayerSessionTemporary";
const sessionEventName = "golfCampPlayerSessionChange";

function parseStoredSession(
  rawSession: string | null,
  storage: Storage,
  key: string,
) {
  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as PlayerSession;

    if (
      session.id === "fallback-admin" ||
      session.login_name === "megaballs"
    ) {
      storage.removeItem(key);
      return null;
    }

    return session;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function getPlayerSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rememberedSession = parseStoredSession(
    window.localStorage.getItem(sessionKey),
    window.localStorage,
    sessionKey,
  );

  if (rememberedSession) {
    return rememberedSession;
  }

  return parseStoredSession(
    window.sessionStorage.getItem(temporarySessionKey),
    window.sessionStorage,
    temporarySessionKey,
  );
}

export function setPlayerSession(
  session: PlayerSession,
  options: { remember?: boolean } = {},
) {
  const shouldRemember = options.remember ?? true;
  const serializedSession = JSON.stringify(session);

  if (shouldRemember) {
    window.localStorage.setItem(sessionKey, serializedSession);
    window.sessionStorage.removeItem(temporarySessionKey);
  } else {
    window.sessionStorage.setItem(temporarySessionKey, serializedSession);
    window.localStorage.removeItem(sessionKey);
  }

  window.dispatchEvent(new Event(sessionEventName));
}

export function clearPlayerSession() {
  window.localStorage.removeItem(sessionKey);
  window.sessionStorage.removeItem(temporarySessionKey);
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
