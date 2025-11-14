import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Daily subscription renewal check
 * Runs every day at 02:00 AM Turkey time
 */
export const dailySubscriptionCheck = functions
    .region('europe-west1')
    .pubsub
    .schedule('0 2 * * *')
    .timeZone('Europe/Istanbul')
    .onRun(async (context) => {
        console.log('Starting daily subscription check...');
        
        const now = admin.firestore.Timestamp.now();
        const subscriptionsRef = db.collection('subscriptions');
        
        // Get all active or cancelled subscriptions that need renewal
        const snapshot = await subscriptionsRef
            .where('status', 'in', ['active', 'cancelled'])
            .where('nextBillingDate', '<=', now)
            .get();

        console.log(`Found ${snapshot.size} subscriptions to process`);

        const results = {
            renewed: 0,
            expired: 0,
            failed: 0,
        };

        for (const doc of snapshot.docs) {
            const subscriptionId = doc.id;
            const subscription = doc.data();

            try {
                if (subscription.cancelAtPeriodEnd) {
                    // Mark as expired
                    await expireSubscription(subscriptionId, subscription.userId);
                    results.expired++;
                    console.log(`Subscription ${subscriptionId} expired`);
                } else {
                    // Attempt renewal
                    // TODO: Integrate payment gateway here (Stripe, iyzico, etc.)
                    // For now, we'll auto-renew assuming payment succeeds
                    await renewSubscription(subscriptionId, subscription);
                    results.renewed++;
                    console.log(`Subscription ${subscriptionId} renewed`);
                }
            } catch (error) {
                console.error(`Failed to process subscription ${subscriptionId}:`, error);
                await markSubscriptionPastDue(subscriptionId);
                results.failed++;
            }
        }

        console.log('Subscription check complete:', results);
        return results;
    });

/**
 * Renews a subscription and grants credits
 */
