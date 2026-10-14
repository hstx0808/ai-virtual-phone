"use client";

import React, { useSyncExternalStore, useMemo } from "react";
import {
  getActiveCall,
  getActiveCallServerSnapshot,
  subscribeActiveCall,
  endCall,
  minimizeCall,
  restoreCall,
} from "@/lib/call-session-store";
import { loadChatSessions } from "@/lib/chat-storage";
import { loadCharacters } from "@/lib/character-storage";
import { VoiceCallScreen } from "@/components/chat/voice-call-screen";
import { VideoCallScreen } from "@/components/chat/video-call-screen";
import { GroupCallScreen } from "@/components/chat/group-call-screen";

export function CallLayer() {
  const activeCall = useSyncExternalStore(
    subscribeActiveCall,
    getActiveCall,
    getActiveCallServerSnapshot
  );

  const sessions = useMemo(() => {
    if (!activeCall) return [];
    try {
      return loadChatSessions() || [];
    } catch (e) {
      console.warn("[CallLayer] loadChatSessions failed:", e);
      return [];
    }
  }, [activeCall]);

  const characters = useMemo(() => {
    if (!activeCall) return [];
    try {
      return loadCharacters() || [];
    } catch (e) {
      console.warn("[CallLayer] loadCharacters failed:", e);
      return [];
    }
  }, [activeCall]);

  if (!activeCall) return null;

  const currentSession = sessions.find((s) => s.id === activeCall.sessionId);
  if (!currentSession) return null;

  // 单聊处理
  if (activeCall.kind === "voice" || activeCall.kind === "video") {
    const contactCharacter = characters.find((c) => c.id === activeCall.characterId);
    if (!contactCharacter) return null;

    const commonProps = {
      session: currentSession,
      character: contactCharacter,
      minimized: activeCall.minimized,
      onMinimize: minimizeCall,
      onRestore: restoreCall,
      onEnd: endCall,
      onClose: endCall,
      initiator: activeCall.initiator,
      initiatorName: activeCall.initiatorName,
    };

    if (activeCall.kind === "voice") {
      return <VoiceCallScreen {...commonProps} />;
    }
    return <VideoCallScreen {...commonProps} />;
  }

  // 群聊处理
  if (activeCall.kind === "group") {
    const groupCharacterIds = new Set(currentSession.characterIds || []);
    const groupCharacters = characters.filter((c) => groupCharacterIds.has(c.id));
    if (groupCharacters.length === 0) return null;

    const groupProps = {
      type: "voice" as const,
      session: currentSession,
      characters: groupCharacters,
      initiator: activeCall.initiator,
      initiatorName: activeCall.initiatorName,
      onEnd: endCall,
    };

    return (
      <div className="absolute inset-0 z-[100]">
        <GroupCallScreen {...groupProps} />
      </div>
    );
  }

  return null;
}
