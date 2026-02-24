import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { resolveTaskSlug } from '@/lib/utils';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveTaskSlug(idOrSlug);
        const supabase = createServiceClient();

        const { data, error } = await supabase
            .from('task_messages')
            .select(`
                *,
                sender:sender_id (full_name, role, avatar_url)
            `)
            .eq('task_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveTaskSlug(idOrSlug);
        const body = await request.json();
        const { message, sender_id, attachments } = body;

        // Allow empty message if attachments are present
        const hasAttachments = attachments && attachments.length > 0;
        if ((!message && !hasAttachments) || !sender_id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const finalMessage = message || (hasAttachments ? '📎 File attached' : '');

        const supabase = createServiceClient();
        const { data, error } = await supabase
            .from('task_messages')
            .insert([
                {
                    task_id: id,
                    sender_id,
                    message: finalMessage,
                    attachments: attachments || []
                }
            ])
            .select(`
                *,
                sender:sender_id (full_name, role, avatar_url)
            `)
            .single();

        if (error) {
            console.error('API POST TASK MESSAGES ERROR:', error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