async function renewSubscription(subscriptionId: string, subscription: any): Promise<void> {
    const batch = db.batch();

    // Calculate next billing date (1 month from now)
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Update subscription
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    batch.update(subscriptionRef, {
        currentPeriodStart: admin.firestore.FieldValue.serverTimestamp(),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(nextMonth),
        nextBillingDate: admin.firestore.Timestamp.fromDate(nextMonth),
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        failedPaymentAttempts: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Grant credits to user
    const userRef = db.collection('users').doc(subscription.userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
        const userData = userDoc.data();
        const currentCredits = userData?.aiCredits || 0;
        const newCredits = currentCredits + subscription.creditsPerPeriod;

        batch.update(userRef, {
            aiCredits: newCredits,
        });

        // Log credit transaction
        const transactionRef = userRef.collection('creditTransactions').doc();
        batch.set(transactionRef, {
            type: 'subscription_renewal',
            amount: subscription.creditsPerPeriod,
            before: currentCredits,
            after: newCredits,
            metadata: {
                subscriptionId,
                planId: subscription.planId,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();
}

/**
 * Expires a subscription and removes Pro access
 */
async function expireSubscription(subscriptionId: string, userId: string): Promise<void> {
    const batch = db.batch();

    // Update subscription status
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    batch.update(subscriptionRef, {
        status: 'expired',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Remove Pro access from user
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
        creditPlan: 'free',
        'entitlements.examGenerator': false,
    });

    await batch.commit();
}

/**
 * Marks subscription as past due after payment failure
 */
async function markSubscriptionPastDue(subscriptionId: string): Promise<void> {
    const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
    const doc = await subscriptionRef.get();
    
    if (!doc.exists) return;

    const subscription = doc.data();
    if (!subscription) return;
    
    const failedAttempts = (subscription.failedPaymentAttempts || 0) + 1;
    const updates: any = {
        status: 'past_due',
        failedPaymentAttempts: failedAttempts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // If too many failures, expire the subscription
    if (failedAttempts >= 3) {
        updates.status = 'expired';
        updates.cancelAtPeriodEnd = true;

        // Remove Pro access
        const userRef = db.collection('users').doc(subscription.userId);
        await userRef.update({
            creditPlan: 'free',
            'entitlements.examGenerator': false,
        });
    }

    await subscriptionRef.update(updates);
}

/**
 * Webhook handler for İyzico payment notifications
 * This is called by İyzico when payment status changes
 */
export const handlePaymentWebhook = functions
    .region('europe-west1')
    .https
    .onRequest(async (req, res) => {
        // CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, x-iyzico-signature');

        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        try {
            // 1. Verify webhook signature using raw body
            const signature = req.headers['x-iyzico-signature'] as string;
            const rawPayload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
            
            // Import verification function
            const { verifyIyzicoWebhook } = await import('./iyzico');
            const cfg = functions.config();
            const WEBHOOK_SECRET = cfg?.webhooks?.iyzi_secret ?? '';
            
            if (signature && WEBHOOK_SECRET && !verifyIyzicoWebhook(signature, rawPayload, WEBHOOK_SECRET)) {
                console.warn('Invalid webhook signature');
                res.status(401).send({ error: 'Invalid signature' });
                return;
            }

            // 2. Parse webhook event (handle both string and object body)
            let event: any;
            if (typeof req.body === 'string') {
                try {
                    event = JSON.parse(req.body);
                } catch (e) {
                    console.error('Failed to parse webhook body:', e);
                    res.status(400).send({ error: 'Invalid JSON body' });
                    return;
                }
            } else {
                event = req.body;
            }

            // 3. Log full webhook payload for debugging
            console.log('Webhook Content-Type:', req.get('content-type'));
            console.log('Webhook Raw Body Length:', req.rawBody?.length);
            console.log('Webhook Full Event:', JSON.stringify(event, null, 2));
            
            // 4. İyzico Payment Link callback'lerinde genelde token gelir
            let orderId: string | undefined;
            let paymentDetails: any = event;
            
            // Token varsa log et ama artık dinamik status kontrolü yapmıyoruz
            if (event.token) {
                console.log('Token found in webhook:', event.token);
                // Sabit link sisteminde token sadece referans amaçlı kullanılır
                // Gerçek ödeme durumu webhook payload'ında zaten var
            }
            
            // Eğer hala orderId yoksa, diğer alanları kontrol et
            if (!orderId) {
                orderId = 
                    event.conversationId || 
                    event.basketId || 
                    event.orderId || 
                    event.paymentConversationId ||
                    event.referenceCode;
            }
            
            // 5. Extract status with ALL possible field names
            const status = (
                paymentDetails.paymentStatus || 
                event.paymentStatus || 
                event.status || 
                event.iyziEventType ||
                event.eventType ||
                event.paymentTransactionStatus ||
                ''
            ).toUpperCase();

            console.log('Webhook Extracted Data:', { 
                status, 
                orderId, 
                token: event.token,
                allEventKeys: Object.keys(event),
                possibleStatusFields: {
                    paymentStatus: paymentDetails.paymentStatus || event.paymentStatus,
                    status: event.status,
                    iyziEventType: event.iyziEventType,
                    eventType: event.eventType,
                    paymentTransactionStatus: event.paymentTransactionStatus
                }
            });

            // Handle case where status is still missing
            if (!status) {
                console.warn('⚠️ No status found in webhook. Logging to unprocessedWebhooks collection');
                const statusMissingData: any = {
                    event,
                    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                    reason: 'No status field found',
                    headers: {
                        contentType: req.get('content-type') || null
                    }
                };
                
                const sig2 = req.get('x-iyzico-signature');
                if (sig2) {
                    statusMissingData.headers.signature = sig2;
                }
                
                await db.collection('unprocessedWebhooks').add(statusMissingData);
                // Try to extract order anyway and mark as pending
                if (orderId) {
                    await db.collection('paymentOrders').doc(orderId).update({
                        lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastWebhookEvent: event,
                        webhookNote: 'Received webhook without status field'
                    });
                }
                res.status(200).send({ received: true, note: 'Status field missing but logged' });
                return;
            }

            if (!orderId) {
                console.error('❌ Missing order ID in webhook event');
                const webhookData: any = {
                    event,
                    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                    reason: 'No order ID field found',
                    headers: {
                        contentType: req.get('content-type') || null
                    }
                };
                
                const sig = req.get('x-iyzico-signature');
                if (sig) {
                    webhookData.headers.signature = sig;
                }
                
                await db.collection('unprocessedWebhooks').add(webhookData);
                res.status(400).send({ error: 'Missing order ID' });
                return;
            }

            // 5. Idempotency check - prevent duplicate processing
            const eventKey = (event.systemTime ? String(event.systemTime) : Date.now()) + '-' + orderId;
            const processedWebhookRef = db.collection('processedWebhooks').doc(eventKey);
            const processedDoc = await processedWebhookRef.get();
            
            if (processedDoc.exists) {
                console.log(`Webhook ${eventKey} already processed, skipping`);
                res.status(200).send({ received: true, duplicate: true });
                return;
            }

            // Mark webhook as processed
            await processedWebhookRef.set({
                orderId,
                status,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                event: event
            });

            // 6. Try to get order from BOTH collections (orders and paymentOrders)
            let orderDoc = await db.collection('paymentOrders').doc(orderId).get();
            let orderCollection = 'paymentOrders';
            
            if (!orderDoc.exists) {
                // Try the other collection
                orderDoc = await db.collection('orders').doc(orderId).get();
                orderCollection = 'orders';
            }
            
            if (!orderDoc.exists) {
                console.error(`❌ Order not found in any collection: ${orderId}`);
                await db.collection('unprocessedWebhooks').add({
                    event,
                    paymentDetails,
                    orderId,
                    receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                    reason: 'Order not found in database'
                });
                res.status(404).send({ error: 'Order not found' });
                return;
            }

            const orderData = orderDoc.data();
            console.log(`✅ Order found in ${orderCollection} collection:`, orderId);
            
            // 7. Handle based on payment status
            switch (status) {
                case 'SUCCESS':
                    await handlePaymentSuccess({
                        orderId,
                        userId: orderData?.userId,
                        productId: orderData?.productId,
                        amount: orderData?.amount,
                        credits: orderData?.credits
                    });
                    break;
                    
                case 'FAILURE':
                    await handlePaymentFailure({
                        orderId,
                        userId: orderData?.userId
                    });
                    break;
                    
                case 'EXPIRED':
                    await handlePaymentExpired({
                        orderId
                    });
                    break;
                    
                case 'INIT_THREEDS':
                case 'CALLBACK_THREEDS':
                    // 3D Secure in progress - keep as pending
                    console.log(`Order ${orderId} - 3D Secure in progress: ${status}`);
                    await db.collection(orderCollection).doc(orderId).update({
                        status: 'pending',
                        paymentStatus: status,
                        paymentDetails: paymentDetails,
                        lastWebhookAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    break;
                    
                default:
                    console.log(`⚠️ Unhandled payment status: ${status} for order ${orderId}`);
                    await db.collection(orderCollection).doc(orderId).update({
                        paymentStatus: status,
                        paymentDetails: paymentDetails,
                        lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastWebhookEvent: event
                    });
                    // Log to unprocessedWebhooks for investigation
                    await db.collection('unprocessedWebhooks').add({
                        event,
                        orderId,
                        status,
                        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                        reason: `Unhandled status: ${status}`
                    });
            }
            
            res.status(200).send({ received: true });
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.status(500).send({ error: 'Webhook processing failed' });
        }
    });

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data: {
    orderId: string;
    userId: string;
    productId: string;
    amount: number;
    credits: number;
}): Promise<void> {
    console.log('Processing payment success:', data);
    
    const { orderId, userId, productId, amount, credits } = data;
    
    if (!orderId || !userId) {
        console.error('Missing required data in payment success');
        return;
    }

    try {
        // 1. Update order status
        await db.collection('paymentOrders').doc(orderId).update({
            status: 'paid',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Check if this is a subscription payment
        if (productId === 'pro-monthly') {
            // Check if user already has a subscription
            const existingSubQuery = await db.collection('subscriptions')
                .where('userId', '==', userId)
                .where('status', 'in', ['active', 'cancelled', 'past_due'])
                .limit(1)
                .get();

            if (!existingSubQuery.empty) {
                // Renew existing subscription
                const subscriptionDoc = existingSubQuery.docs[0];
                await renewSubscription(subscriptionDoc.id, subscriptionDoc.data());
                console.log(`Subscription renewed for user ${userId}`);
            } else {
                // Create new subscription - will be handled by frontend
                // Frontend polls order status and calls createSubscription
                console.log(`New subscription will be created by frontend for user ${userId}`);
            }
        } else {
            // One-time credit purchase
            await db.collection('users').doc(userId).update({
                aiCredits: admin.firestore.FieldValue.increment(credits)
            });
            
            // Log credit transaction
            await db.collection('users').doc(userId)
                .collection('creditTransactions')
                .add({
                    type: 'purchase',
                    amount: credits,
                    metadata: {
                        orderId,
                        productId,
                        amount
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            
            console.log(`Credits added for user ${userId}: ${credits}`);
        }
        
        console.log(`Payment success processed for order ${orderId}`);
    } catch (error) {
        console.error(`Failed to process payment success for order ${orderId}:`, error);
        throw error;
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(data: {
    orderId: string;
    userId?: string;
}): Promise<void> {
    console.log('Processing payment failure:', data);
    
    const { orderId } = data;
    
    if (!orderId) {
        console.error('Missing orderId in payment failure');
        return;
    }

    try {
        // Update order status
        await db.collection('paymentOrders').doc(orderId).update({
            status: 'failed',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // If this was a subscription renewal attempt, mark subscription as past_due
        const orderDoc = await db.collection('paymentOrders').doc(orderId).get();
        const orderData = orderDoc.data();
        
        if (orderData?.subscriptionId) {
            await markSubscriptionPastDue(orderData.subscriptionId);
            console.log(`Subscription ${orderData.subscriptionId} marked as past_due`);
        }
        
        console.log(`Payment failure processed for order ${orderId}`);
    } catch (error) {
        console.error(`Failed to process payment failure for order ${orderId}:`, error);
        throw error;
    }
}

/**
 * Handle expired payment
 */
async function handlePaymentExpired(data: {
    orderId: string;
}): Promise<void> {
    console.log('Processing payment expired:', data);
    
    const { orderId } = data;
    
    if (!orderId) {
        console.error('Missing orderId in payment expired');
        return;
    }

    try {
        // Update order status
        await db.collection('paymentOrders').doc(orderId).update({
            status: 'expired',
            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Payment expired processed for order ${orderId}`);
    } catch (error) {
        console.error(`Failed to process payment expired for order ${orderId}:`, error);
        throw error;
    }
}
