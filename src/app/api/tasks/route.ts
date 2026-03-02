import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateSlug, resolveTaskSlug, resolveRequestSlug } from '@/lib/utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('request_id');
        const taskId = searchParams.get('id');

        const supabase = createServiceClient();

        let selectStr = `
            *,
            assignee:assigned_to (id, full_name),
            creator:created_by (id, full_name),
            request_links:task_request_links (
                request:request_id (
                    id, 
                    slug, 
                    title,
                    client:client_id (id, full_name, email, avatar_url)
                )
            )
        `;

        // If filtering by a specific request, we use !inner to restrict the results to linked tasks
        if (requestId) {
            selectStr = `
                *,
                assignee:assigned_to (id, full_name),
                creator:created_by (id, full_name),
                request_links:task_request_links!inner (
                    request:request_id (
                        id, 
                        slug, 
                        title,
                        client:client_id (id, full_name, email, avatar_url)
                    )
                )
            `;
        }

        let query = supabase
            .from('tasks')
            .select(selectStr)
            .order('created_at', { ascending: false });

        if (requestId) {
            const resolvedRequestId = await resolveRequestSlug(requestId);
            query = query.eq('task_request_links.request_id', resolvedRequestId);
        }

        // If 'id' is provided as a search param, filter by id or slug
        if (taskId) {
            const resolvedId = await resolveTaskSlug(taskId);
            query = query.eq('id', resolvedId);
        }

        // Perform the query
        const { data, error } = await query;
        if (error) throw error;

        const tasks = Array.isArray(data) ? data : [data].filter(Boolean);

        // Extract client emails for organization/avatar enrichment
        const clientEmails = new Set<string>();
        tasks.forEach((task: any) => {
            task.request_links?.forEach((link: any) => {
                if (link.request?.client?.email) {
                    clientEmails.add(link.request.client.email);
                }
            });
        });

        // Fetch organizations for all clients and their primary branding profile
        if (clientEmails.size > 0) {
            // Get client records to find matching organizations and emails
            const { data: clientsData } = await supabase
                .from('clients')
                .select('email, organization')
                .in('email', Array.from(clientEmails));

            if (clientsData) {
                // Now get the primary logos for these client emails from profiles
                const { data: logoProfiles } = await supabase
                    .from('profiles')
                    .select('email, avatar_url')
                    .in('email', Array.from(clientEmails));

                tasks.forEach((task: any) => {
                    task.request_links?.forEach((link: any) => {
                        const email = link.request?.client?.email;
                        if (email) {
                            const normalizedEmail = email.toLowerCase().trim();
                            const c = clientsData.find(cd => cd.email.toLowerCase().trim() === normalizedEmail);
                            if (c) {
                                link.request.client.organization = c.organization;

                                // ALSO override the avatar_url with the one from the primary client profile
                                // if the individual user profile doesn't have one or if we want to prioritize org logo
                                const lp = logoProfiles?.find(p => p.email.toLowerCase().trim() === normalizedEmail);
                                if (lp?.avatar_url) {
                                    link.request.client.avatar_url = lp.avatar_url;
                                }
                            }
                        }
                    });
                });
            }
        }

        return NextResponse.json(taskId && tasks.length === 1 ? tasks[0] : tasks);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = createServiceClient();
        const body = await request.json();
        const { request_ids, ...taskData } = body;

        // 1. Create the task with a slug
        const { title } = taskData;
        const initialSlug = generateSlug(title || 'task');

        const { data: newTask, error: taskError } = await supabase
            .from('tasks')
            .insert({
                ...taskData,
                slug: initialSlug
            })
            .select()
            .single();

        if (taskError) throw taskError;

        // 2. Create request links if provided
        if (request_ids && Array.isArray(request_ids) && request_ids.length > 0) {
            // Resolve all request IDs (slugs or UUIDs)
            const resolvedRequestIds = await Promise.all(
                request_ids.map(rid => resolveRequestSlug(rid))
            );

            const links = resolvedRequestIds.map(rid => ({
                task_id: newTask.id,
                request_id: rid
            }));

            const { error: linkError } = await supabase
                .from('task_request_links')
                .insert(links);

            if (linkError) throw linkError;
        }

        return NextResponse.json(newTask);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = createServiceClient();
        const body = await request.json();
        const { id, request_ids, ...updates } = body;

        if (!id) return NextResponse.json({ error: "Missing task ID" }, { status: 400 });

        // 1. Update task basic info
        const resolvedId = await resolveTaskSlug(id);
        const { data: updatedTask, error: taskError } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', resolvedId)
            .select()
            .single();

        if (taskError) throw taskError;

        // 2. Synchronize request links if request_ids is provided
        if (request_ids && Array.isArray(request_ids)) {
            // Remove existing links
            await supabase
                .from('task_request_links')
                .delete()
                .eq('task_id', resolvedId);

            // Add new links
            if (request_ids.length > 0) {
                // Resolve all request IDs (slugs or UUIDs)
                const resolvedRequestIds = await Promise.all(
                    request_ids.map(rid => resolveRequestSlug(rid))
                );

                const links = resolvedRequestIds.map(rid => ({
                    task_id: resolvedId,
                    request_id: rid
                }));

                const { error: linkError } = await supabase
                    .from('task_request_links')
                    .insert(links);

                if (linkError) throw linkError;
            }
        }

        return NextResponse.json(updatedTask);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = createServiceClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Missing task ID" }, { status: 400 });

        const resolvedId = await resolveTaskSlug(id);
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', resolvedId);

        if (error) throw error;
        return NextResponse.json({ message: "Task deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
