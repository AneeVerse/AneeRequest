import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase';
import { ensureFolderPath } from '@/lib/googleDrive';
import { generateSlug, resolveRequestSlug } from '@/lib/utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const impersonateId = searchParams.get('impersonate_id');

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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createServiceClient();

        // 1. Get the real user's profile
        const { data: realProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        let activeProfileId = user.id;
        let activeRole = realProfile?.role;

        // 2. Handle Impersonation
        if (impersonateId && (realProfile?.role === 'super_admin' || realProfile?.role === 'admin')) {
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

        // 3. Apply role-based filtering
        if (activeRole === 'client') {
            query.eq('client_id', activeProfileId);
        } else if (activeRole === 'team_member') {
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

        if (id) {
            // Determine if the param is a UUID or a slug
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

            const singleQuery = supabase
                .from('requests')
                .select(`
                    *,
                    client:client_id (id, full_name, email),
                    assignee:assigned_to (id, full_name)
                `)
                .eq(isUuid ? 'id' : 'slug', id)
                .maybeSingle();

            const { data, error } = await singleQuery;
            if (error) throw error;

            if (!data) {
                return NextResponse.json({ error: "Request not found" }, { status: 404 });
            }

            // Fetch organization from clients table
            if (data.client?.email) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('organization')
                    .eq('email', data.client.email)
                    .maybeSingle();

                if (clientData) {
                    data.client.organization = clientData.organization;
                }

                // Calculate request number for this client
                const { count } = await supabase
                    .from('requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('client_id', data.client_id)
                    .lte('created_at', data.created_at);

                data.request_number = count;
            }

            return NextResponse.json(data);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch organizations for all clients if it's a list
        const clientEmails = data
            .map(r => r.client?.email)
            .filter(Boolean);

        if (clientEmails.length > 0) {
            const { data: clientsData } = await supabase
                .from('clients')
                .select('email, organization')
                .in('email', clientEmails);

            if (clientsData) {
                data.forEach(r => {
                    if (r.client?.email) {
                        const c = clientsData.find(cd => cd.email === r.client.email);
                        if (c) r.client.organization = c.organization;
                    }
                });
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, client_id, priority, due_date } = body;

        if (!title || !client_id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createServiceClient();

        // 1. Calculate the next request number for this specific client
        const { count, error: countErr } = await supabase
            .from('requests')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client_id);

        if (countErr) throw countErr;

        const nextNum = (count || 0) + 1;
        const prefix = nextNum.toString().padStart(2, '0');
        const numberedTitle = `${prefix}-${title}`;

        // 2. Insert the request with the numbered title and slug
        const initialSlug = generateSlug(numberedTitle);
        const { data, error } = await supabase
            .from('requests')
            .insert([
                {
                    title: numberedTitle,
                    slug: initialSlug, // We'll update it with ID part after we have the ID or just use it as is if unique
                    description,
                    client_id,
                    priority: priority || 'Medium',
                    due_date,
                    status: 'Todo'
                }
            ])
            .select()
            .single();

        if (error) throw error;

        // Auto-create Google Drive folder for this request (only if requested)
        if (body.create_folder !== false) {
            try {
                // Fetch client name for folder structure
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', client_id)
                    .single();

                const { data: client } = await supabase
                    .from('clients')
                    .select('organization, name, drive_folder_id')
                    .ilike('email', profile?.email || '')
                    .maybeSingle();

                const clientName = client?.organization || client?.name || profile?.full_name || 'Unknown';

                // Create the folder structure using the numbered title
                await ensureFolderPath(clientName, numberedTitle, 'production', client?.drive_folder_id);
            } catch (err) {
                console.warn('Could not create Drive folder for request:', err);
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Create Request Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const body = await request.json();

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const supabase = createServiceClient();
        const resolvedId = await resolveRequestSlug(id);
        const { data, error } = await supabase
            .from('requests')
            .update(body)
            .eq('id', resolvedId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const supabase = createServiceClient();

        // 1. Get user session for authorization check
        const { data: { session }, error: authErr } = await supabase.auth.getSession();

        // Note: For service client, session might be null. 
        // We should actually use the request cookies to check the session of the calling user.
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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Fetch user profile to check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'super_admin') {
            return NextResponse.json({ error: "Forbidden: Only Super Admins can delete requests" }, { status: 403 });
        }

        // 3. Delete the request
        const resolvedId = await resolveRequestSlug(id);
        const { error } = await supabase
            .from('requests')
            .delete()
            .eq('id', resolvedId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Request Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
