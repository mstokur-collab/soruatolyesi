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
 * Webhook handler for payment gateway
 * This should be called by your payment processor (Stripe, iyzico, etc.)
 */
export const handlePaymentWebhook = functions
    .region('europe-west1')
    .https
    .onRequest(async (req, res) => {
        // Verify webhook signature
        // TODO: Implement payment gateway signature verification
        
        const event = req.body;
        
        try {
            switch (event.type) {
                case 'payment.succeeded':
                    await handlePaymentSuccess(event.data);
                    break;
                    
                case 'payment.failed':
                    await handlePaymentFailure(event.data);
                    break;
                    
                case 'subscription.cancelled':
                    await handleSubscriptionCancellation(event.data);
                    break;
                    
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
            
            res.status(200).send({ received: true });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).send({ error: 'Webhook processing failed' });
        }
    });

async function handlePaymentSuccess(data: any): Promise<void> {
    console.log('Payment succeeded:', data);
    
    const { subscriptionId, userId } = data;
    
    if (!subscriptionId || !userId) {
        console.error('Missing subscriptionId or userId in payment data');
        return;
    }

    try {
        const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
        const subscriptionDoc = await subscriptionRef.get();
        
        if (!subscriptionDoc.exists) {
            console.error(`Subscription ${subscriptionId} not found`);
            return;
        }

        const subscription = subscriptionDoc.data();
        await renewSubscription(subscriptionId, subscription);
        
        console.log(`Subscription ${subscriptionId} renewed successfully via payment`);
    } catch (error) {
        console.error(`Failed to process payment success for subscription ${subscriptionId}:`, error);
        throw error;
    }
}

async function handlePaymentFailure(data: any): Promise<void> {
    console.log('Payment failed:', data);
    
    const { subscriptionId } = data;
    
    if (!subscriptionId) {
        console.error('Missing subscriptionId in payment failure data');
        return;
    }

    try {
        await markSubscriptionPastDue(subscriptionId);
        console.log(`Subscription ${subscriptionId} marked as past_due`);
    } catch (error) {
        console.error(`Failed to process payment failure for subscription ${subscriptionId}:`, error);
        throw error;
    }
}

async function handleSubscriptionCancellation(data: any): Promise<void> {
    // Implement cancellation logic
    console.log('Subscription cancelled:', data);
}
