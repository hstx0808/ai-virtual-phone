"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function CallMiniWindow({
  name,
  avatar,
  callDuration,
  pendingCount = 0,
  onRestore,
  onHangup,
}: {
  name: string;
  avatar?: string;
  callDuration: string;
  pendingCount?: number;
  onRestore: () => void;
  onHangup: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    setPosition({
      x: Math.max(10, Math.min(window.innerWidth - 130, dragStartRef.current.posX + dx)),
      y: Math.max(10, Math.min(window.innerHeight - 150, dragStartRef.current.posY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    if (!hasMovedRef.current) {
      onRestore();
    }
  };

  if (!mounted) return null;

  const content = (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        touchAction: "none",
      }}
      className="flex flex-col items-center bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl w-28 cursor-pointer select-none text-white transition-shadow"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {pendingCount > 0 && (
        <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border border-white/40">
          待发 {pendingCount}
        </div>
      )}
      <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5 border border-white/30 bg-slate-800 flex items-center justify-center">
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <span className="text-sm font-bold">{name.slice(0, 1)}</span>
        )}
      </div>
      <div className="text-xs font-semibold truncate w-full text-center px-1">{name}</div>
      <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{callDuration}</div>
      <button
        type="button"
        className="mt-2 text-[10px] bg-red-500/80 hover:bg-red-600 active:scale-95 text-white px-3 py-1 rounded-full shadow"
        onClick={(e) => {
          e.stopPropagation();
          onHangup();
        }}
      >
        挂断
      </button>
    </div>
  );

  return createPortal(content, document.body);
}
