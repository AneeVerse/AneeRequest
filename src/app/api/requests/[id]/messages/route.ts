import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { resolveRequestSlug } from '@/lib/utils';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const supabase = createServiceClient();

        const { data, error } = await supabase
            .from('request_messages')
            .select(`
                *,
                sender:sender_id (full_name, role, avatar_url)
            `)
            .eq('request_id', id)
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
        const id = await resolveRequestSlug(idOrSlug);
        const body = await request.json();
        console.log('API POST MESSAGES BODY:', JSON.stringify(body, null, 2));
        const { message, sender_id, attachments } = body;

        // Allow empty message if attachments are present
        const hasAttachments = attachments && attachments.length > 0;
        if ((!message && !hasAttachments) || !sender_id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const finalMessage = message || (hasAttachments ? '📎 File attached' : '');

        const supabase = createServiceClient();
        const { data, error } = await supabase
            .from('request_messages')
            .insert([
                {
                    request_id: id,
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
            console.error('API POST MESSAGES ERROR:', error);
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { id, message } = body;

        if (!id || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createServiceClient();
        const { data, error } = await supabase
            .from('request_messages')
            .update({
                message,
                is_edited: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                sender:sender_id (full_name, role, avatar_url)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('messageId');

        if (!messageId) {
            return NextResponse.json({ error: "Missing message ID" }, { status: 400 });
        }

        const supabase = createServiceClient();
        const { error } = await supabase
            .from('request_messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
