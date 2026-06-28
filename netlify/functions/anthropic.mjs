// netlify/functions/anthropic.mjs
// Anthropic API への中継（プロキシ）。APIキーはこのサーバ側（Netlify 環境変数）にのみ存在し、
// ブラウザには一切渡りません。利用は Google ログイン済み（任意で許可メールに限定）のユーザーのみ。
// 応答はストリーミングで返し、長い読み取りでも途中のタイムアウト（社内プロキシ等）を回避します。
//
// 環境変数:
//   ANTHROPIC_API_KEY  … 必須。Anthropic の APIキー（sk-ant-...）。
//   ALLOWED_EMAILS     … 推奨。利用を許可するメールをカンマ区切り。未設定だとログインした任意の人が使える。
//   FIREBASE_API_KEY   … 任意。未設定なら下のフォールバック（公開鍵）を使用。

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyA--kIIC4s5uEW4aUhh4TSFGSpSEfV9vLo"; // 公開鍵（コミット可）
const ALLOWED = (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const MODEL_DEFAULT = "claude-sonnet-4-6";

export default async (req) => {
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return j({ error: "サーバ未設定: ANTHROPIC_API_KEY を Netlify の環境変数に登録してください。" }, 500);

  // --- Firebase ログインの検証 ---
  const authH = req.headers.get("authorization") || "";
  const idToken = authH.startsWith("Bearer ") ? authH.slice(7).trim() : "";
  if (!idToken) return j({ error: "ログインが必要です。" }, 401);

  let email = "";
  try {
    const vr = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const vd = await vr.json();
    if (!vr.ok || !vd.users || !vd.users[0]) return j({ error: "認証に失敗しました。再度ログインしてください。" }, 401);
    email = String(vd.users[0].email || "").toLowerCase();
  } catch (e) {
    return j({ error: "認証エラー" }, 401);
  }
  if (ALLOWED.length && !ALLOWED.includes(email)) {
    return j({ error: "このアカウントは利用を許可されていません。" }, 403);
  }

  // --- Anthropic へ中継（ストリーミング）---
  let body;
  try { body = await req.json(); } catch (_) { return j({ error: "invalid body" }, 400); }
  const payload = {
    model: typeof body.model === "string" ? body.model : MODEL_DEFAULT,
    max_tokens: Number(body.max_tokens) || 1024,
    messages: Array.isArray(body.messages) ? body.messages : [],
    stream: true,
  };
  if (body.system) payload.system = body.system;

  let ar;
  try {
    ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return j({ error: "Anthropic への接続に失敗しました。" }, 502);
  }

  if (!ar.ok) {
    const t = await ar.text();
    return new Response(t, { status: ar.status, headers: { "content-type": "application/json" } });
  }
  // 成功時は SSE ストリームをそのまま流す（データが流れ続けるのでタイムアウトしにくい）
  return new Response(ar.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
};

function j(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}    return j({ error: "認証エラー" }, 401);
  }
  if (ALLOWED.length && !ALLOWED.includes(email)) {
    return j({ error: "このアカウントは利用を許可されていません。" }, 403);
  }

  // --- Anthropic へ中継 ---
  let body;
  try { body = await req.json(); } catch (_) { return j({ error: "invalid body" }, 400); }
  const payload = {
    model: typeof body.model === "string" ? body.model : MODEL_DEFAULT,
    max_tokens: Number(body.max_tokens) || 1024,
    messages: Array.isArray(body.messages) ? body.messages : [],
  };
  if (body.system) payload.system = body.system;

  let ar;
  try {
    ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return j({ error: "Anthropic への接続に失敗しました。" }, 502);
  }
  const text = await ar.text();
  return new Response(text, { status: ar.status, headers: { "content-type": "application/json" } });
};

function j(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
