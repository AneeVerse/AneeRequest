import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: "No URL provided" }, { status: 400 });
        }

        const fetchAsBase64 = async (targetUrl: string) => {
            const res = await fetch(targetUrl);
            if (!res.ok) return null;
            const contentType = res.headers.get('content-type') || 'image/png';
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return `data:${contentType};base64,${base64}`;
        };

        // 1. Check if it's a direct image URL
        const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
        if (isImage) {
            const dataUri = await fetchAsBase64(url);
            if (dataUri) return NextResponse.json({ imageUrl: dataUri });
        }

        // 2. Try Clearbit
        try {
            const domain = new URL(url).hostname;
            const logoUrl = `https://logo.clearbit.com/${domain}`;
            const dataUri = await fetchAsBase64(logoUrl);
            if (dataUri) return NextResponse.json({ imageUrl: dataUri });
        } catch (e) {
            console.error('Clearbit fetch error:', e);
        }

        // 3. Fallback: Google Favicon API
        try {
            const domain = new URL(url).hostname;
            const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            const dataUri = await fetchAsBase64(googleFaviconUrl);
            if (dataUri) return NextResponse.json({ imageUrl: dataUri });
        } catch (e) {
            console.error('Google favicon error:', e);
        }

        return NextResponse.json({ error: "Could not find a logo for this URL" }, { status: 404 });

    } catch (error: any) {
        console.error('Fetch Logo API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
