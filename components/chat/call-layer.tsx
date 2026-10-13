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
import { loadSessions } from "@/lib/chat-storage";
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
    return loadSessions();
  }, [activeCall]);

  const characters = useMemo(() => {
    if (!activeCall) return [];
    return loadCharacters();
  }, [activeCall]);

  if (!activeCall) return null;

  const currentSession = sessions.find((s) => s.id === activeCall.sessionId);
  if (!currentSession) return null;

  const contactCharacter = characters.find((c) => c.id === activeCall.characterId);

  const commonProps = {
    session: currentSession,
    character: contactCharacter,
    minimized: activeCall.minimized,
    onMinimize: minimizeCall,
    onRestore: restoreCall,
    onClose: endCall,
    initiator: activeCall.initiator,
    initiatorName: activeCall.initiatorName,
  };

  if (activeCall.kind === "voice") {
    return <VoiceCallScreen {...commonProps} />;
  }

  if (activeCall.kind === "video") {
    return <VideoCallScreen {...commonProps} />;
  }

  if (activeCall.kind === "group") {
    if (activeCall.minimized) {
      return <GroupCallScreen {...commonProps} />;
    }
    return (
      <div className="absolute inset-0 z-[100]">
        <GroupCallScreen {...commonProps} />
      </div>
    );
  }

  return null;
}
