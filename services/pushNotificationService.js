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

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(serviceAccount))
            });
            firebaseInitialized = true;
            console.log('✅ Firebase Admin SDK initialized');
        } else {
            console.warn('⚠️  Firebase service account key not found. Push notifications will not work.');
            console.warn('   Add FIREBASE_SERVICE_ACCOUNT_KEY to your .env file');
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

        // For calls, we use a data-only message on Android to ensure the app's
        // onMessageReceived handler is always triggered, even in background.
        // This allows the app to show its custom incoming call UI.
        const message = {
            token: fcmToken,
            data: {
                type: 'incoming_call',
                callId,
                callerId,
                callerName,
                callerProfilePic: callerProfilePic || '',
                callType,
                timestamp: Date.now().toString(),
                // Add title and body here so they can be used by the client
                title: `${callType === 'video' ? '📹' : '📞'} Incoming ${callType} call`,
                body: `${callerName} is calling you...`,
                isVideo: (callType === 'video').toString()
            },
            android: {
                priority: 'high',
                // notification block is removed for Android to make it a "data-only" message
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: `${callType === 'video' ? '📹' : '📞'} Incoming ${callType} call`,
                            body: `${callerName} is calling you...`,
                        },
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
        console.error('❌ Failed to send call notification:', error.message);
        return null; // non-critical — never crash the caller
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
        console.error('❌ Failed to send missed call notification:', error.message);
        return null;
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
        console.error('❌ Failed to send call ended notification:', error.message);
        return null;
    }
};

/**
 * Send a message notification to a user
 * @param {string} fcmToken - User's FCM device token
 * @param {object} messageData - Message information
 * @returns {Promise<void>}
 */
const sendMessageNotification = async (fcmToken, messageData) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Skipping notification.');
        return;
    }

    try {
        const { senderId, senderName, messageText, conversationId, doctorId, patientId } = messageData;

        const message = {
            token: fcmToken,
            notification: {
                title: `💬 New message from ${senderName}`,
                body: messageText.substring(0, 100),
            },
            data: {
                type: 'message',
                senderId,
                senderName,
                conversationId: conversationId || `${doctorId}_${patientId}`,
                doctorId: doctorId || '',
                patientId: patientId || '',
                timestamp: Date.now().toString()
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'messages',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    tag: conversationId || `${doctorId}_${patientId}`
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        category: 'MESSAGE'
                    }
                }
            },
            webpush: {
                notification: {
                    vibrate: [200, 100, 200],
                    icon: '/favicon.ico'
                },
                fcmOptions: {
                    link: '/chat'
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Message notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('❌ Failed to send message notification:', error.message);
        return null; // non-critical — message was already saved, don't 500
    }
};

/**
 * Send announcement notification to multiple users
 * @param {Array<string>} fcmTokens - Array of FCM device tokens
 * @param {object} announcementData - Announcement information
 * @returns {Promise<object>} - Success/failure statistics
 */
const sendAnnouncementNotification = async (fcmTokens, announcementData) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Skipping announcement notifications.');
        return { successCount: 0, failureCount: 0 };
    }

    if (!fcmTokens || fcmTokens.length === 0) {
        console.warn('No FCM tokens provided for announcement notification.');
        return { successCount: 0, failureCount: 0 };
    }

    try {
        const { title, message, priority = 'medium', announcementId } = announcementData;

        // Determine notification styling based on priority
        const priorityConfig = {
            urgent: { color: '#EF4444', channelId: 'announcements_urgent' },
            high: { color: '#F59E0B', channelId: 'announcements_high' },
            medium: { color: '#3B82F6', channelId: 'announcements' },
            low: { color: '#6B7280', channelId: 'announcements' }
        };

        const config = priorityConfig[priority] || priorityConfig.medium;

        // Prepare multicast message
        const multicastMessage = {
            tokens: fcmTokens,
            notification: {
                title: `📢 ${title}`,
                body: message.substring(0, 200), // Limit body length
            },
            data: {
                type: 'announcement',
                announcementId: announcementId || '',
                priority: priority,
                timestamp: Date.now().toString()
            },
            android: {
                priority: priority === 'urgent' || priority === 'high' ? 'high' : 'normal',
                notification: {
                    channelId: config.channelId,
                    priority: priority === 'urgent' ? 'max' : 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    color: config.color,
                    tag: announcementId || 'announcement'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        category: 'ANNOUNCEMENT',
                        'thread-id': 'announcements'
                    }
                }
            },
            webpush: {
                notification: {
                    vibrate: [200, 100, 200],
                    icon: '/favicon.ico'
                },
                fcmOptions: {
                    link: '/dashboard'
                }
            }
        };

        // Send multicast notification
        const response = await admin.messaging().sendEachForMulticast(multicastMessage);

        console.log(`✅ Announcement notifications sent: ${response.successCount} succeeded, ${response.failureCount} failed`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`❌ Failed to send to token ${idx}:`, resp.error);
                }
            });
        }

        return {
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    } catch (error) {
        console.error('❌ Failed to send announcement notifications:', error);
        throw error;
    }
};

/**
 * Send a generic system notification
 * @param {string} fcmToken - User's FCM device token
 * @param {object} sysData - System event details
 */
const sendSystemNotification = async (fcmToken, sysData) => {
    if (!firebaseInitialized || !fcmToken) return;

    try {
        const { title, body, action, referenceId } = sysData;
        const message = {
            token: fcmToken,
            notification: {
                title: title,
                body: body.substring(0, 100),
            },
            data: {
                type: 'system_alert',
                action: action || '',
                referenceId: referenceId || '',
                timestamp: Date.now().toString()
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'system_alerts',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    tag: referenceId || 'sys'
                }
            },
            apns: {
                payload: {
                    aps: { sound: 'default', badge: 1, category: 'SYSTEM' }
                }
            },
            webpush: {
                notification: { vibrate: [200, 100, 200], icon: '/favicon.ico' },
                fcmOptions: { link: '/dashboard' }
            }
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ System notification [${title}] sent successfully`);
        return response;
    } catch (e) {
        console.error('❌ Failed to send system notification:', e.message);
        return null;
    }
};

module.exports = {
    sendCallNotification,
    sendMissedCallNotification,
    sendCallEndedNotification,
    sendMessageNotification,
    sendAnnouncementNotification,
    sendSystemNotification
};
