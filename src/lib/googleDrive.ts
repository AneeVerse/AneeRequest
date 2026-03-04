import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { createServiceClient } from '@/lib/supabase';

// ─── Auth (Prefers OAuth2 for storage quota, falls back to Service Account) ───
const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

let googleAuth: any;

// Prefer OAuth2 — service accounts have NO storage quota and cannot upload files
if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    googleAuth = oauth2Client;
    console.log('Google Drive: Initialized with OAuth2 (Refresh Token)');
}

if (!googleAuth && serviceAccountKey) {
    try {
        const credentials = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
        googleAuth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        console.log('Google Drive: Initialized with Service Account');
    } catch (e) {
        console.error('Failed to initialize Service Account:', e);
    }
}

if (!googleAuth) {
    throw new Error('No Google credentials found. Set GOOGLE_OAUTH_* or GOOGLE_SERVICE_ACCOUNT_KEY env vars.');
}

// --- Server-Side TTL Cache ---
class SimpleCache {
    private cache = new Map<string, { data: any; expiry: number }>();
    private ttl: number;

    constructor(ttlSeconds: number) {
        this.ttl = ttlSeconds * 1000;
    }

    get(key: string) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }

    set(key: string, data: any) {
        this.cache.set(key, { data, expiry: Date.now() + this.ttl });
    }

    invalidate(key: string) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

const driveCache = new SimpleCache(60); // 1 minute cache for folder listings

/**
 * Manually clear the drive cache to force fresh data on the next fetch.
 */
export function clearDriveCache() {
    driveCache.clear();
}

function getDrive(): drive_v3.Drive {
    return google.drive({ version: 'v3', auth: googleAuth });
}

// ─── Root Folder Resolution (DB first, env fallback) ───

const ENV_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';

/**
 * Get the root folder ID. Checks DB (app_settings) first, falls back to env.
 */
export async function getRootFolderId(): Promise<string> {
    try {
        const supabase = createServiceClient();
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'drive_root_folder_id')
            .maybeSingle();

        if (data?.value) return data.value;
    } catch (e) {
        // DB not yet migrated or table missing — fall back to env
        console.warn('Could not read root folder from DB, using env fallback:', e);
    }

    if (!ENV_ROOT_FOLDER_ID) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID is not set');
    return ENV_ROOT_FOLDER_ID;
}

// ─── Folder Validation ───

/**
 * Validate that the OAuth user can access a folder. Returns folder name or error.
 */
export async function validateFolderAccess(folderId: string): Promise<{ valid: boolean; folderName?: string; error?: string }> {
    try {
        const drive = getDrive();
        const res = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, mimeType',
        });

        if (res.data.mimeType !== 'application/vnd.google-apps.folder') {
            return { valid: false, error: 'The ID does not point to a folder' };
        }

        return { valid: true, folderName: res.data.name || 'Unnamed Folder' };
    } catch (e: any) {
        if (e.code === 404 || e.status === 404) {
            return { valid: false, error: 'Folder not found or access denied' };
        }
        return { valid: false, error: e.message || 'Unknown error' };
    }
}

/**
 * List immediate subfolders of a folder.
 */
export async function listSubFolders(folderId: string): Promise<drive_v3.Schema$File[]> {
    const drive = getDrive();
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 100,
        orderBy: 'name',
    });
    return res.data.files || [];
}

// ─── Folder Operations ───

/**
 * Find a folder by name inside a parent. Returns its ID or null.
 */
