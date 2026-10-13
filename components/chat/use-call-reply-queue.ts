import { useState, useEffect, useRef } from "react";

export function useCallReplyQueue(
  callState: string,
  onSendMessage: (text: string) => Promise<boolean | void>
) {
  const [queue, setQueue] = useState<string[]>([]);
  const isProcessingRef = useRef(false);

  const enqueue = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (queue.length >= 5) {
      return false; // 队列上限5条
    }
    setQueue((prev) => [...prev, trimmed]);
    return true;
  };

  useEffect(() => {
    if (callState === "IDLE" && queue.length > 0 && !isProcessingRef.current) {
      const nextMessage = queue[0];
      isProcessingRef.current = true;
      setQueue((prev) => prev.slice(1));

      Promise.resolve(onSendMessage(nextMessage)).finally(() => {
        isProcessingRef.current = false;
      });
    }
  }, [callState, queue, onSendMessage]);

  const clearQueue = () => {
    setQueue([]);
    isProcessingRef.current = false;
  };

  return {
    queue,
    pendingCount: queue.length,
    enqueue,
    clearQueue,
  };
}
