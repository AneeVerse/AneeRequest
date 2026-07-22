import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase';
import { getAllInvoices } from '@/lib/data/invoices';
import InvoicesClient from '@/components/InvoicesClient';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    let initialInvoices: Awaited<ReturnType<typeof getAllInvoices>> = [];

    if (user) {
        const service = createServiceClient();
        const { data: profile } = await service
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role;
        let allowed = role === 'super_admin' || role === 'admin';

        if (!allowed && role === 'team_member') {
            const { data: team } = await service
                .from('team_members')
                .select('accessible_sections, position')
                .eq('profile_id', user.id)
                .maybeSingle();
            allowed =
                team?.position === 'admin' ||
                (team?.accessible_sections || []).includes('invoices');
        }

        if (allowed) {
            initialInvoices = await getAllInvoices();
        }
    }

    return <InvoicesClient initialInvoices={initialInvoices} />;
}
