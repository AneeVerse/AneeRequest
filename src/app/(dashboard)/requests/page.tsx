import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getAllRequestsData } from '@/lib/data/requests';
import RequestsClient from '@/components/RequestsClient';

// Force SSR
export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
    // Get user session from cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser();

    // If no user, return empty data (will be handled by auth context)
    if (!user) {
        return (
            <RequestsClient
                initialRequests={[]}
                initialProfiles={[]}
                initialTeamMembers={[]}
                initialClients={[]}
            />
        );
    }

    // Get user's profile to determine role
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .single();

    // Fetch all data (requests, profiles, team members)
    // Note: This doesn't handle impersonation yet - that's handled client-side
    const data = await getAllRequestsData(
        profile?.id,
        profile?.role,
        undefined // No impersonation on initial server render
    );

    return (
        <RequestsClient
            initialRequests={data.requests}
            initialProfiles={data.profiles}
            initialTeamMembers={data.teamMembers}
            initialClients={data.clients}
        />
    );
}
