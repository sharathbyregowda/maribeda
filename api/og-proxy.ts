/**
 * Vercel Edge Function: Open Graph Metadata Proxy
 * 
 * Fetches OG metadata (title, description, site name) from a given URL.
 * Used by the Rich Link Previews feature to enrich saved URLs.
 * 
 * Endpoint: GET /api/og-proxy?url=<encoded_url>
 */

export const config = {
    runtime: 'edge',
};

interface OGMetadata {
    url: string;
    title: string | null;
    description: string | null;
    siteName: string | null;
}

// Max time to wait for the target URL to respond
const FETCH_TIMEOUT_MS = 5000;

// Parse OG meta tags from HTML
function parseOGTags(html: string): { title: string | null; description: string | null; siteName: string | null } {
    let title: string | null = null;
    let description: string | null = null;
    let siteName: string | null = null;

    // Match og:title
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["'][^>]*\/?>/i);
    if (titleMatch) title = decodeHTMLEntities(titleMatch[1]);

    // Match og:description
    const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["'][^>]*\/?>/i);
    if (descMatch) description = decodeHTMLEntities(descMatch[1]);

    // Match og:site_name
    const siteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:site_name["'][^>]*\/?>/i);
    if (siteMatch) siteName = decodeHTMLEntities(siteMatch[1]);

    // Fallback: use <title> tag if no og:title
    if (!title) {
        const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleTagMatch) title = decodeHTMLEntities(titleTagMatch[1].trim());
    }

    // Fallback: use meta description if no og:description
    if (!description) {
        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)
            || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*\/?>/i);
        if (metaDescMatch) description = decodeHTMLEntities(metaDescMatch[1]);
    }

    return { title, description, siteName };
}

function decodeHTMLEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');
}

export default async function handler(request: Request): Promise<Response> {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24h
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new Response(
            JSON.stringify({ error: 'Missing "url" query parameter' }),
            { status: 400, headers }
        );
    }

    // Validate URL
    try {
        new URL(url);
    } catch {
        return new Response(
            JSON.stringify({ error: 'Invalid URL' }),
            { status: 400, headers }
        );
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                // Pretend to be a social media bot to get OG tags
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                'Accept': 'text/html',
            },
            redirect: 'follow',
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: `Failed to fetch URL: ${response.status}` }),
                { status: 502, headers }
            );
        }

        // Only read first 50KB to avoid loading huge pages
        const reader = response.body?.getReader();
        if (!reader) {
            return new Response(
                JSON.stringify({ error: 'No response body' }),
                { status: 502, headers }
            );
        }

        let html = '';
        const decoder = new TextDecoder();
        const MAX_BYTES = 50 * 1024;
        let bytesRead = 0;

        while (bytesRead < MAX_BYTES) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
            bytesRead += value.length;
        }

        reader.cancel();

        const metadata: OGMetadata = {
            url,
            ...parseOGTags(html),
        };

        return new Response(JSON.stringify(metadata), { status: 200, headers });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: `Fetch failed: ${message}` }),
            { status: 502, headers }
        );
    }
}
