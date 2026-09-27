# Fish Audio 语音合成接入完整教程（含踩坑记录）

> 适用场景：将 Fish Audio TTS 接入基于 Next.js 的 AI 虚拟手机项目
> 最后更新：2026-09-27
> 对接人：小坊（工坊驻场工程师）

---

## ⚠️ 核心结论（先看这里）

**Fish Audio API 不支持浏览器直接调用（无 CORS 响应头）**，必须通过**服务端代理路由**转发请求。

---

## 一、准备工作

### 需要准备的 3 样东西

| 需要 | 怎么获得 | 例子 |
|------|----------|------|
| API Key | 注册 https://platform.fish.audio → 右上角头像 → API Keys → 创建 | `sk-fish-xxxxxxxxx` |
| 音色 ID（reference_id） | 平台 → 点击某个音色 → 详情里的 ID（长字符串）；自己克隆的音色也有 ID | `inti-2d4a5527a7e44d8bb63519ca804f1a08` |
| 模型名 | 免费：`s2.1-pro-free`；付费：`s2.1-pro` | `s2.1-pro-free` |

> ⚠️ 免费额度：`s2.1-pro-free` 有每日免费调用额度；付费模型按用量扣钱（API credit）。

---

## 二、Fish Audio 官方接口规范（必读）

### 最重要的一条（踩坑血泪，必看）

**`model` 参数必须放在 HTTP 请求头（Header）里，不能放在 JSON body 里！**

- 放 body → 服务器不认，回退到付费模型 → 报 `402 Insufficient API credit`（提示 API credit 不足，但这其实和你的余额没关系，只是用错了模型）
- 放 Header → 正确识别免费模型 → 成功

同理，`reference_id`（音色 ID）放在 body 里是没问题的。

### 标准请求格式

```
POST https://api.fish.audio/v1/tts
Headers:
  Authorization: Bearer <你的API Key>
  Content-Type: application/json
  model: s2.1-pro-free            ← ⭐ 模型在这，Header！
Body(JSON):
  {
    "text": "要合成的文字",
    "reference_id": "音色ID",
    "format": "mp3"               ← mp3 / wav / pcm / flac
  }
响应：HTTP 200，body 就是音频二进制
```

---

## 三、本项目接入步骤

### 步骤 1：创建服务端代理路由

**文件路径：** `app/api/voice/fish-audio/route.ts`

```typescript
import { NextResponse } from "next/server";
import { proxyFetch } from "@/lib/proxy-fetch";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_FISH_BASE_URL = "https://api.fish.audio/v1";

function normalizeBaseUrl(value: unknown): string {
    const raw = typeof value === "string" && value.trim() ? value.trim() : DEFAULT_FISH_BASE_URL;
    return raw.replace(/\/$/, "");
}

export async function POST(request: Request) {
    try {
        return await handleTts(request);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: "tts_failed", message: message.slice(0, 500) }, { status: 502 });
    }
}

async function handleTts(request: Request) {
    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const baseUrl = normalizeBaseUrl(body.baseUrl);
    const text = typeof body.text === "string" ? body.text : "";
    const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : "s2.1-pro-free";
    const referenceId = typeof body.reference_id === "string" ? body.reference_id : "";
    const format = typeof body.format === "string" ? body.format : "mp3";

    if (!apiKey) {
        return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
    }
    if (!text) {
        return NextResponse.json({ error: "missing_text" }, { status: 400 });
    }

    // ⭐ 关键：model 必须放 Header，不是 Body！
    const response = await proxyFetch(`${baseUrl}/tts`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "model": model,  // ← 必须在 Header 里！
        },
        body: JSON.stringify({
            text,
            ...(referenceId ? { reference_id: referenceId } : {}),
            format,
        }),
    });

    // 如果成功，直接返回音频流
    if (response.ok) {
        const contentType = response.headers.get("content-type") || "audio/mpeg";
        const contentLength = response.headers.get("content-length");
        
        const headers = new Headers();
        headers.set("Content-Type", contentType);
        if (contentLength) {
            headers.set("Content-Length", contentLength);
        }
        
        return new NextResponse(response.body, { status: 200, headers });
    }

    // 失败时返回错误信息
    const errText = await response.text().catch(() => "");
    let errMessage = `HTTP ${response.status}`;
    try {
        const errJson = JSON.parse(errText);
        errMessage = errJson.detail || errJson.message || errText;
    } catch {
        errMessage = errText || errMessage;
    }
    
    return NextResponse.json(
        { error: "tts_failed", message: errMessage.slice(0, 500) },
        { status: response.status }
    );
}
```

---

### 步骤 2：修改语音合成服务

**文件路径：** `lib/tts-service.ts`

在现有的 `synthesizeMinimax` 和 `synthesizeOpenAI` 函数之后，添加 Fish Audio 的处理逻辑：

