import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        // Use the Supabase SQL endpoint (available via service role key)
        const sql = `
            ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
            ALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('Ongoing', 'Leads', 'Closed', 'Archive'));
        `;

        // Call the Supabase pg endpoint to execute raw SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ query: sql })
        });

        // If the RPC approach fails, try direct pg approach
        // Supabase exposes a /pg endpoint for service role SQL execution
        const pgResponse = await fetch(`${supabaseUrl}/pg`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ query: sql })
        });

        if (pgResponse.ok) {
            return NextResponse.json({ message: 'Database constraint fixed successfully!' });
        }

        // As a fallback, try creating and calling a temporary function
        const createFnSql = `
            CREATE OR REPLACE FUNCTION fix_clients_status_constraint()
            RETURNS void AS $$
            BEGIN
                ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
                ALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('Ongoing', 'Leads', 'Closed', 'Archive'));
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        // We'll try creating this function via RPC
        return NextResponse.json({
            message: 'Could not auto-fix. Please run this SQL manually in your Supabase SQL Editor:',
            sql: `ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;\nALTER TABLE public.clients ADD CONSTRAINT clients_status_check CHECK (status IN ('Ongoing', 'Leads', 'Closed', 'Archive'));`,
            status: 'manual_required'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
