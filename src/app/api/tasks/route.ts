import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateSlug, resolveTaskSlug } from '@/lib/utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('request_id');

        const supabase = createServiceClient();
        let query = supabase
            .from('tasks')
            .select(`
                *,
                assignee:assigned_to (id, full_name),
                creator:created_by (id, full_name),
                request_links:task_request_links (
                    request:request_id (id, slug, title)
                )
            `)
            .order('created_at', { ascending: false });

        if (requestId) {
            // ... (keep existing requestId filtering)
        }

        // If 'id' is provided as a search param, filter by id or slug
        const id = searchParams.get('id');
        if (id) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            query = query.eq(isUuid ? 'id' : 'slug', id);
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
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

        // 1.1 Update slug with ID hash for uniqueness
        if (newTask) {
            const finalSlug = generateSlug(newTask.title || 'task', newTask.id);
            await supabase
                .from('tasks')
                .update({ slug: finalSlug })
                .eq('id', newTask.id);
            newTask.slug = finalSlug;
        }

        // 2. Create request links if provided
        if (request_ids && Array.isArray(request_ids) && request_ids.length > 0) {
            const links = request_ids.map(rid => ({
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
                .eq('task_id', id);

            // Add new links
            if (request_ids.length > 0) {
                const links = request_ids.map(rid => ({
                    task_id: id,
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
