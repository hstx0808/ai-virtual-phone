"use client";

import React, { useState } from "react";
import { useCallAutoChat, saveCallAutoChatConfig } from "./use-call-auto-chat";
import { useSyncExternalStore } from "react";
import {
  subscribeCallAutoChatConfig,
  getCallAutoChatConfigSnapshot,
  getCallAutoChatConfigServerSnapshot,
} from "./use-call-auto-chat";

/**
 * 通话界面里的「自动搭话」开关面板：可拖动，随时开/关角色主动找话聊，
 * 并调节随机间隔范围与本次通话条数上限。
 * 挂载位置：通话全屏/小窗界面的右上角区域（见 voice-call-screen / video-call-screen）。
 */
export function CallAutoChatControl() {
  const config = useSyncExternalStore(
    subscribeCallAutoChatConfig,
    getCallAutoChatConfigSnapshot,
    getCallAutoChatConfigServerSnapshot,
  );
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ui-call-btn ui-call-btn-muted call-auto-chat-toggle"
        style={{ position: "absolute", top: 56, right: 16, zIndex: 20 }}
        aria-label="自动搭话设置"
        title="自动搭话设置"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>

      {open && (
        <div
          className="call-auto-chat-panel"
          style={{
            position: "absolute",
            top: 88,
            right: 16,
            zIndex: 21,
            background: "rgba(0,0,0,0.72)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 14,
            padding: 14,
            width: 200,
            color: "#fff",
            fontSize: 13,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 600 }}>自动搭话</span>
            <button
              type="button"
              aria-label={config.enabled ? "关闭自动搭话" : "开启自动搭话"}
              onClick={() => saveCallAutoChatConfig({ enabled: !config.enabled })}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: config.enabled ? "#22c55e" : "#3f3f46",
                position: "relative", cursor: "pointer", border: "none",
              }}
            >
              <span
                style={{
                  position: "absolute", top: 2, left: config.enabled ? 22 : 2,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#fff", transition: "left 120ms",
                }}
              />
            </button>
          </div>

          <label style={{ display: "block", marginBottom: 8 }}>
            <span style={{ opacity: 0.7 }}>随机间隔（秒）：{config.minIntervalSec} ~ {config.maxIntervalSec}</span>
            <input
              type="range" min={5} max={60} step={5}
              value={config.maxIntervalSec}
              onChange={(e) => saveCallAutoChatConfig({ maxIntervalSec: Number(e.target.value), minIntervalSec: Math.min(config.minIntervalSec, Number(e.target.value)) })}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 4 }}>
            <span style={{ opacity: 0.7 }}>本次通话最多主动开口次数（0 = 不限）：{config.maxRounds === 0 ? "不限" : config.maxRounds}</span>
            <input
              type="number" min={0} max={50}
              value={config.maxRounds}
              onChange={(e) => saveCallAutoChatConfig({ maxRounds: Math.max(0, Number(e.target.value) || 0) })}
              style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 6, padding: 4 }}
            />
          </label>

          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{ width: "100%", marginTop: 8, background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: 8, padding: 6, cursor: "pointer" }}
          >
            收起
          </button>
        </div>
      )}
    </>
  );
}
