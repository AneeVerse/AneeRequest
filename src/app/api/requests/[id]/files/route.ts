import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { resolveRequestSlug } from '@/lib/utils';
import {
    getRootFolderId,
    findFolder,
    findFolderFuzzy,
    listFolderContents
} from '@/lib/googleDrive';

// GET: Fetch files for a specific request from Google Drive
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const supabase = createServiceClient();

        // 1. Get request details
        const { data: req, error: reqErr } = await supabase
            .from('requests')
            .select('*')
            .eq('id', id)
            .single();

        if (reqErr || !req) {
            console.error('Request Files GET: not found for id:', id, 'error:', reqErr?.message);
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // 2. Get client info directly from clients table
        const { data: client } = await supabase
            .from('clients')
            .select('organization, name, drive_folder_id')
            .eq('id', req.client_id)
            .maybeSingle();

        const clientName = client?.organization || client?.name || 'Unknown';

        // 3. Navigate Drive folder structure
        let baseFolderId: string;

        if (client?.drive_folder_id) {
            baseFolderId = client.drive_folder_id;
        } else {
            const rootId = await getRootFolderId();
            const clientFolderId = await findFolder(rootId, clientName);
            if (!clientFolderId) {
                return NextResponse.json({ files: [], folderLinked: false });
            }
            baseFolderId = clientFolderId;
        }

        // Find the request folder
        let requestFolderId: string | null = req.drive_folder_id || null;

        if (!requestFolderId) {
            // Try exact match first, then fuzzy match (handles prefixes like "01-" and case differences)
            requestFolderId = await findFolder(baseFolderId, req.title);
            if (!requestFolderId) {
                requestFolderId = await findFolderFuzzy(baseFolderId, req.title);
            }
            // Auto-link the folder to the request so future lookups are instant
            if (requestFolderId) {
                await supabase
                    .from('requests')
                    .update({ drive_folder_id: requestFolderId })
                    .eq('id', id);
            }
        }

        if (!requestFolderId) {
            return NextResponse.json({ files: [], folderLinked: false });
        }

        // 4. List all contents from production and distributed subfolders
        const allFiles: any[] = [];

        // Check for production subfolder
        const productionId = await findFolder(requestFolderId, 'production');
        if (productionId) {
            const prodFiles = await listFolderContents(productionId);
            for (const f of prodFiles) {
                if (f.mimeType !== 'application/vnd.google-apps.folder') {
                    allFiles.push({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                        size: f.size ? parseInt(f.size) : null,
                        createdTime: f.createdTime,
                        folder: 'production',
                        previewUrl: `/api/drive/view?fileId=${f.id}`,
                        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
                    });
                }
            }
        }

        // Check for distributed subfolder
        const distributedId = await findFolder(requestFolderId, 'distributed');
        if (distributedId) {
            const distFiles = await listFolderContents(distributedId);
            for (const f of distFiles) {
                if (f.mimeType !== 'application/vnd.google-apps.folder') {
                    allFiles.push({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                        size: f.size ? parseInt(f.size) : null,
                        createdTime: f.createdTime,
                        folder: 'distributed',
                        previewUrl: `/api/drive/view?fileId=${f.id}`,
                        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
                    });
                }
            }
        }

        // Also list files directly in the request folder (not in subfolders)
        const directFiles = await listFolderContents(requestFolderId);
        for (const f of directFiles) {
            if (f.mimeType !== 'application/vnd.google-apps.folder') {
                allFiles.push({
                    id: f.id,
                    name: f.name,
                    mimeType: f.mimeType,
                    size: f.size ? parseInt(f.size) : null,
                    createdTime: f.createdTime,
                    folder: 'root',
                    previewUrl: `/api/drive/view?fileId=${f.id}`,
                    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
                });
            }
        }

        return NextResponse.json({ files: allFiles, folderLinked: true, folderId: requestFolderId });
    } catch (error: any) {
        console.error('Request Files API Error:', error);
        return NextResponse.json({ files: [], folderLinked: false, error: error.message });
    }
}

// POST: Create folder structure for a specific request on Google Drive
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const supabase = createServiceClient();
        const { ensureFolderPath } = await import('@/lib/googleDrive');

        // 1. Get request details
        const { data: req, error: reqErr } = await supabase
            .from('requests')
            .select('*')
            .eq('id', id)
            .single();

        if (reqErr || !req) {
            console.error('Request Files POST: not found for id:', id, 'error:', reqErr?.message);
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // 2. Get client info
        const { data: client } = await supabase
            .from('clients')
            .select('organization, name, drive_folder_id')
            .eq('id', req.client_id)
            .maybeSingle();

        const clientName = client?.organization || client?.name || 'Unknown';

        // 3. Ensure folder path exists
        // This will create Client Folder > Request Folder > production & distributed
        const prodFolderId = await ensureFolderPath(clientName, req.title, 'production', client?.drive_folder_id);
        const distributedFolderId = await ensureFolderPath(clientName, req.title, 'distributed', client?.drive_folder_id);

        // Find the parent request folder ID (hacky because ensureFolderPath returns subfolder)
        // A better search would be needed or modify ensureFolderPath to return parent
        const requestFolderId = await findFolder(client?.drive_folder_id || await getRootFolderId(), req.title);

        if (requestFolderId) {
            // Update request in DB with the drive_folder_id
            await supabase
                .from('requests')
                .update({ drive_folder_id: requestFolderId })
                .eq('id', id);
        }

        return NextResponse.json({ success: true, folderId: requestFolderId || distributedFolderId });
    } catch (error: any) {
        console.error('Create Request Folder Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
