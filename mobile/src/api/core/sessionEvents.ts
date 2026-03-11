type SessionListener = () => void;

const sessionInvalidatedListeners = new Set<SessionListener>();

export const emitSessionInvalidated = () => {
  for (const listener of sessionInvalidatedListeners) {
    listener();
  }
};

export const subscribeToSessionInvalidated = (listener: SessionListener) => {
  sessionInvalidatedListeners.add(listener);

  return () => {
    sessionInvalidatedListeners.delete(listener);
  };
};
