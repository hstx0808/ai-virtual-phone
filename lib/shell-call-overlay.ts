export function subscribeShellOverlayEvents(
  listener: (event: { action: string; [key: string]: any }) => void
) {
  if (typeof window === "undefined") return () => {};

  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && typeof detail === "object") {
      listener(detail);
    }
  };

  window.addEventListener("shell-call-overlay", handler);
  return () => {
    window.removeEventListener("shell-call-overlay", handler);
  };
}

export function startCallOverlay(
  name: string,
  avatar: string,
  meta: string,
  callId: string,
  elapsedSeconds: number
): boolean {
  if (typeof window !== "undefined" && (window as any).AndroidShell?.startCallOverlay) {
    try {
      return (window as any).AndroidShell.startCallOverlay(
        name,
        avatar,
        meta,
        callId,
        elapsedSeconds
      );
    } catch (e) {
      console.warn("[ShellCallOverlay] startCallOverlay error:", e);
    }
  }
  return false;
}

export function updateCallOverlay(
  name: string,
  avatar: string,
  meta: string,
  elapsedSeconds: number
) {
  if (typeof window !== "undefined" && (window as any).AndroidShell?.updateCallOverlay) {
    try {
      (window as any).AndroidShell.updateCallOverlay(name, avatar, meta, elapsedSeconds);
    } catch (e) {
      console.warn("[ShellCallOverlay] updateCallOverlay error:", e);
    }
  }
}

export function stopCallOverlay() {
  if (typeof window !== "undefined" && (window as any).AndroidShell?.stopCallOverlay) {
    try {
      (window as any).AndroidShell.stopCallOverlay();
    } catch (e) {
      console.warn("[ShellCallOverlay] stopCallOverlay error:", e);
    }
  }
}

export function canDrawOverlay(): boolean {
  if (typeof window !== "undefined" && (window as any).AndroidShell?.canDrawOverlay) {
    try {
      return (window as any).AndroidShell.canDrawOverlay();
    } catch (e) {
      return false;
    }
  }
  return false;
}

export function requestOverlayPermission() {
  if (typeof window !== "undefined" && (window as any).AndroidShell?.requestOverlayPermission) {
    try {
      (window as any).AndroidShell.requestOverlayPermission();
    } catch (e) {}
  }
}

export function readShellOverlayDebugInfo(): string {
  if (typeof window !== "undefined" && (window as any).AndroidShell?.getOverlayDebugInfo) {
    try {
      return (window as any).AndroidShell.getOverlayDebugInfo();
    } catch (e) {
      return String(e);
    }
  }
  return "";
}
