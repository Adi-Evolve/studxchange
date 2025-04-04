// Google API configuration
const GOOGLE_CLIENT_ID = '510030837178-tktmhv1bak3s6c162hfa7qpsh1qmdqmm.apps.googleusercontent.com';
const GOOGLE_API_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Initialize Google API
function initGoogleAPI() {
    return new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
            reject(new Error('Google API not loaded'));
            return;
        }

        gapi.load('client:auth2', async () => {
            try {
                await gapi.client.init({
                    clientId: GOOGLE_CLIENT_ID,
                    scope: GOOGLE_API_SCOPE,
                    plugin_name: 'StudXchange'
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}
