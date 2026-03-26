import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Called from AuthContext on sign-in to update last_login timestamps
 * in the team_members and clients tables (replacing the expensive
 * supabase.auth.admin.listUsers() call).
 */
export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });
        }

        const supabase = createServiceClient();
        const now = new Date().toISOString();

        // Update last_login in both tables — fire and forget style
        await Promise.all([
            supabase
                .from('team_members')
                .update({ last_login: now })
                .ilike('email', email),
            supabase
                .from('clients')
                .update({ last_login: now })
                .ilike('email', email),
        ]);

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Error updating login timestamp:', err);
        return NextResponse.json({ ok: true }); // Don't block login on failure
    }
}
