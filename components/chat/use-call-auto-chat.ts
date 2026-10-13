import { useEffect, useRef } from "react";

export type AutoChatConfig = {
  enabled: boolean;
  minIntervalSec: number;
  maxIntervalSec: number;
  maxRounds: number;
};

export function useCallAutoChat({
  enabled,
  callState,
  onAutoChat,
}: {
  enabled: boolean;
  callState: string;
  onAutoChat: () => void;
}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const roundsCountRef = useRef(0);
  const onAutoChatRef = useRef(onAutoChat);

  useEffect(() => {
    onAutoChatRef.current = onAutoChat;
  }, [onAutoChat]);

  const scheduleNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!enabled || callState !== "IDLE") return;

    // 随机 15 - 35 秒间隔，模拟真实对话停顿
    const delayMs = (Math.floor(Math.random() * 20) + 15) * 1000;

    timerRef.current = setTimeout(() => {
      if (callState === "IDLE") {
        roundsCountRef.current += 1;
        onAutoChatRef.current?.();
      }
    }, delayMs);
  };

  useEffect(() => {
    if (enabled && callState === "IDLE") {
      scheduleNext();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, callState]);

  const resetRounds = () => {
    roundsCountRef.current = 0;
    scheduleNext();
  };

  return {
    roundsCount: roundsCountRef.current,
    resetRounds,
  };
}
