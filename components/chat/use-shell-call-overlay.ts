import { useEffect, useRef } from "react";
import {
  subscribeShellOverlayEvents,
  startCallOverlay,
  updateCallOverlay,
  stopCallOverlay,
} from "@/lib/shell-call-overlay";

export function useShellCallOverlay({
  name,
  avatar,
  sessionId,
  getDurationSeconds,
  onHangup,
  onRestore,
  onReply,
}: {
  name: string;
  avatar: string;
  sessionId: string;
  getDurationSeconds: () => number;
  onHangup: () => void;
  onRestore: () => void;
  onReply: (text: string) => void;
}) {
  const hangupRef = useRef(onHangup);
  const restoreRef = useRef(onRestore);
  const replyRef = useRef(onReply);

  useEffect(() => {
    hangupRef.current = onHangup;
    restoreRef.current = onRestore;
    replyRef.current = onReply;
  }, [onHangup, onRestore, onReply]);

  useEffect(() => {
    const elapsed = getDurationSeconds();
    startCallOverlay(name, avatar, "通话中", sessionId, elapsed);

    const unsub = subscribeShellOverlayEvents((event) => {
      if (event.action === "hangup") {
        hangupRef.current?.();
      } else if (event.action === "restore") {
        restoreRef.current?.();
      } else if (event.action === "reply" && typeof event.text === "string") {
        replyRef.current?.(event.text);
      }
    });

    return () => {
      unsub();
      stopCallOverlay();
    };
  }, [name, avatar, sessionId]);
}