```typescript
// ── Fish Audio TTS ──────────────────────────────────
// 走服务端代理，避免浏览器直接请求 Fish Audio API 时的 CORS 拦截问题。

async function synthesizeFish(text: string, config: VoiceApiConfig): Promise<Blob | null> {
    if (!config.apiKey) throw new Error("Fish Audio API Key 未配置");

    const baseUrl = (config.baseUrl || "https://api.fish.audio/v1").replace(/\/$/, "");
    
    // 通过 Next.js 服务端代理转发，避免 CORS 问题
    const response = await fetch("/api/voice/fish-audio", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            apiKey: config.apiKey,
            baseUrl,
            text,
            model: config.model || "s2.1-pro-free",
            reference_id: config.defaultVoice || "",
            format: "mp3",
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Fish Audio TTS 请求失败 (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const blob = await response.blob();
    return new Blob([await blob.arrayBuffer()], { type: contentType });
}
```

然后在 `synthesizeSpeech` 函数中添加 Fish Audio 的分支：

```typescript
export async function synthesizeSpeech(
    text: string,
    voiceConfig: VoiceApiConfig,
    options?: { emotion?: string },
): Promise<Blob | null> {
    if (!text.trim()) return null;

    const provider = voiceConfig.provider;

    if (provider === "Minimax") {
        return synthesizeMinimax(text, voiceConfig, options?.emotion);
    }

    if (provider === "OpenAI") {
        return synthesizeOpenAI(text, voiceConfig);
    }

    // ⭐ 新增 Fish Audio 支持
    if (provider === "FishAudio" || provider === "Fish") {
        return synthesizeFish(text, voiceConfig);
    }

    return null;
}
```

---

### 步骤 3：修改语音设置界面

**文件路径：** `components/settings/voice-settings.tsx`

#### 3.1 添加 Fish Audio 到支持的提供商列表

```typescript
// 原来的代码：
const SUPPORTED_VOICE_PROVIDERS = new Set(["Minimax", "OpenAI"]);

// 修改为：
const SUPPORTED_VOICE_PROVIDERS = new Set(["Minimax", "OpenAI", "FishAudio"]);
```

#### 3.2 添加提供商选项

```typescript
// 原来的代码：
const VOICE_PROVIDER_OPTIONS = [
    { value: "OpenAI", label: "OpenAI TTS" },
    { value: "MinimaxCN", label: "Minimax 语音国内版" },
    { value: "MinimaxGlobal", label: "Minimax 语音海外版" },
];

// 修改为：
const VOICE_PROVIDER_OPTIONS = [
    { value: "OpenAI", label: "OpenAI TTS" },
    { value: "MinimaxCN", label: "Minimax 语音国内版" },
    { value: "MinimaxGlobal", label: "Minimax 语音海外版" },
    { value: "FishAudio", label: "Fish Audio" },
];
```

#### 3.3 添加 Fish Audio 默认音色

```typescript
// 添加到 DEFAULT_OPENAI_VOICES 后面：
const DEFAULT_FISH_AUDIO_VOICES = [
    { id: "inti-2d4a5527a7e44d8bb63519ca804f1a08", name: "默认音色 (inti-2d4a5527a7e44d8bb63519ca804f1a08)" },
];
```

#### 3.4 修改 defaultVoiceOptions 函数

```typescript
// 原来的代码：
function defaultVoiceOptions(provider: string): VoiceOption[] {
    return provider === "OpenAI" ? DEFAULT_OPENAI_VOICES : DEFAULT_MINIMAX_VOICES;
}

// 修改为：
function defaultVoiceOptions(provider: string): VoiceOption[] {
    if (provider === "OpenAI") return DEFAULT_OPENAI_VOICES;
    if (provider === "FishAudio") return DEFAULT_FISH_AUDIO_VOICES;
    return DEFAULT_MINIMAX_VOICES;
}
```

#### 3.5 修改 providerSelectValue 函数

```typescript
// 原来的代码：
function providerSelectValue(config: VoiceApiConfig): string {
    if (config.provider === "OpenAI") return "OpenAI";
    return config.baseUrl === GLOBAL_MINIMAX_BASE_URL ? "MinimaxGlobal" : "MinimaxCN";
}

// 修改为：
function providerSelectValue(config: VoiceApiConfig): string {
    if (config.provider === "OpenAI") return "OpenAI";
    if (config.provider === "FishAudio") return "FishAudio";
    return config.baseUrl === GLOBAL_MINIMAX_BASE_URL ? "MinimaxGlobal" : "MinimaxCN";
}
```

#### 3.6 修改 updateProvider 函数

```typescript
// 在 OpenAI 分支后面添加 Fish Audio 分支：
if (providerOption === "FishAudio") {
    updateConfig(id, {
        provider: "FishAudio",
        baseUrl: "https://api.fish.audio/v1",
        model: "s2.1-pro-free",
        defaultVoice: "inti-2d4a5527a7e44d8bb63519ca804f1a08",
    });
    setManualModelIds(prev => ({ ...prev, [id]: false }));
    setManualVoiceIds(prev => ({ ...prev, [id]: true }));
    return;
}
```

