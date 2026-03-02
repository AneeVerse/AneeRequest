
const { google } = require('googleapis');

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

async function testToken() {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
        console.log('Attempting to refresh access token...');
        const { token } = await oauth2Client.getAccessToken();
        console.log('Success! Access token retrieved.');
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testToken();
