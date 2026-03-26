import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

export const runtime = "nodejs";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
) as any;

function res(status: number, body: any) {
    return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get("x-bot-token");
        if (!token || token !== process.env.BOT_ADMIN_TOKEN) {
            return res(401, { ok: false, error: "Unauthorized" });
        }

        const body = await req.json();
        const action = body?.action;
        const payload = body?.payload || {};

        if (!action) return res(400, { ok: false, error: "Missing action" });

        // --- Core Actions ---
        if (action === "ping") {
            return res(200, { ok: true, data: { pong: true, ts: new Date().toISOString() } });
        }

        if (action === "clients.countActive") {
            const table = payload.table || "clients";
            const stateColumn = payload.stateColumn || "state";
            const activeValue = payload.activeValue || "Ongoing";

            const { count, error } = await supabase
                .from(table)
                .select("*", { count: "exact", head: true })
                .eq(stateColumn, activeValue);

            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data: { active_clients: count || 0 } });
        }

        if (action === "clients.list") {
            const table = payload.table || "clients";
            const state = payload.state;

            let q = supabase.from(table).select("*").limit(500);
            if (state) q = q.eq("state", state);

            const { data, error } = await q;
            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data: data || [] });
        }

        // --- DB Actions ---
        if (action === "db.select") {
            const table = payload.table;
            const columns = payload.columns || "*";
            const where = payload.where || [];
            const limit = Math.min(Number(payload.limit || 500), 2000);

            if (!table) return res(400, { ok: false, error: "payload.table required" });

            let q = supabase.from(table).select(columns).limit(limit);

            for (const w of where) {
                const { col, op, val } = w || {};
                if (!col || !op) continue;

                if (op === "eq") q = q.eq(col, val);
                else if (op === "neq") q = q.neq(col, val);
                else if (op === "gt") q = q.gt(col, val);
                else if (op === "gte") q = q.gte(col, val);
                else if (op === "lt") q = q.lt(col, val);
                else if (op === "lte") q = q.lte(col, val);
                else if (op === "ilike") q = q.ilike(col, val);
                else if (op === "in") q = q.in(col, val);
            }

            const { data, error } = await q;
            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data: data || [] });
        }

        if (action === "db.insert") {
            const table = payload.table;
            const rows = payload.rows;
            if (!table || !Array.isArray(rows) || rows.length === 0) {
                return res(400, { ok: false, error: "payload.table and payload.rows[] required" });
            }

            const { data, error } = await supabase.from(table).insert(rows).select("*");
            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data });
        }

        if (action === "db.update") {
            const table = payload.table;
            const patch = payload.patch;
            const id = payload.id;
            if (!table || !patch || !id) {
                return res(400, { ok: false, error: "payload.table, payload.id, payload.patch required" });
            }

            const { data, error } = await supabase.from(table).update(patch).eq("id", id).select("*");
            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data });
        }

        if (action === "db.delete") {
            const table = payload.table;
            const id = payload.id;
            if (!table || !id) return res(400, { ok: false, error: "payload.table and payload.id required" });

            const { data, error } = await supabase.from(table).delete().eq("id", id).select("*");
            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data });
        }

        // --- Google Services ---
        if (action === "google.ping") {
            const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
            const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

            if (!clientId || !clientSecret || !refreshToken) {
                return res(500, { ok: false, error: "Missing Google OAuth env vars" });
            }

            const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
            oauth2.setCredentials({ refresh_token: refreshToken });

            const tokenResp = await oauth2.getAccessToken();
            if (!tokenResp.token) return res(500, { ok: false, error: "Could not refresh access token" });

            return res(200, { ok: true, data: { google_auth: "ok" } });
        }

        if (action === "drive.listRoot") {
            const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
            const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
            const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";

            if (!clientId || !clientSecret || !refreshToken) {
                return res(500, { ok: false, error: "Missing Google OAuth env vars" });
            }

            const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
            oauth2.setCredentials({ refresh_token: refreshToken });

            const drive = google.drive({ version: "v3", auth: oauth2 });

            const q = `'${rootFolderId}' in parents and trashed = false`;
            const out = await drive.files.list({
                q,
                pageSize: 20,
                fields: "files(id,name,mimeType,modifiedTime)",
                orderBy: "modifiedTime desc",
            });

            return res(200, { ok: true, data: out.data.files || [] });
        }

        return res(400, { ok: false, error: "Unknown action" });
    } catch (e: any) {
        return res(500, { ok: false, error: e?.message || "Internal error" });
    }
}