#### 3.7 修改 fetchVoices 函数

```typescript
// 在 OpenAI 分支后面添加 Fish Audio 分支：
} else if (config.provider === "FishAudio") {
    setFetchedVoices(prev => ({ ...prev, [config.id]: DEFAULT_FISH_AUDIO_VOICES }));
}
```

#### 3.8 修改 UI 渲染逻辑

将 OpenAI 相关的设置项扩展为同时支持 Fish Audio：

```tsx
{(config.provider === "OpenAI" || config.provider === "FishAudio") && (
    <>
        <div className="flex flex-col gap-1">
            <label className="menu-desc ml-1">接口地址 (Base URL)</label>
            <Input
                type="text"
                value={config.baseUrl || ""}
                onChange={(e) => updateConfig(config.id, { baseUrl: e.target.value })}
                placeholder={config.provider === "OpenAI" ? "https://api.openai.com/v1" : "https://api.fish.audio/v1"}
            />
        </div>
        <div className="flex flex-col gap-1">
            <label className="menu-desc ml-1">语音模型 (TTS Model)</label>
            {manualModelIds[config.id] ? (
                // ... 手动输入模式
            ) : (
                <select
                    value={config.provider === "OpenAI"
                        ? (config.model === "tts-1" || config.model === "tts-1-hd" ? config.model : "__manual__")
                        : (config.model === "s2.1-pro-free" || config.model === "s2.1-pro" ? config.model : "__manual__")
                    }
                    onChange={(e) => {
                        if (e.target.value === "__manual__") {
                            setManualModelIds(prev => ({ ...prev, [config.id]: true }));
                            return;
                        }
                        updateConfig(config.id, { model: e.target.value });
                    }}
                    className="ui-select"
                >
                    {config.provider === "OpenAI" ? (
                        <>
                            <option value="tts-1">tts-1</option>
                            <option value="tts-1-hd">tts-1-hd</option>
                        </>
                    ) : (
                        <>
                            <option value="s2.1-pro-free">s2.1-pro-free</option>
                            <option value="s2.1-pro">s2.1-pro</option>
                        </>
                    )}
                    <option value="__manual__">手动输入...</option>
                </select>
            )}
        </div>
        {/* STT Model 只对 OpenAI 显示 */}
        {config.provider === "OpenAI" && (
            <div className="flex flex-col gap-1">
                <label className="menu-desc ml-1">识别模型 (STT Model)</label>
                <Input
                    type="text"
                    value={config.sttModel || ""}
                    onChange={(e) => updateConfig(config.id, { sttModel: e.target.value })}
                    placeholder="whisper-1（留空使用默认）"
                />
            </div>
        )}
    </>
)}
```

---

## 四、部署说明

### 关键点

1. **数据安全性**：聊天记录、角色卡、所有设置数据都保存在浏览器本地（IndexedDB），重新部署不会丢失。

2. **部署流程**：
   - 代码提交到 GitHub 后，Netlify/Vercel 会自动触发构建部署
   - 如果未自动部署，可在平台后台手动触发（Trigger Deploy）
   - 部署完成后，浏览器硬刷新（Ctrl+Shift+R）加载新版本

3. **测试验证**：
   - 进入 设置 → 语音设置 (Voice API)
   - 新增语音方案，选择 "Fish Audio"
   - 填写 API Key 和音色 ID
   - 点击播放按钮测试

---

## 五、常见问题排查

| 现象 | 原因 | 解决 |
|------|------|------|
| `Failed to fetch` | 浏览器直接请求 Fish Audio API，被 CORS 拦截 | 必须使用服务端代理路由，不能直连 |
| `402 Insufficient API credit` | `model` 参数放进了 Body 而不是 Header | 确保 `model` 在请求头中 |
| `401 Unauthorized` | API Key 错误或缺少 `Bearer` | 检查 Key 和 `Authorization: Bearer sk-...` |
| `404` | 端点错误 | Fish Audio 端点是 `/v1/tts`，不是 `/openai/v1/audio/speech` |
| 拿到的文件是 JSON 文本不是音频 | 请求失败返回了错误 JSON | 检查请求的 Header/Body 格式 |

---

## 六、附：Fish Audio 官方通用教程（参考）

> 原文见：[FISH-AUDIO-接入教程.md](./FISH-AUDIO-接入教程.md)

Fish Audio 官方提供了完整的接入文档，包括各语言示例代码、错误排查、OpenAI 兼容代理等。本项目接入时已参考该文档，特别遵循了 **"model 参数放 Header"** 的核心要求。

---

## 七、变更记录

| 日期 | 变更内容 | 备注 |
|------|----------|------|
| 2026-09-27 | 初始版本 | 完成 Fish Audio TTS 接入，解决 CORS 问题 |

---

*本文档由小坊编写，供后续 AI 参考使用。*
