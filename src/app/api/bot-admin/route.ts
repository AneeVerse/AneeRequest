import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    getRootFolderId,
    listFolderContents,
    listSubFolders,
    createFolder,
    findFolder,
    uploadFileToDrive,
    validateFolderAccess,
    deleteFileFromDrive,
    renameFileInDrive,
    deleteFolderFromDrive,
    renameFolderInDrive,
    ensureFolderPath,
} from "@/lib/googleDrive";

export const runtime = "nodejs";

// ─── Supabase service client (bypasses RLS) ───
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// ─── Allowed tables (whitelist to prevent arbitrary table access) ───
const ALLOWED_TABLES = [
    "clients",
    "requests",
    "tasks",
    "task_request_links",
    "profiles",
    "team_members",
    "task_messages",
    "app_settings",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

function isAllowedTable(t: string): t is AllowedTable {
    return ALLOWED_TABLES.includes(t as AllowedTable);
}

// ─── Table schema reference (for the schema action) ───
const TABLE_SCHEMAS: Record<string, { key_columns: string[]; notes: string }> = {
    clients: {
        key_columns: ["id", "name", "email", "organization", "status", "slug", "drive_folder_id", "created_at"],
        notes: "status: Active/Inactive. slug is auto-generated from organization.",
    },
    requests: {
        key_columns: ["id", "slug", "title", "description", "status", "priority", "assigned_to", "client_id", "client_link_id", "due_date", "request_number", "drive_folder_id", "created_at", "updated_at"],
        notes: "status: e.g. New/In Progress/Completed/On Hold. priority: Low/Medium/High/Critical. client_id refs clients.id. assigned_to refs profiles.id.",
    },
    tasks: {
        key_columns: ["id", "slug", "title", "description", "status", "priority", "assigned_to", "created_by", "due_date", "created_at", "updated_at"],
        notes: "status: Todo/In Progress/Review/Done. priority: Low/Medium/High/Critical. assigned_to & created_by ref profiles.id.",
    },
    task_request_links: {
        key_columns: ["id", "task_id", "request_id", "created_at"],
        notes: "Join table linking tasks to requests. task_id refs tasks.id, request_id refs requests.id.",
    },
    profiles: {
        key_columns: ["id", "full_name", "email", "role", "avatar_url", "phone", "country_code", "accessible_sections"],
        notes: "role: super_admin/admin/team_member/client. Linked to Supabase Auth users.",
    },
    team_members: {
        key_columns: ["id", "profile_id", "name", "email", "position", "status", "department", "role", "created_at"],
        notes: "profile_id refs profiles.id. position: admin/editor/viewer.",
    },
    task_messages: {
        key_columns: ["id", "task_id", "sender_id", "content", "created_at"],
        notes: "Chat messages on tasks. task_id refs tasks.id, sender_id refs profiles.id.",
    },
    app_settings: {
        key_columns: ["key", "value"],
        notes: "Key-value store for app config (e.g. drive_root_folder_id).",
    },
};

// ─── Helpers ───
function res(status: number, body: unknown) {
    return NextResponse.json(body, { status });
}

function err(status: number, message: string) {
    return res(status, { ok: false, error: message });
}

// ─── Main handler ───
export async function POST(req: NextRequest) {
    try {
        // ── Auth ──
        const token = req.headers.get("x-bot-token");
        if (!token || token !== process.env.BOT_ADMIN_TOKEN) {
            return err(401, "Unauthorized");
        }

        const body = await req.json();
        const action: string | undefined = body?.action;
        const payload: Record<string, any> = body?.payload || {};

        if (!action) return err(400, "Missing action");

        // ════════════════════════════════════════════
        //  SYSTEM
        // ════════════════════════════════════════════

        if (action === "ping") {
            return res(200, {
                ok: true,
                data: { pong: true, ts: new Date().toISOString() },
            });
        }

        if (action === "schema") {
            const allActions = [
                "ping", "schema",
                "db.select", "db.insert", "db.update", "db.upsert", "db.delete", "db.rpc",
                "clients.list", "clients.countActive",
                "requests.list", "tasks.list",
                "auth.listUsers", "auth.getUser", "auth.createUser", "auth.updateUser", "auth.deleteUser",
                "google.ping", "drive.listRoot", "drive.listFolder", "drive.createFolder",
                "drive.uploadText", "drive.deleteFile", "drive.renameFile",
                "drive.deleteFolder", "drive.renameFolder", "drive.ensurePath",
            ];
            return res(200, {
                ok: true,
                data: {
                    tables: TABLE_SCHEMAS,
                    allowed_tables: ALLOWED_TABLES,
                    actions: allActions,
                    role: "super_admin (full access)",
                },
            });
        }

        // ════════════════════════════════════════════
        //  DATABASE — Generic CRUD
        // ════════════════════════════════════════════

        // ── db.select ──
        if (action === "db.select") {
            const table = payload.table as string;
            if (!table || !isAllowedTable(table)) {
                return err(400, `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}`);
            }

            const columns = payload.columns || "*";
            const limit = Math.min(payload.limit || 500, 1000);
            const orderBy = payload.order_by || "created_at";
            const ascending = payload.ascending ?? false;
            const filters: Record<string, any> = payload.filters || {};

            let q = supabase.from(table).select(columns, { count: "exact" });

            // Apply filters
            for (const [col, val] of Object.entries(filters)) {
                if (val === null) {
                    q = q.is(col, null);
                } else if (typeof val === "object" && val !== null) {
                    // Support operators: { column: { op: "ilike", value: "%term%" } }
                    const op = val.op as string;
                    const v = val.value;
                    if (op === "ilike") q = q.ilike(col, v);
                    else if (op === "gt") q = q.gt(col, v);
                    else if (op === "gte") q = q.gte(col, v);
                    else if (op === "lt") q = q.lt(col, v);
                    else if (op === "lte") q = q.lte(col, v);
                    else if (op === "neq") q = q.neq(col, v);
                    else if (op === "in") q = q.in(col, v);
                    else if (op === "contains") q = q.contains(col, v);
                    else q = q.eq(col, v);
                } else {
                    q = q.eq(col, val);
                }
            }

            q = q.order(orderBy, { ascending }).limit(limit);

            const { data, error, count } = await q;
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: data || [], count });
        }

        // ── db.insert ──
        if (action === "db.insert") {
            const table = payload.table as string;
            if (!table || !isAllowedTable(table)) {
                return err(400, `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}`);
            }

            const rows = payload.rows;
            if (!Array.isArray(rows) || rows.length === 0) {
                return err(400, "payload.rows[] required (non-empty array)");
            }

            const { data, error } = await supabase.from(table).insert(rows).select("*");
            if (error) return err(500, error.message);
            return res(200, { ok: true, data });
        }

        // ── db.update ──
        if (action === "db.update") {
            const table = payload.table as string;
            if (!table || !isAllowedTable(table)) {
                return err(400, `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}`);
            }

            const patch = payload.patch;
            const id = payload.id;
            const filters: Record<string, any> = payload.filters || {};

            if (!patch) return err(400, "payload.patch required");
            if (!id && Object.keys(filters).length === 0) {
                return err(400, "payload.id or payload.filters required");
            }

            let q = supabase.from(table).update(patch);

            if (id) {
                q = q.eq("id", id);
            }
            for (const [col, val] of Object.entries(filters)) {
                q = q.eq(col, val);
            }

            const { data, error } = await q.select("*");
            if (error) return err(500, error.message);
            return res(200, { ok: true, data });
        }

        // ── db.delete ──
        if (action === "db.delete") {
            const table = payload.table as string;
            if (!table || !isAllowedTable(table)) {
                return err(400, `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}`);
            }

            const id = payload.id;
            const filters: Record<string, any> = payload.filters || {};

            if (!id && Object.keys(filters).length === 0) {
                return err(400, "payload.id or payload.filters required (safety: cannot delete without filter)");
            }

            let q = supabase.from(table).delete();

            if (id) {
                q = q.eq("id", id);
            }
            for (const [col, val] of Object.entries(filters)) {
                q = q.eq(col, val);
            }

            const { data, error } = await q.select("*");
            if (error) return err(500, error.message);
            return res(200, { ok: true, data });
        }

        // ── db.upsert ──
        if (action === "db.upsert") {
            const table = payload.table as string;
            if (!table || !isAllowedTable(table)) {
                return err(400, `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}`);
            }

            const rows = payload.rows;
            if (!Array.isArray(rows) || rows.length === 0) {
                return err(400, "payload.rows[] required (non-empty array)");
            }

            const onConflict = payload.on_conflict || "id";
            const { data, error } = await supabase
                .from(table)
                .upsert(rows, { onConflict })
                .select("*");
            if (error) return err(500, error.message);
            return res(200, { ok: true, data });
        }

        // ── db.rpc ── (call Supabase database functions)
        if (action === "db.rpc") {
            const fn = payload.function_name as string;
            const args = payload.args || {};

            if (!fn) return err(400, "payload.function_name required");

            const { data, error } = await supabase.rpc(fn, args);
            if (error) return err(500, error.message);
            return res(200, { ok: true, data });
        }

        // ════════════════════════════════════════════
        //  DOMAIN — Convenience shortcuts
        // ════════════════════════════════════════════

        // ── clients.list ──
        if (action === "clients.list") {
            const state = payload.state;
            let q = supabase.from("clients").select("*").order("organization", { ascending: true }).limit(500);
            if (state) q = q.eq("status", state);
            const { data, error } = await q;
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: data || [] });
        }

        // ── clients.countActive ──
        if (action === "clients.countActive") {
            const { count, error } = await supabase
                .from("clients")
                .select("*", { count: "exact", head: true })
                .eq("status", payload.status || "Active");
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: { active_clients: count || 0 } });
        }

        // ── requests.list ──
        if (action === "requests.list") {
            let q = supabase
                .from("requests")
                .select("*, client:client_id(id, name, organization, email)")
                .order("created_at", { ascending: false })
                .limit(payload.limit || 500);

            if (payload.status) q = q.eq("status", payload.status);
            if (payload.client_id) q = q.eq("client_id", payload.client_id);
            if (payload.assigned_to) q = q.eq("assigned_to", payload.assigned_to);

            const { data, error } = await q;
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: data || [] });
        }

        // ── tasks.list ──
        if (action === "tasks.list") {
            let q = supabase
                .from("tasks")
                .select("*, assignee:assigned_to(id, full_name), creator:created_by(id, full_name), request_links:task_request_links(request:request_id(id, title))")
                .order("created_at", { ascending: false })
                .limit(payload.limit || 500);

            if (payload.status) q = q.eq("status", payload.status);
            if (payload.assigned_to) q = q.eq("assigned_to", payload.assigned_to);

            const { data, error } = await q;
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: data || [] });
        }

        // ════════════════════════════════════════════
        //  GOOGLE DRIVE
        // ════════════════════════════════════════════

        // ── google.ping ──
        if (action === "google.ping") {
            try {
                const rootId = await getRootFolderId();
                const result = await validateFolderAccess(rootId);
                return res(200, {
                    ok: true,
                    data: {
                        connected: result.valid,
                        root_folder_id: rootId,
                        root_folder_name: result.folderName || null,
                        error: result.error || null,
                    },
                });
            } catch (e: any) {
                return res(200, {
                    ok: true,
                    data: { connected: false, error: e.message },
                });
            }
        }

        // ── drive.listRoot ──
        if (action === "drive.listRoot") {
            const rootId = await getRootFolderId();
            const items = await listSubFolders(rootId);
            return res(200, {
                ok: true,
                data: { root_folder_id: rootId, folders: items },
            });
        }

        // ── drive.listFolder ──
        if (action === "drive.listFolder") {
            const folderId = payload.folder_id as string;
            if (!folderId) return err(400, "payload.folder_id required");

            const items = await listFolderContents(folderId);
            return res(200, { ok: true, data: { folder_id: folderId, items } });
        }

        // ── drive.createFolder ──
        if (action === "drive.createFolder") {
            const parentId = payload.parent_id as string;
            const name = payload.name as string;
            if (!parentId || !name) return err(400, "payload.parent_id and payload.name required");

            // Check if folder already exists
            const existing = await findFolder(parentId, name);
            if (existing) {
                return res(200, { ok: true, data: { folder_id: existing, already_existed: true } });
            }

            const newId = await createFolder(parentId, name);
            return res(200, { ok: true, data: { folder_id: newId, already_existed: false } });
        }

        // ── drive.uploadText ──
        if (action === "drive.uploadText") {
            const folderId = payload.folder_id as string;
            const fileName = payload.file_name as string;
            const content = payload.content as string;
            if (!folderId || !fileName || content === undefined) {
                return err(400, "payload.folder_id, payload.file_name, and payload.content required");
            }

            const buffer = Buffer.from(content, "utf-8");
            const result = await uploadFileToDrive(folderId, fileName, buffer, "text/plain");
            return res(200, { ok: true, data: result });
        }

        // ════════════════════════════════════════════
        //  AUTH — Supabase Auth Admin (super_admin)
        // ════════════════════════════════════════════

        // ── auth.listUsers ──
        if (action === "auth.listUsers") {
            const page = payload.page || 1;
            const perPage = Math.min(payload.per_page || 50, 1000);
            const { data, error } = await supabase.auth.admin.listUsers({
                page,
                perPage,
            });
            if (error) return err(500, error.message);
            return res(200, {
                ok: true,
                data: (data.users || []).map((u) => ({
                    id: u.id,
                    email: u.email,
                    phone: u.phone,
                    created_at: u.created_at,
                    last_sign_in_at: u.last_sign_in_at,
                    email_confirmed_at: u.email_confirmed_at,
                    user_metadata: u.user_metadata,
                    app_metadata: u.app_metadata,
                })),
                count: data.users?.length || 0,
            });
        }

        // ── auth.getUser ──
        if (action === "auth.getUser") {
            const uid = payload.id as string;
            if (!uid) return err(400, "payload.id required");
            const { data, error } = await supabase.auth.admin.getUserById(uid);
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: data.user });
        }

        // ── auth.createUser ──
        if (action === "auth.createUser") {
            const { email, password, user_metadata, email_confirm } = payload;
            if (!email || !password) return err(400, "payload.email and payload.password required");
            const { data, error } = await supabase.auth.admin.createUser({
                email,
                password,
                user_metadata: user_metadata || {},
                email_confirm: email_confirm ?? true,
            });
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: data.user });
        }

        // ── auth.updateUser ──
        if (action === "auth.updateUser") {
            const uid = payload.id as string;
            if (!uid) return err(400, "payload.id required");
            const updates: Record<string, any> = {};
            if (payload.email) updates.email = payload.email;
            if (payload.password) updates.password = payload.password;
            if (payload.user_metadata) updates.user_metadata = payload.user_metadata;
            if (payload.app_metadata) updates.app_metadata = payload.app_metadata;
            if (payload.email_confirm !== undefined) updates.email_confirm = payload.email_confirm;

            const { data, error } = await supabase.auth.admin.updateUserById(uid, updates);
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: data.user });
        }

        // ── auth.deleteUser ──
        if (action === "auth.deleteUser") {
            const uid = payload.id as string;
            if (!uid) return err(400, "payload.id required");
            const { error } = await supabase.auth.admin.deleteUser(uid);
            if (error) return err(500, error.message);
            return res(200, { ok: true, data: { deleted: uid } });
        }

        // ════════════════════════════════════════════
        //  GOOGLE DRIVE — Extended (super_admin)
        // ════════════════════════════════════════════

        // ── drive.deleteFile ──
        if (action === "drive.deleteFile") {
            const fileId = payload.file_id as string;
            if (!fileId) return err(400, "payload.file_id required");
            await deleteFileFromDrive(fileId);
            return res(200, { ok: true, data: { deleted: fileId } });
        }

        // ── drive.renameFile ──
        if (action === "drive.renameFile") {
            const fileId = payload.file_id as string;
            const newName = payload.new_name as string;
            if (!fileId || !newName) return err(400, "payload.file_id and payload.new_name required");
            await renameFileInDrive(fileId, newName);
            return res(200, { ok: true, data: { renamed: fileId, new_name: newName } });
        }

        // ── drive.deleteFolder ──
        if (action === "drive.deleteFolder") {
            const folderId = payload.folder_id as string;
            if (!folderId) return err(400, "payload.folder_id required");
            await deleteFolderFromDrive(folderId);
            return res(200, { ok: true, data: { deleted: folderId } });
        }

        // ── drive.renameFolder ──
        if (action === "drive.renameFolder") {
            const folderId = payload.folder_id as string;
            const newName = payload.new_name as string;
            if (!folderId || !newName) return err(400, "payload.folder_id and payload.new_name required");
            await renameFolderInDrive(folderId, newName);
            return res(200, { ok: true, data: { renamed: folderId, new_name: newName } });
        }

        // ── drive.ensurePath ── (create full folder hierarchy: Root > Client > Request > subfolder)
        if (action === "drive.ensurePath") {
            const clientName = payload.client_name as string;
            const requestTitle = payload.request_title as string;
            const folder = (payload.folder || "production") as "production" | "distributed";
            const clientFolderId = payload.client_folder_id as string | undefined;
            if (!clientName || !requestTitle) {
                return err(400, "payload.client_name and payload.request_title required");
            }
            const targetId = await ensureFolderPath(clientName, requestTitle, folder, clientFolderId);
            return res(200, { ok: true, data: { folder_id: targetId } });
        }

        // ════════════════════════════════════════════
        //  FALLBACK
        // ════════════════════════════════════════════

        return err(400, `Unknown action: "${action}". Use "schema" to see available actions.`);

    } catch (e: any) {
        console.error("[bot-admin] Unhandled error:", e);
        return res(500, { ok: false, error: e?.message || "Internal error" });
    }
}
