import { createServiceClient } from '@/lib/supabase';

export interface RequestItem {
    id: string;
    title: string;
    description: string;
    client: { id: string; full_name: string; email: string; organization?: string } | null;
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

export interface TeamMember {
    id: string;
    name: string;
    profile_id: string;
    position?: string;
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
            client:client_id (id, full_name, email),
            assignee:assigned_to (id, full_name)
        `);

    // Apply role-based filtering
    if (activeRole === 'client' && activeProfileId) {
        query.eq('client_id', activeProfileId);
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

        if (clientsData) {
            data?.forEach(r => {
                if (r.client?.email) {
                    const c = clientsData.find(cd => cd.email === r.client!.email);
                    if (c) {
                        (r.client as any).organization = c.organization;
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
        .select('id, full_name, email, role');

    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }

    return data || [];
}

/**
 * Fetches all team members
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('team_members')
        .select('*');

    if (error) {
        console.error('Error fetching team members:', error);
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
) {
    const [requests, profiles, teamMembers] = await Promise.all([
        getRequestsData(userId, userRole, impersonateId),
        getProfiles(),
        getTeamMembers()
    ]);

    return {
        requests,
        profiles,
        teamMembers
    };
}