export async function findFolder(parentId: string, folderName: string): Promise<string | null> {
    const drive = getDrive();
    const res = await drive.files.list({
        q: `'${parentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
    });
    return res.data.files?.[0]?.id || null;
}

/**
 * Create a folder inside a parent. Returns its ID.
 */
export async function createFolder(parentId: string, folderName: string): Promise<string> {
    const drive = getDrive();
    const res = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        },
        fields: 'id',
    });
    // Invalidate cache on write
    driveCache.clear();
    return res.data.id!;
}

/**
 * Create a specialized Google Workspace file (Doc, Sheet, Slide, Form).
 */
export async function createGoogleFile(parentId: string, fileName: string, type: 'document' | 'spreadsheet' | 'presentation' | 'form'): Promise<{ id: string; webViewLink: string }> {
    const drive = getDrive();
    const mimeTypes = {
        document: 'application/vnd.google-apps.document',
        spreadsheet: 'application/vnd.google-apps.spreadsheet',
        presentation: 'application/vnd.google-apps.presentation',
        form: 'application/vnd.google-apps.form',
    };

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            mimeType: mimeTypes[type],
            parents: [parentId],
        },
        fields: 'id, webViewLink',
    });

    // Make it viewable/editable by anyone with the link (optional, depends on security needs)
    await drive.permissions.create({
        fileId: res.data.id!,
        requestBody: {
            role: 'writer',
            type: 'anyone',
        },
    });

    driveCache.clear();
    return {
        id: res.data.id!,
        webViewLink: res.data.webViewLink!,
    };
}

/**
 * Get or create a folder. Returns its ID.
 */
export async function getOrCreateFolder(parentId: string, folderName: string): Promise<string> {
    const existing = await findFolder(parentId, folderName);
    if (existing) return existing;
    return createFolder(parentId, folderName);
}

/**
 * Build the full folder path: Root > ClientName > RequestTitle > production|distributed
 * If clientFolderId is provided, uses it instead of Root > ClientName.
 * Returns the target folder ID.
 */
export async function ensureFolderPath(
    clientName: string,
    requestTitle: string,
    folder: 'production' | 'distributed',
    clientFolderId?: string | null
): Promise<string> {
    let baseFolderId: string;

    if (clientFolderId) {
        console.log(`Google Drive: Using linked client folder ${clientFolderId}`);
        baseFolderId = clientFolderId;
    } else {
        const rootId = await getRootFolderId();
        console.log(`Google Drive: Resolving client folder for "${clientName}" in root ${rootId}`);
        baseFolderId = await getOrCreateFolder(rootId, clientName);
    }

    console.log(`Google Drive: Resolving request folder for "${requestTitle}" in base ${baseFolderId}`);
    const requestFolderId = await getOrCreateFolder(baseFolderId, requestTitle);

    console.log(`Google Drive: Resolving subfolder "${folder}" in request folder ${requestFolderId}`);
    const targetFolderId = await getOrCreateFolder(requestFolderId, folder);

    return targetFolderId;
}

// ─── File Operations ───

/**
 * Upload a file to a specific Drive folder. Returns { fileId, webViewLink }.
 */
export async function uploadFileToDrive(
    folderId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
): Promise<{ fileId: string; webViewLink: string }> {
    const drive = getDrive();

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: Readable.from(fileBuffer),
        },
        fields: 'id, webViewLink',
    });

    const fileId = res.data.id!;

    // Make the file publicly viewable via link
    await drive.permissions.create({
        fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    // Get the direct download/view URL
    const fileInfo = await drive.files.get({
        fileId,
        fields: 'webViewLink, webContentLink',
    });

    // Invalidate cache on write
    driveCache.clear();

    return {
        fileId,
        webViewLink: fileInfo.data.webContentLink || fileInfo.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    };
}

/**
 * Rename a file in Google Drive.
 */
export async function renameFileInDrive(fileId: string, newName: string): Promise<void> {
    const drive = getDrive();
    await drive.files.update({
        fileId,
        requestBody: { name: newName },
    });
    // Invalidate cache on write
    driveCache.clear();
}

/**
 * Delete a file from Google Drive.
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
    const drive = getDrive();
    await drive.files.delete({ fileId });
    // Invalidate cache on write
    driveCache.clear();
}

/**
 * List all files in a folder.
 */
export async function listFilesInFolder(folderId: string): Promise<drive_v3.Schema$File[]> {
    const drive = getDrive();
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
        pageSize: 1000,
    });
    return res.data.files || [];
}

// ─── Folder CRUD ───

/**
 * Rename a folder in Google Drive.
 */
export async function renameFolderInDrive(folderId: string, newName: string): Promise<void> {
    const drive = getDrive();
    await drive.files.update({
        fileId: folderId,
        requestBody: { name: newName },
    });
    // Invalidate cache on write
    driveCache.clear();
}

/**
 * Delete a folder from Google Drive (moves to trash).
 */
export async function deleteFolderFromDrive(folderId: string): Promise<void> {
    const drive = getDrive();
    await drive.files.delete({ fileId: folderId });
    // Invalidate cache on write
    driveCache.clear();
}

/**
 * List ALL items (files + folders) in a parent folder.
 * Returns them sorted: folders first, then files, both alphabetical.
 */
export async function listFolderContents(folderId: string): Promise<drive_v3.Schema$File[]> {
    const cacheKey = `contents_${folderId}`;
    const cached = driveCache.get(cacheKey);
    if (cached) return cached;

    const drive = getDrive();
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
        pageSize: 1000,
        orderBy: 'folder,name',
    });
    const data = res.data.files || [];
    driveCache.set(cacheKey, data);
    return data;
}
/**
 * Get a file's content and metadata from Google Drive.
 */
export async function getFile(fileId: string): Promise<{ stream: any; mimeType: string; name: string }> {
    const drive = getDrive();

    // Get metadata
    const metadata = await drive.files.get({
        fileId,
        fields: 'name, mimeType',
    });

    // Get content stream
    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );

    return {
        stream: res.data,
        mimeType: metadata.data.mimeType || 'application/octet-stream',
        name: metadata.data.name || 'file',
    };
}
