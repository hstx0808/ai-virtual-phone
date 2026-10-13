import { kvGet, kvSet } from "@/lib/kv-db";

const CALL_AUDIO_INDEX_KEY = "ai_phone_call_audio_index_v1";
const MAX_AUDIO_ITEMS = 400;
const MAX_AUDIO_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

type CallAudioEntry = {
  ref: string;
  createdAt: number;
};

export async function persistCallAudio(blob: Blob, meta?: Record<string, any>): Promise<string> {
  const ref = `media-store://call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  if (typeof window !== "undefined") {
    try {
      // 简单将音频转为 dataUrl 存入 indexedDB 或 kv
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const dataUrl = await dataUrlPromise;
      await kvSet(ref, dataUrl);

      // 维护索引与30天清理
      const index = (await kvGet<CallAudioEntry[]>(CALL_AUDIO_INDEX_KEY)) || [];
      const now = Date.now();
      index.push({ ref, createdAt: now });

      const filtered = index.filter(item => now - item.createdAt < MAX_AUDIO_AGE_MS).slice(-MAX_AUDIO_ITEMS);
      await kvSet(CALL_AUDIO_INDEX_KEY, filtered);
    } catch (e) {
      console.warn("[CallAudioStorage] persist error:", e);
    }
  }

  return ref;
}

export async function releaseCallAudioRef(ref: string): Promise<void> {
  if (typeof window !== "undefined" && ref.startsWith("media-store://")) {
    try {
      await kvSet(ref, null);
    } catch (_) {}
  }
}
