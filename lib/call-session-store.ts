export type ActiveCall = {
  sessionId: string;
  characterId: string;
  kind: "voice" | "video" | "group";
  initiator?: "user" | "character";
  initiatorName?: string;
  minimized: boolean;
};

let activeCall: ActiveCall | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function startCall(
  sessionId: string,
  characterId: string,
  kind: "voice" | "video" | "group" = "voice",
  initiator: "user" | "character" = "user",
  initiatorName?: string
) {
  activeCall = {
    sessionId,
    characterId,
    kind,
    initiator,
    initiatorName,
    minimized: false,
  };
  emitChange();
}

export function minimizeCall() {
  if (activeCall && !activeCall.minimized) {
    activeCall = { ...activeCall, minimized: true };
    emitChange();
  }
}

export function restoreCall() {
  if (activeCall && activeCall.minimized) {
    activeCall = { ...activeCall, minimized: false };
    emitChange();
  }
}

export function endCall() {
  if (activeCall) {
    const prev = activeCall;
    activeCall = null;
    emitChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chat-call-ended", {
          detail: { sessionId: prev.sessionId },
        })
      );
    }
  }
}

export function subscribeActiveCall(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

// 稳定引用返回，防止无限重渲染（坑9）
export function getActiveCall(): ActiveCall | null {
  return activeCall;
}

export function getActiveCallServerSnapshot(): ActiveCall | null {
  return null;
}

export function hasActiveCall(): boolean {
  return activeCall !== null;
}

export function isCallActiveForSession(sessionId?: string): boolean {
  if (!activeCall || !sessionId) return false;
  return activeCall.sessionId === sessionId;
}
