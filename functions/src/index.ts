import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

admin.apps.length ? admin.app() : admin.initializeApp();

const db = admin.firestore();
const cfg = functions.config();

const IYZI = {
  apiKey: cfg?.iyzi?.api_key ?? '',
  secretKey: cfg?.iyzi?.secret_key ?? '',
  baseUrl: cfg?.iyzi?.base_url ?? '',
  callbackUrl: cfg?.iyzi?.callback_url ?? '',
  termsUrl: cfg?.iyzi?.terms_url ?? '',
};

const WEBHOOK_SECRET = cfg?.webhooks?.iyzi_secret ?? '';
const ORDERS_COLLECTION = 'orders';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired';

type CreateLinkRequestBody = {
  productId?: string;
  amount?: number;
  credits?: number;
  description?: string;
};

const ensureIyziConfigured = () => {
  if (!IYZI.apiKey || !IYZI.secretKey || !IYZI.baseUrl) {
    throw new functions.https.HttpsError('failed-precondition', 'Iyzico configuration is missing');
  }
};

const authenticateRequest = async (req: functions.https.Request) => {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new functions.https.HttpsError('unauthenticated', 'Authorization header is missing');
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      name: decoded.name ?? undefined,
    };
  } catch (error) {
    throw new functions.https.HttpsError('unauthenticated', 'Invalid auth token');
  }
};

const sanitizeBaseUrl = (value: string) => value.replace(/\/$/, '');

const mapHttpsErrorToStatus = (error: functions.https.HttpsError) => {
  switch (error.code) {
    case 'unauthenticated':
      return 401;
    case 'permission-denied':
      return 403;
    case 'failed-precondition':
      return 503;
    case 'not-found':
      return 404;
    case 'invalid-argument':
      return 400;
    default:
      return 500;
  }
};

const mapStatus = (incoming?: string): OrderStatus => {
  if (!incoming) return 'pending';
  const status = incoming.toLowerCase();
  if (status === 'success' || status === 'completed' || status === 'paid') {
    return 'paid';
  }
  if (status === 'failure' || status === 'failed' || status === 'canceled') {
    return 'failed';
  }
  if (status === 'expired' || status === 'timeout') {
    return 'expired';
  }
  return 'pending';
};

