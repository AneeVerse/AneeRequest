import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
    try {
        const supabase = createServiceClient();

        // Step 1: Create a helper function that can run arbitrary SQL
        // This uses the service role which bypasses RLS
        const { error: fnError } = await supabase.rpc('exec_sql', {
            sql_text: 'SELECT 1'
        });

        // If exec_sql doesn't exist, create it first via a workaround
        if (fnError) {
            // Try direct column addition using Supabase's postgrest
            // We'll test if the column exists by trying to query it
            const { error: testError } = await supabase
                .from('requests')
                .select('drive_folder_id')
                .limit(1);

            if (testError && testError.message.includes('drive_folder_id')) {
                // Column doesn't exist - we need to create it
                // Use the Supabase SQL API endpoint
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

                // Try using the Supabase /rest/v1/rpc endpoint with a temporary function
                // First, create the function
                const createFnRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        sql_text: `ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;`
                    })
                });

                if (!createFnRes.ok) {
                    // Last resort: provide the SQL for manual execution
                    return NextResponse.json({
                        status: 'manual_required',
                        message: 'Could not auto-migrate. Please run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query):',
                        sql: 'ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;'
                    });
                }

                return NextResponse.json({ status: 'success', message: 'drive_folder_id column added to requests table' });
            } else {
                // Column already exists
                return NextResponse.json({ status: 'already_exists', message: 'drive_folder_id column already exists on requests table' });
            }
        }

        // If exec_sql exists, use it
        const { error: migrationError } = await supabase.rpc('exec_sql', {
            sql_text: `ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;`
        });

        if (migrationError) throw migrationError;

        return NextResponse.json({ status: 'success', message: 'drive_folder_id column added to requests table' });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            status: 'manual_required',
            message: 'Auto-migration failed. Please run this SQL in your Supabase SQL Editor:',
            sql: 'ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;'
        }, { status: 500 });
    }
}
