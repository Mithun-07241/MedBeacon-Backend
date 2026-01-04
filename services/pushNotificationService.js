const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// NOTE: You need to add your Firebase service account key to .env
// Download it from Firebase Console > Project Settings > Service Accounts
let firebaseInitialized = false;

const initializeFirebase = () => {
    if (firebaseInitialized) return;

    try {
        // Check if service account key is provided
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccount || serviceAccount.trim() === '' || serviceAccount === 'YOUR_SERVICE_ACCOUNT_KEY') {
            console.warn('⚠️  Firebase service account key not found. Push notifications will not work.');
            console.warn('   Add FIREBASE_SERVICE_ACCOUNT_KEY to your .env file');
            return;
        }

        try {
            const parsedKey = JSON.parse(serviceAccount);
            admin.initializeApp({
                credential: admin.credential.cert(parsedKey)
            });
            firebaseInitialized = true;
            console.log('✅ Firebase Admin SDK initialized');
        } catch (parseError) {
            console.error('❌ Failed to parse Firebase service account key:', parseError.message);
            console.warn('   Make sure the JSON is valid and on a single line');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error.message);
    }
};

// Initialize on module load
initializeFirebase();

/**
 * Send a call notification to a user
 * @param {string} fcmToken - User's FCM device token
 * @param {object} callData - Call information
 * @returns {Promise<void>}
 */
const sendCallNotification = async (fcmToken, callData) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Skipping notification.');
        return;
    }

    try {
        const { callId, callerId, callerName, callerProfilePic, callType } = callData;

        const message = {
            token: fcmToken,
            notification: {
                title: `${callType === 'video' ? '📹' : '📞'} Incoming ${callType} call`,
                body: `${callerName} is calling you...`,
            },
            data: {
                type: 'incoming_call',
                callId,
                callerId,
                callerName,
                callerProfilePic: callerProfilePic || '',
                callType,
                timestamp: Date.now().toString()
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'calls',
                    priority: 'max',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    tag: callId,
                    sticky: true
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        category: 'CALL'
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Call notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send call notification:', error);
        throw error;
    }
};

/**
 * Send a missed call notification
 * @param {string} fcmToken - User's FCM device token
 * @param {object} callData - Call information
 * @returns {Promise<void>}
 */
const sendMissedCallNotification = async (fcmToken, callData) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Skipping notification.');
        return;
    }

    try {
        const { callerName, callType } = callData;

        const message = {
            token: fcmToken,
            notification: {
                title: 'Missed Call',
                body: `You missed a ${callType} call from ${callerName}`,
            },
            data: {
                type: 'missed_call',
                ...callData
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Missed call notification sent:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send missed call notification:', error);
        throw error;
    }
};

/**
 * Send a call ended notification
 * @param {string} fcmToken - User's FCM device token
 * @param {object} callData - Call information
 * @returns {Promise<void>}
 */
const sendCallEndedNotification = async (fcmToken, callData) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Skipping notification.');
        return;
    }

    try {
        const { callId } = callData;

        const message = {
            token: fcmToken,
            data: {
                type: 'call_ended',
                callId
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Call ended notification sent:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send call ended notification:', error);
        throw error;
    }
};

module.exports = {
    sendCallNotification,
    sendMissedCallNotification,
    sendCallEndedNotification
};
