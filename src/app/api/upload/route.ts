import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServiceClient } from '@/lib/supabase';
import { ensureFolderPath, uploadFileToDrive } from '@/lib/googleDrive';
import { resolveRequestSlug, resolveTaskSlug } from '@/lib/utils';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const requestIdRaw = formData.get('requestId') as string | null;
        const taskIdRaw = formData.get('taskId') as string | null;
        const senderId = formData.get('senderId') as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Resolve slugs to UUIDs
        let requestId = requestIdRaw ? await resolveRequestSlug(requestIdRaw) : null;
        let taskId = taskIdRaw ? await resolveTaskSlug(taskIdRaw) : null;

        // If requestId is provided, upload to Google Drive (chat attachments)
        if (requestId) {
            const supabase = createServiceClient();
            const { data: req, error: reqErr } = await supabase
                .from('requests')
                .select('id, title, client_id')
                .eq('id', requestId)
                .single();

            if (reqErr || !req) throw new Error(reqErr?.message || 'Request not found');

            // Get client profile (where email is stored)
            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', req.client_id)
                .single();

            // Get client metadata (where organization/drive_folder_id are stored)
            const { data: clientData } = await supabase
                .from('clients')
                .select('organization, name, drive_folder_id')
                .ilike('email', clientProfile?.email || '')
                .maybeSingle();

            const clientName = clientData?.organization || clientData?.name || clientProfile?.full_name || 'Unknown';

            let folder: 'production' | 'distributed' = 'production';
            if (senderId) {
                const { data: senderProfile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', senderId)
                    .single();

                if (senderProfile?.role === 'client') {
                    folder = 'distributed';
                }
            }

            const folderId = await ensureFolderPath(clientName, req.title, folder, clientData?.drive_folder_id);
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const { fileId, webViewLink } = await uploadFileToDrive(
                folderId,
                file.name,
                fileBuffer,
                file.type
            );

            return NextResponse.json({
                url: webViewLink,
                name: file.name,
                type: file.type,
                drive_file_id: fileId
            });
        }

        // Fallback: taskId or general upload → Supabase Storage
        const supabase = createServiceClient();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;

        // If taskId is provided, we can organize by task
        const path = taskId ? `tasks/${taskId}/${fileName}` : fileName;

        const { error } = await supabase.storage
            .from('chat-attachments')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(path);

        return NextResponse.json({
            url: publicUrl,
            name: file.name,
            type: file.type
        });
    } catch (error: any) {
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
