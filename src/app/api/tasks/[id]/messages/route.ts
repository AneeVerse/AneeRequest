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
                sender:sender_id (full_name, role, email, avatar_url)
            `)
            .eq('task_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Enrich sender data with organization logo for clients
        const messages = data || [];
        const clientEmails = new Set<string>();
        messages.forEach((m: any) => {
            if (m.sender?.role === 'client' && m.sender?.email) {
                clientEmails.add(m.sender.email);
            }
        });

        if (clientEmails.size > 0) {
            const { data: clientsData } = await supabase
                .from('clients')
                .select('email, avatar_url, organization')
                .in('email', Array.from(clientEmails));

            if (clientsData) {
                messages.forEach((m: any) => {
                    const email = m.sender?.email;
                    if (email) {
                        const c = clientsData.find(cd => cd.email === email);
                        if (c) {
                            // Prioritize organization avatar if personal one is missing
                            if (!m.sender.avatar_url) {
                                m.sender.avatar_url = c.avatar_url;
                            }
                            m.sender.organization = c.organization;
                        }
                    }
                });
            }
        }

        return NextResponse.json(messages);
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
