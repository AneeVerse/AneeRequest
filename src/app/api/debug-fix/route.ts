import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
    try {
        const supabase = createServiceClient();
        const { data: profiles } = await supabase.from('profiles').select('email, full_name').eq('role', 'client');
        const { data: clients } = await supabase.from('clients').select('email, organization');

        const analysis = profiles?.map(p => {
            const client = clients?.find(c => c.email.toLowerCase() === p.email.toLowerCase());
            return {
                profile_email: p.email,
                profile_name: p.full_name,
                client_email: client?.email || 'NOT FOUND',
                organization: client?.organization || 'NOT FOUND',
                match_exact: client?.email === p.email,
                match_lower: client?.email?.toLowerCase() === p.email?.toLowerCase()
            };
        });

        return NextResponse.json({ analysis, total_profiles: profiles?.length, total_clients: clients?.length });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
