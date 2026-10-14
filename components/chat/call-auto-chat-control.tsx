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
 * 通话界面里的「自动搭话」调节胶囊按钮 + 面板：
 * 位置：右上角（top: calc(max(14px, env(safe-area-inset-top, 0px)) + 12px)，right: 12px），
 * 无论背景怎么变都清晰可见。
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
        className="call-auto-chat-btn"
        style={{
          position: "absolute",
          top: "calc(max(14px, env(safe-area-inset-top, 0px)) + 12px)",
          right: "12px",
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "999px",
          background: config.enabled ? "rgba(34, 197, 94, 0.35)" : "rgba(0, 0, 0, 0.36)",
          border: config.enabled ? "1px solid rgba(74, 222, 128, 0.6)" : "1px solid rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#fff",
          fontSize: "12px",
          cursor: "pointer",
        }}
        aria-label="自动搭话设置"
        title="自动搭话设置"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: config.enabled ? "#4ade80" : "rgba(255,255,255,0.4)",
            boxShadow: config.enabled ? "0 0 8px #4ade80" : "none",
          }}
        />
        <span>搭话{config.enabled ? "开" : "关"}</span>
      </button>

      {open && (
        <div
          className="call-auto-chat-panel"
          style={{
            position: "absolute",
            top: "calc(max(14px, env(safe-area-inset-top, 0px)) + 52px)",
            right: "12px",
            zIndex: 45,
            background: "rgba(18, 18, 20, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 16,
            padding: 14,
            width: 220,
            color: "#fff",
            fontSize: 13,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>自动搭话设置</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer" }}>
            <span>开启主动开口</span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => saveCallAutoChatConfig({ enabled: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: "#22c55e", cursor: "pointer" }}
            />
          </label>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.7)", marginBottom: 4, fontSize: 12 }}>
              <span>搭话等待间隔</span>
              <span>{config.minIntervalSeconds}s ~ {config.maxIntervalSeconds}s</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={config.minIntervalSeconds}
              onChange={(e) => {
                const val = Number(e.target.value);
                saveCallAutoChatConfig({
                  minIntervalSeconds: val,
                  maxIntervalSeconds: Math.max(val + 10, config.maxIntervalSeconds),
                });
              }}
              style={{ width: "100%", accentColor: "#22c55e", marginBottom: 8 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.7)", marginBottom: 4, fontSize: 12 }}>
              <span>单通上限</span>
              <span>{config.maxRepliesPerCall === 0 ? "不限" : `${config.maxRepliesPerCall} 句`}</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={config.maxRepliesPerCall}
              onChange={(e) => saveCallAutoChatConfig({ maxRepliesPerCall: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "#22c55e" }}
            />
          </div>
        </div>
      )}
    </>
  );
}