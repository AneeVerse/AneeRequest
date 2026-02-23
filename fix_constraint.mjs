const SUPABASE_URL = 'https://schqmorhdiwcyhyrzlvu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaHFtb3JoZGl3Y3loeXJ6bHZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA2OTY0MCwiZXhwIjoyMDg2NjQ1NjQwfQ.sKPEJBFdcadu0JWG1H_3VNsZfqiqjXEYXCy6HUiJ7yg';
import fs from 'fs';

const testValues = ['Active', 'Inactive', 'Archived', 'Ongoing', 'Leads', 'Closed', 'Archive'];

async function testStatus(status) {
    // Try to insert a test row
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/clients`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ name: '__TEST__', email: `test_${status.toLowerCase()}@test.com`, status: status })
        }
    );

    let result;
    if (res.ok) {
        const data = await res.json();
        // Delete the test row
        await fetch(
            `${SUPABASE_URL}/rest/v1/clients?id=eq.${data[0].id}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
                }
            }
        );
        result = 'ALLOWED';
    } else {
        result = 'BLOCKED';
    }
    return { status, result };
}

async function main() {
    const lines = ['STATUS CONSTRAINT TEST:'];

    for (const s of testValues) {
        const r = await testStatus(s);
        lines.push(`  "${r.status}" => ${r.result}`);
    }

    fs.writeFileSync('db_check.txt', lines.join('\n'), 'utf8');
}

main().catch(e => { fs.writeFileSync('db_check.txt', 'ERR: ' + e.message, 'utf8'); });
