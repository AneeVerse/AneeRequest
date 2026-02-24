import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Vercel Cron calls this endpoint on schedule to prevent Supabase free-tier pause.
// A simple, lightweight SELECT keeps the database connection alive.
export async function GET(request: Request) {
    // Verify the request is from Vercel Cron (not a random visitor)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createServiceClient();

        // Minimal query — just check the DB is alive
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (error) throw error;

        return NextResponse.json({
            ok: true,
            timestamp: new Date().toISOString(),
            message: 'Database is alive'
        });
    } catch (error: any) {
        console.error('Keep-alive cron failed:', error.message);
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}
