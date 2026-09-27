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

    // 构建请求，model 必须放 Header（Fish Audio 的要求）
    const response = await proxyFetch(`${baseUrl}/tts`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "model": model,
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
