import { google } from 'googleapis';
import http from 'http';
import open from 'open';
import url from 'url';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in your environment (e.g., .env.local)');
    process.exit(1);
}
const REDIRECT_URI = 'http://localhost:3939/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Generate the authorization URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent to get a NEW refresh token
    scope: ['https://www.googleapis.com/auth/drive'],
});

console.log('\n============================================');
console.log('  GOOGLE DRIVE REFRESH TOKEN GENERATOR');
console.log('============================================\n');

// Start a temporary local server to catch the callback
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/callback') {
        const code = parsed.query.code;

        if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Error: No authorization code received</h1>');
            return;
        }

        try {
            const { tokens } = await oauth2Client.getToken(code);

            console.log('\n✅ SUCCESS! Here is your new refresh token:\n');
            console.log('─'.repeat(60));
            console.log(tokens.refresh_token);
            console.log('─'.repeat(60));
            console.log('\n📋 Copy the token above and update your .env.local:');
            console.log(`   GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('\n🔄 Then restart your dev server (npm run dev)\n');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <body style="font-family: sans-serif; background: #09090B; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <div style="text-align: center; max-width: 600px;">
                        <h1 style="color: #279da6;">✅ Token Generated!</h1>
                        <p>Check your terminal for the refresh token.</p>
                        <p style="color: #666;">You can close this tab now.</p>
                    </div>
                </body>
                </html>
            `);
        } catch (err) {
            console.error('❌ Error exchanging code:', err.message);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error: ${err.message}</h1>`);
        }

        // Close the server after a short delay
        setTimeout(() => {
            server.close();
            process.exit(0);
        }, 2000);
    }
});

server.listen(3939, () => {
    console.log('🌐 Opening browser for Google authorization...');
    console.log('   If the browser doesn\'t open, visit this URL:\n');
    console.log(`   ${authUrl}\n`);
    open(authUrl);
});
