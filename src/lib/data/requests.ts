import { createServiceClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { getTeamMembers, type TeamMember } from './team';
export type { TeamMember };

export interface RequestItem {
    id: string;
    slug: string | null;
    title: string;
    description: string;
    client: { id: string; full_name: string; email: string; organization?: string; avatar_url?: string; slug?: string } | null;
    status: string;
    priority: string;
    assigned_to: string | null;
    assignee: { id: string; full_name: string } | null;
    due_date: string;
    request_number?: number;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    full_name: string;
    email: string;
    role?: string;
    accessible_sections?: string[];
}



export interface Client {
    id: string;
    name: string;
    email: string;
    organization: string;
    status: string;
    created_at: string;
    drive_folder_id?: string | null;
    avatar_url?: string | null;
    profile_id?: string | null;
}

/**
 * Fetches requests with role-based filtering
 * @param userId - The ID of the user making the request
 * @param userRole - The role of the user (client, team_member, admin, super_admin)
 * @param impersonateId - Optional ID to impersonate another user
 */
export async function getRequestsData(
    userId?: string,
    userRole?: string,
    impersonateId?: string
) {
    const supabase = createServiceClient();

    let activeProfileId = userId;
    let activeRole = userRole;

    // Handle Impersonation
    if (impersonateId && userId && (userRole === 'super_admin' || userRole === 'admin')) {
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', impersonateId)
            .single();

        if (targetProfile) {
            activeProfileId = impersonateId;
            activeRole = targetProfile.role;
        }
    }

    const query = supabase
        .from('requests')
        .select(`
            *,
            client:client_id (id, full_name:name, organization, email),
            assignee:assigned_to (id, full_name)
        `);

    // Apply role-based filtering
    if (activeRole === 'client' && activeProfileId) {
        // Find the client record for this profile's email
        const { data: profile } = await supabase.from('profiles').select('email').eq('id', activeProfileId).single();
        if (profile?.email) {
            const { data: client } = await supabase.from('clients').select('id').ilike('email', profile.email).maybeSingle();
            if (client) {
                query.eq('client_id', client.id);
            } else {
                query.eq('client_id', '00000000-0000-0000-0000-000000000000');
            }
        }
    } else if (activeRole === 'team_member' && activeProfileId) {
        // Team members only see assigned requests unless they are admin-role team members
        const { data: teamData } = await supabase
            .from('team_members')
            .select('position')
            .eq('profile_id', activeProfileId)
            .maybeSingle();

        if (teamData?.position !== 'admin') {
            query.eq('assigned_to', activeProfileId);
        }
    }
    // super_admin and admin see everything

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching requests:', error);
        return [];
    }

    // Fetch organizations for all clients
    const clientEmails = (data || [])
        .map(r => r.client?.email)
        .filter(Boolean) as string[];

    if (clientEmails.length > 0) {
        const { data: clientsData } = await supabase
            .from('clients')
            .select('email, organization')
            .in('email', clientEmails);

        const { data: profilesData } = await supabase
            .from('profiles')
            .select('email, avatar_url')
            .in('email', clientEmails);

        if (clientsData) {
            data?.forEach(r => {
                if (r.client?.email) {
                    const c = clientsData.find(cd => cd.email.toLowerCase() === r.client!.email.toLowerCase());
                    const p = profilesData?.find(pd => pd.email.toLowerCase() === r.client!.email.toLowerCase());

                    if (c) {
                        (r.client as any).organization = c.organization;
                        (r.client as any).slug = slugify(c.organization || r.client!.full_name);
                    } else {
                        (r.client as any).slug = slugify(r.client!.full_name);
                    }

                    if (p) {
                        (r.client as any).avatar_url = p.avatar_url;
                    }
                }
            });
        }
    }

    return data || [];
}

/**
 * Fetches all profiles
 */
export async function getProfiles(): Promise<Profile[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url'); // Added avatar_url

    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }

    return data || [];
}



/**
 * Fetches all clients
 */
export async function getClients(): Promise<Client[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('organization', { ascending: true });

    if (error) {
        console.error('Error fetching clients:', error);
        return [];
    }

    return data || [];
}

/**
 * Fetches all data needed for the requests page
 */
export async function getAllRequestsData(
    userId?: string,
    userRole?: string,
    impersonateId?: string
): Promise<{ requests: RequestItem[]; profiles: Profile[]; teamMembers: TeamMember[]; clients: Client[] }> {
    const [requests, profiles, teamMembers, clients] = await Promise.all([
        getRequestsData(userId, userRole, impersonateId),
        getProfiles(),
        getTeamMembers(),
        getClients() // Fetch all clients
    ]);

    return {
        requests: requests || [],
        profiles: profiles || [],
        teamMembers: teamMembers || [],
        clients: clients || []
    };
}
