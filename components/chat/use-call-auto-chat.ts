import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { kvGet, kvSet } from "@/lib/kv-db";

// ── 自动搭话全局配置（可跨会话持久化，通话界面随时开关）────────
export const CALL_AUTO_CHAT_KEY = "ai_phone_call_auto_chat_v1";

export type CallAutoChatConfig = {
  enabled: boolean;
  minIntervalSec: number; // 随机间隔下限
  maxIntervalSec: number; // 随机间隔上限
  maxRounds: number;     // 0 = 不限
};

const DEFAULT_CONFIG: CallAutoChatConfig = {
  enabled: true,
  minIntervalSec: 15,
  maxIntervalSec: 35,
  maxRounds: 0,
};

let _cache: CallAutoChatConfig | null = null;
const listeners = new Set<() => void>();

export function loadCallAutoChatConfig(): CallAutoChatConfig {
  if (_cache) return _cache;
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = kvGet(CALL_AUTO_CHAT_KEY);
    _cache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    _cache = { ...DEFAULT_CONFIG };
  }
  return _cache;
}

export function saveCallAutoChatConfig(patch: Partial<CallAutoChatConfig>): CallAutoChatConfig {
  const next = { ...loadCallAutoChatConfig(), ...patch };
  _cache = next;
  if (typeof window !== "undefined") {
    kvSet(CALL_AUTO_CHAT_KEY, JSON.stringify(next));
  }
  for (const listener of listeners) listener();
  return next;
}

export function subscribeCallAutoChatConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCallAutoChatConfigSnapshot(): CallAutoChatConfig {
  return loadCallAutoChatConfig();
}

export function getCallAutoChatConfigServerSnapshot(): CallAutoChatConfig {
  return DEFAULT_CONFIG;
}

/**
 * 通话里的自动搭话运行时：角色空闲时按随机间隔主动开口（模拟真人忽快忽慢）。
 * 用户一开口/角色一轮说完，等待计数重置。
 * 配置可实时读取（开关、间隔、条数上限），无需重启通话。
 */
export function useCallAutoChat({
  callState,
  onAutoChat,
}: {
  callState: string;
  onAutoChat: () => void;
}) {
  const config = useSyncExternalStore(
    subscribeCallAutoChatConfig,
    getCallAutoChatConfigSnapshot,
    getCallAutoChatConfigServerSnapshot,
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundsCountRef = useRef(0);
  const onAutoChatRef = useRef(onAutoChat);
  const backoffRef = useRef(1); // 空转退避倍率：角色这轮没说出内容就翻倍，最多 4 倍

  useEffect(() => {
    onAutoChatRef.current = onAutoChat;
  }, [onAutoChat]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();
    const cfg = loadCallAutoChatConfig();
    if (!cfg.enabled || callState !== "IDLE") return;
    if (cfg.maxRounds > 0 && roundsCountRef.current >= cfg.maxRounds) return;

    const range = Math.max(1, cfg.maxIntervalSec - cfg.minIntervalSec);
    const baseMs = (cfg.minIntervalSec + Math.floor(Math.random() * (range + 1))) * 1000;
    const delayMs = baseMs * backoffRef.current;

    timerRef.current = setTimeout(() => {
      roundsCountRef.current += 1;
      onAutoChatRef.current?.();
    }, delayMs);
  }, [callState, clearTimer]);

  useEffect(() => {
    if (callState === "IDLE") {
      scheduleNext();
    } else {
      // 用户/角色一开口，清空退避倍数重算
      backoffRef.current = 1;
      clearTimer();
    }
    return () => clearTimer();
  }, [callState, scheduleNext, clearTimer]);

  const resetRounds = useCallback(() => {
    roundsCountRef.current = 0;
    backoffRef.current = 1;
    scheduleNext();
  }, [scheduleNext]);

  return {
    config,
    resetRounds,
  };
}
