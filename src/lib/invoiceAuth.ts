import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase';

export interface InvoiceAuthResult {
    userId: string;
    role: string;
    allowed: boolean;
    reason?: string;
}

/**
 * Invoice access: super_admin & admin always; team_member if accessible_sections includes 'invoices'.
 * Clients never allowed.
 */
export async function requireInvoiceAccess(): Promise<InvoiceAuthResult> {
    const cookieStore = await cookies();
    const clientSupabase = createServerClient(
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

    const { data: { user } } = await clientSupabase.auth.getUser();
    if (!user) {
        return { userId: '', role: '', allowed: false, reason: 'Unauthorized' };
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();

    const role = profile?.role || '';

    if (role === 'super_admin' || role === 'admin') {
        return { userId: user.id, role, allowed: true };
    }

    if (role === 'team_member') {
        const { data: team } = await supabase
            .from('team_members')
            .select('accessible_sections, position')
            .eq('profile_id', user.id)
            .maybeSingle();

        const sections: string[] = team?.accessible_sections || [];
        if (team?.position === 'admin' || sections.includes('invoices')) {
            return { userId: user.id, role, allowed: true };
        }

        return { userId: user.id, role, allowed: false, reason: 'Forbidden' };
    }

    return { userId: user.id, role, allowed: false, reason: 'Forbidden' };
}
