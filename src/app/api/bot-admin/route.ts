import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

        if (action === "ping") {
            return res(200, { ok: true, data: { pong: true, ts: new Date().toISOString() } });
        }

        if (action === "clients.countActive") {
            const table = payload.table || "clients";
            const stateColumn = payload.stateColumn || "state";
            const activeValue = payload.activeValue || "Ongoing";

            const { count, error } = await supabase
                .from(table as any)
                .select("*", { count: "exact", head: true })
                .eq(stateColumn, activeValue);

            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data: { active_clients: count || 0 } });
        }

        if (action === "clients.list") {
            const table = payload.table || "clients";
            const state = payload.state;

            let q = supabase.from(table as any).select("*").limit(500);
            if (state) q = q.eq("state", state);

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

            const { data, error } = await supabase.from(table as any).insert(rows).select("*");
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

            const { data, error } = await supabase
                .from(table as any)
                .update(patch)
                .eq("id", id)
                .select("*");

            if (error) return res(500, { ok: false, error: error.message });
            return res(200, { ok: true, data });
        }

        return res(400, { ok: false, error: "Unknown action" });
    } catch (e: any) {
        return res(500, { ok: false, error: e?.message || "Internal error" });
    }
}