const callIyziPaymentLink = async (params: {
  orderId: string;
  amount: number;
  credits: number;
  description: string;
  email?: string;
}) => {
  const random = randomBytes(8).toString('hex');
  const payload = {
    locale: 'tr',
    conversationId: params.orderId,
    name: params.description,
    description: params.description,
    price: params.amount.toFixed(2),
    currencyCode: 'TRY',
    installmentRequested: false,
    callbackUrl: IYZI.callbackUrl || undefined,
    termsUrl: IYZI.termsUrl || undefined,
    email: params.email || undefined,
  };
  const body = JSON.stringify(payload);
  const signature = createHmac('sha1', IYZI.secretKey).update(`${IYZI.apiKey}${random}${body}`, 'utf8').digest('base64');
  const endpoint = `${sanitizeBaseUrl(IYZI.baseUrl)}/paymentLinks`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `IYZWS ${IYZI.apiKey}:${signature}`,
      'x-iyzi-rnd': random,
    },
    body,
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Iyzi API returned invalid JSON: ${text}`);
  }

  if (!response.ok || (data.status && data.status.toLowerCase() !== 'success')) {
    const message = data.errorMessage || data.errorCode || text || 'Iyzi API error';
    throw new Error(message);
  }

  const url: string | undefined = data.paymentLinkUrl || data.url || data.shortUrl;
  if (!url) {
    throw new Error('Iyzi API response does not include payment link url');
  }

  return {
    url,
    token: data.token || data.paymentLinkId || data.referenceCode,
    raw: data,
  };
};

const verifyWebhookSignature = (req: functions.https.Request) => {
  if (!WEBHOOK_SECRET) return;
  const provided = req.get('x-iyzi-signature');
  if (!provided) {
    throw new functions.https.HttpsError('permission-denied', 'Webhook signature header missing');
  }
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(req.rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid webhook signature');
  }
};

export const createPaymentLink = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  let orderRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | null = null;

  try {
    const user = await authenticateRequest(req);
    const { productId, amount, credits, description }: CreateLinkRequestBody = req.body ?? {};

    if (!productId || typeof productId !== 'string') {
      res.status(400).json({ error: 'productId is required' });
      return;
    }
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number' });
      return;
    }
    if (typeof credits !== 'number' || credits <= 0) {
      res.status(400).json({ error: 'credits must be a positive number' });
      return;
    }

    ensureIyziConfigured();

    orderRef = db.collection(ORDERS_COLLECTION).doc();
    await orderRef.set({
      orderId: orderRef.id,
      userId: user.uid,
      userEmail: user.email ?? null,
      productId,
      amount,
      credits,
      currency: 'TRY',
      description: description ?? '',
      provider: 'iyzico-link',
      status: 'pending' as OrderStatus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const linkLabel = description ?? `Kredi paketi (${credits})`;
    const iyziResponse = await callIyziPaymentLink({
      orderId: orderRef.id,
      amount,
      credits,
      description: linkLabel,
      email: user.email,
    });

    await orderRef.update({
      paymentLinkUrl: iyziResponse.url,
      iyziToken: iyziResponse.token ?? null,
      iyziRaw: iyziResponse.raw ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ paymentLinkUrl: iyziResponse.url, orderId: orderRef.id });
  } catch (error) {
    console.error('createPaymentLink failed', error);
    if (orderRef) {
      await orderRef.update({
        iyziError: (error as Error).message ?? 'unknown error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => undefined);
    }

    if (error instanceof functions.https.HttpsError) {
      res.status(mapHttpsErrorToStatus(error)).json({ error: error.message });
      return;
    }

    res.status(503).json({ error: (error as Error).message || 'Payment link creation failed' });
  }
});

export const iyzicoWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    verifyWebhookSignature(req);
    const body = req.body || {};
    const orderId: string | undefined = body.orderId || body.conversationId || body.referenceCode || body.token;
    if (!orderId) {
      res.status(400).json({ error: 'orderId missing' });
      return;
    }

    const normalizedStatus = mapStatus(body.paymentStatus || body.status);
    const paidPrice = typeof body.paidPrice === 'string' ? Number(body.paidPrice) : body.paidPrice;

    await db.runTransaction(async (tx) => {
      const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);
      const snap = await tx.get(orderRef);
      if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found');
      }

      const orderData = snap.data() as { status?: OrderStatus; credits: number; userId?: string };
      if (!orderData.userId) {
        throw new functions.https.HttpsError('failed-precondition', 'Order is missing user reference');
      }

      if (orderData.status === 'paid') {
        return;
      }

      tx.update(orderRef, {
        status: normalizedStatus,
        paymentId: body.paymentId ?? null,
        paidPrice: paidPrice ?? null,
        providerPayload: body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (normalizedStatus === 'paid') {
        const userRef = db.collection('users').doc(orderData.userId);
        const userSnap = await tx.get(userRef);
        const beforeCredits = userSnap.exists ? Number(userSnap.get('aiCredits') ?? 0) : 0;
        const afterCredits = beforeCredits + Number(orderData.credits ?? 0);

        tx.set(userRef, { aiCredits: afterCredits }, { merge: true });

        const logRef = userRef.collection('creditTransactions').doc();
        tx.set(logRef, {
          type: 'purchase',
          amount: Number(orderData.credits ?? 0),
          before: beforeCredits,
          after: afterCredits,
          metadata: {
            orderId,
            provider: 'iyzico-link',
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('iyzicoWebhook error', error);
    if (error instanceof functions.https.HttpsError) {
      res.status(mapHttpsErrorToStatus(error)).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: (error as Error).message || 'Webhook processing failed' });
  }
});

export const getOrderStatus = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const segments = req.path.split('/').filter(Boolean);
  const orderId = segments[segments.length - 1];
  if (!orderId) {
    res.status(400).json({ error: 'orderId missing' });
    return;
  }

  try {
    const snap = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const data = snap.data() as { status?: OrderStatus };
    res.json({ status: data.status ?? 'pending' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Unable to fetch order status' });
  }
});
