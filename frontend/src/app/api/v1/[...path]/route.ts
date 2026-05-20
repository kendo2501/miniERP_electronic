import { NextRequest, NextResponse } from "next/server";

// BACKEND_URL: runtime env var (set in Railway frontend service)
// Fallback to NEXT_PUBLIC_API_URL if it was baked in at build time
function resolveBackend(): string {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  return url?.startsWith("http") ? url : "http://localhost:3001";
}

const BACKEND = resolveBackend();

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${BACKEND}/api/v1/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  // Remove accept-encoding so backend returns uncompressed responses.
  // The proxy passes res.body as a raw stream; if the backend compresses it
  // the browser would receive binary data it can't parse.
  headers.delete("accept-encoding");

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error Node fetch supports duplex
      duplex: "half",
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete("content-encoding");

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[proxy] Cannot reach backend at ${target}:`, err);
    return NextResponse.json(
      { message: "Backend service unavailable", hint: "Ensure BACKEND_URL is set in Railway frontend env vars" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
