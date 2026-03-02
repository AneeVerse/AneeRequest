
const { google } = require('googleapis');

// The service account key from environment variables
const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

async function testServiceAccount() {
    try {
        console.log('Testing Service Account authentication...');
        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccountKey,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        const drive = google.drive({ version: 'v3', auth });

        // Try to list files (just to check auth)
        const res = await drive.files.list({ pageSize: 1 });
        console.log('Success! Service Account authenticated.');
        console.log('Folder list success.');
    } catch (error) {
        console.error('Service Account Error:', error.message);
    }
}

testServiceAccount();
