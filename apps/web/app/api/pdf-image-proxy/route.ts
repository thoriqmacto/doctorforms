import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const LOCAL_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1']);
const URL_ENV_KEYS = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_BACKEND_URL',
    'NEXT_PUBLIC_ASSET_BASE_URL',
    'API_URL',
] as const;

function normalizeContentType(value: string | null): string {
    return (value ?? '').split(';', 1)[0].trim().toLowerCase();
}

function extractHostFromEnvUrl(value: string | undefined): string | null {
    if (!value) return null;
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.hostname;
    } catch {
        return null;
    }
}

function buildAllowedHosts(): Set<string> {
    const hosts = new Set(LOCAL_ALLOWED_HOSTS);
    URL_ENV_KEYS.forEach((key) => {
        const envHost = extractHostFromEnvUrl(process.env[key]);
        if (envHost) hosts.add(envHost);
    });
    return hosts;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const rawUrl = request.nextUrl.searchParams.get('url');
    if (!rawUrl) {
        return NextResponse.json({ error: 'Missing url query parameter.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        return NextResponse.json({ error: 'Invalid url query parameter.' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: 'Only http/https URLs are supported.' }, { status: 400 });
    }

    const allowedHosts = buildAllowedHosts();
    if (!allowedHosts.has(parsedUrl.hostname)) {
        return NextResponse.json({ error: 'Host is not allowed.' }, { status: 403 });
    }

    let upstream: Response;
    try {
        upstream = await fetch(parsedUrl.toString(), {
            cache: 'force-cache',
            next: { revalidate: 3600 },
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch upstream image.' }, { status: 502 });
    }

    if (!upstream.ok) {
        return NextResponse.json(
            { error: `Upstream image request failed with status ${upstream.status}.` },
            { status: upstream.status }
        );
    }

    const upstreamType = normalizeContentType(upstream.headers.get('content-type'));
    if (!ALLOWED_IMAGE_TYPES.has(upstreamType)) {
        return NextResponse.json({ error: `Unsupported image type: ${upstreamType || 'unknown'}.` }, { status: 415 });
    }

    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
        status: 200,
        headers: {
            'Content-Type': upstreamType,
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
