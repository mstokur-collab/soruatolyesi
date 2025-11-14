import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHmac, timingSafeEqual } from 'node:crypto';

admin.apps.length ? admin.app() : admin.initializeApp();

const db = admin.firestore();
const cfg = functions.config();
const WEBHOOK_SECRET = cfg?.webhooks?.iyzi_secret ?? '';
const ORDERS_COLLECTION = 'orders';
const PENDING_PAYMENTS_COLLECTION = 'pendingPayments';
const WEBHOOK_PAYMENTS_COLLECTION = 'webhookPayments';
const PROCESSED_PAYMENTS_COLLECTION = 'processedPayments';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired';
type PendingPaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired';

interface PendingPaymentDoc {
  userId: string;
  packageId: string;
  packageName: string;
  packageType?: 'credit' | 'duel-ticket';
  credits?: number;
  tickets?: number;
  priceTRY?: number;
  linkSlug?: string;
  status: PendingPaymentStatus;
  expectedEmail?: string;
  expectedPhone?: string;
  iyziPaymentId?: string | null;
  referenceCode?: string | null;
  referenceCodeNormalized?: string | null;
  processedAt?: FirebaseFirestore.FieldValue;
  processedBy?: string | null;
  completedAt?: FirebaseFirestore.FieldValue;
  context?: string;
}

interface WebhookPaymentDoc {
  iyziPaymentId?: string | null;
  iyziReferenceCode?: string | null;
  referenceCodeNormalized?: string | null;
  status?: string;
  pendingOrderId?: string | null;
  matchedPendingId?: string | null;
  processedAt?: FirebaseFirestore.FieldValue;
  payload?: any;
  receivedAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
  paidPrice?: number | null;
  linkSlug?: string | null;
  candidateEmails?: string[];
  candidatePhones?: string[];
}

interface NormalizedReferenceCode {
  raw: string;
  compact: string;
  normalized: string;
  isNumeric: boolean;
}

interface ProcessPaymentResult {
  success: boolean;
  message: string;
  pendingId: string;
  iyziPaymentId?: string;
  creditsApplied?: number;
  ticketsApplied?: number;
  newBalance?: number;
}

const normalizeReferenceInput = (value?: string | null): NormalizedReferenceCode | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  const compact = raw.replace(/\s+/g, '');
  const normalized = compact.toUpperCase();
  return {
    raw,
    compact,
    normalized,
    isNumeric: /^\d+$/.test(compact),
  };
};

const FALLBACK_MATCH_WINDOW_MS = 1000 * 60 * 360; // 6 saat
const PRICE_MATCH_TOLERANCE = 2; // TL
const EMAIL_FIELDS = [
  'buyerEmail',
  'customerEmail',
  'email',
  'contactEmail',
  'payerEmail',
  'userEmail',
];

const PHONE_FIELDS = [
  'buyerPhone',
  'phoneNumber',
  'gsmNumber',
  'phone',
  'contactPhone',
  'billingPhone',
];
const LINK_CODE_FIELDS = [
  'referenceCode',
  'iyziReferenceCode',
  'iyziLinkCode',
  'hostReferenceCode',
  'linkCode',
  'token',
];

const normalizeEmail = (value?: string | null) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizePhoneValue = (value?: string | null) => {
  if (!value) return '';
  const digits = value.replace(/\D+/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '');
};

const normalizeLinkCode = (value?: string | null) => {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const withoutQuery = trimmed.split('?')[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  const slug = segments.length ? segments[segments.length - 1] : withoutQuery;
  return slug.replace(/[^a-zA-Z0-9_-]/g, '') || undefined;
};

const collectCandidateEmails = (...sources: any[]): string[] => {
  const emails = new Set<string>();
  sources.forEach((source) => {
    if (!source || typeof source !== 'object') return;
    EMAIL_FIELDS.forEach((field) => {
      const normalized = normalizeEmail(source[field]);
      if (normalized) {
        emails.add(normalized);
      }
    });
    if (source.buyer && typeof source.buyer === 'object') {
      const buyerEmail = normalizeEmail(source.buyer.email);
      if (buyerEmail) emails.add(buyerEmail);
    }
    if (source.paymentBuyer && typeof source.paymentBuyer === 'object') {
      const buyerEmail = normalizeEmail(source.paymentBuyer.email);
      if (buyerEmail) emails.add(buyerEmail);
    }
  });
  return Array.from(emails);
};

const collectCandidatePhones = (...sources: any[]): string[] => {
  const phones = new Set<string>();
  sources.forEach((source) => {
    if (!source || typeof source !== 'object') return;
    PHONE_FIELDS.forEach((field) => {
      const normalized = normalizePhoneValue(source[field]);
      if (normalized) {
        phones.add(normalized);
      }
    });
    if (source.buyer && typeof source.buyer === 'object') {
      const buyerPhone = normalizePhoneValue(source.buyer.gsmNumber || source.buyer.phoneNumber);
      if (buyerPhone) phones.add(buyerPhone);
    }
    if (source.paymentBuyer && typeof source.paymentBuyer === 'object') {
      const buyerPhone = normalizePhoneValue(
        source.paymentBuyer.gsmNumber || source.paymentBuyer.phoneNumber
      );
      if (buyerPhone) phones.add(buyerPhone);
    }
  });
  return Array.from(phones);
};

const extractLinkCodeFromPayload = (...sources: any[]): string | undefined => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const field of LINK_CODE_FIELDS) {
      const normalized = normalizeLinkCode(source[field]);
      if (normalized) {
        return normalized;
      }
    }
  }
  return undefined;
};

const priceRoughlyEquals = (expected?: number, incoming?: number) => {
  if (typeof expected !== 'number' || typeof incoming !== 'number') {
    return false;
  }
  return Math.abs(expected - incoming) <= PRICE_MATCH_TOLERANCE;
};

const coerceDocumentId = (value?: string | number | null): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

interface FallbackMatchResult {
  snap: FirebaseFirestore.QueryDocumentSnapshot;
  reason: string;
  matchedEmail?: string;
  matchedPhone?: string;
}

const findWebhookPaymentByReference = async (
  reference: NormalizedReferenceCode | null
): Promise<FirebaseFirestore.DocumentSnapshot<WebhookPaymentDoc> | null> => {
  if (!reference) {
    return null;
  }

  const docRef = db.collection(WEBHOOK_PAYMENTS_COLLECTION).doc(reference.compact);
  const directSnap = await docRef.get();
  if (directSnap.exists) {
    return directSnap as FirebaseFirestore.DocumentSnapshot<WebhookPaymentDoc>;
  }

  const normalizedQuery = await db
    .collection(WEBHOOK_PAYMENTS_COLLECTION)
    .where('referenceCodeNormalized', '==', reference.normalized)
    .limit(1)
    .get();
  if (!normalizedQuery.empty) {
    return normalizedQuery.docs[0] as FirebaseFirestore.QueryDocumentSnapshot<WebhookPaymentDoc>;
  }

  if (reference.isNumeric) {
    const paymentIdQuery = await db
      .collection(WEBHOOK_PAYMENTS_COLLECTION)
      .where('iyziPaymentId', '==', reference.compact)
      .limit(1)
      .get();
    if (!paymentIdQuery.empty) {
      return paymentIdQuery.docs[0] as FirebaseFirestore.QueryDocumentSnapshot<WebhookPaymentDoc>;
    }
  }

  return null;
};

const isPendingStatus = (status?: string | null) => {
  if (!status) {
    return true;
  }
  const normalized = String(status).toLowerCase();
  return normalized === 'pending';
};

const tryMatchPendingOrder = async (params: {
  emails: string[];
  phones?: string[];
  linkCode?: string;
  paidPrice?: number;
}): Promise<FallbackMatchResult | null> => {
  const { emails, phones = [], linkCode, paidPrice } = params;
  const normalizedLink = linkCode;
  const now = Date.now();
  const candidateMap = new Map<
    string,
    {
      snap: FirebaseFirestore.QueryDocumentSnapshot;
      matchSources: Set<'email' | 'phone'>;
      matchedEmail?: string;
      matchedPhone?: string;
    }
  >();

  const considerDoc = (
    doc: FirebaseFirestore.QueryDocumentSnapshot,
    source: 'email' | 'phone',
    value: string
  ) => {
    const existing =
      candidateMap.get(doc.id) ??
      ({
        snap: doc,
        matchSources: new Set<'email' | 'phone'>(),
        matchedEmail: undefined,
        matchedPhone: undefined,
      } as {
        snap: FirebaseFirestore.QueryDocumentSnapshot;
        matchSources: Set<'email' | 'phone'>;
        matchedEmail?: string;
        matchedPhone?: string;
      });
    existing.matchSources.add(source);
    if (source === 'email') {
      existing.matchedEmail = value;
    } else {
      existing.matchedPhone = value;
    }
    candidateMap.set(doc.id, existing);
  };

  const queryByField = async (field: 'expectedEmail' | 'expectedPhone', value: string) => {
    const snapshot = await db
      .collection(PENDING_PAYMENTS_COLLECTION)
      .where(field, '==', value)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    for (const doc of snapshot.docs) {
      const data = doc.data() as any;
      if (!isPendingStatus(data.status)) continue;
      const createdAt =
        typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : now;
      if (now - createdAt > FALLBACK_MATCH_WINDOW_MS) continue;
      considerDoc(doc, field === 'expectedEmail' ? 'email' : 'phone', value);
    }
  };

  for (const email of emails) {
    if (email) {
      await queryByField('expectedEmail', email);
    }
  }
  for (const phone of phones) {
    if (phone) {
      await queryByField('expectedPhone', phone);
    }
  }

  if (!candidateMap.size) {
    return null;
  }

  const candidates = Array.from(candidateMap.values()).map((entry) => {
    const data = entry.snap.data() as any;
    const matchesLink = normalizedLink && data.linkSlug === normalizedLink;
    const priceMatch = priceRoughlyEquals(Number(data.priceTRY ?? 0), paidPrice);
    const createdAt =
      typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : now;
    let score = 0;
    if (matchesLink) score += 5;
    if (entry.matchSources.has('email')) score += 3;
    if (entry.matchSources.has('phone')) score += 2;
    if (priceMatch) score += 1;
    return {
      entry,
      matchesLink,
      priceMatch,
      createdAt,
      score,
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.createdAt - a.createdAt;
  });

  const best = candidates[0];
  if (!best) {
    return null;
  }

  const reasonParts: string[] = [];
  if (best.entry.matchSources.has('email')) reasonParts.push('email');
  if (best.entry.matchSources.has('phone')) reasonParts.push('phone');
  if (best.matchesLink) reasonParts.push('link');
  else if (best.priceMatch) reasonParts.push('price');

  return {
    snap: best.entry.snap,
    reason: reasonParts.join('+') || 'fallback',
    matchedEmail: best.entry.matchedEmail,
    matchedPhone: best.entry.matchedPhone,
  };
};

const getPendingImpact = (pending: PendingPaymentDoc) => {
  const packageType = pending.packageType ?? 'credit';
  const creditAmount = Number(pending.credits ?? 0);
  const ticketAmount = Number(pending.tickets ?? 0);

  if (packageType === 'duel-ticket') {
    const delta = ticketAmount > 0 ? ticketAmount : creditAmount;
    return {
      field: 'duelTickets' as const,
      amount: delta,
      logType: 'duel-ticket-purchase' as const,
    };
  }

  return {
    field: 'aiCredits' as const,
    amount: creditAmount > 0 ? creditAmount : ticketAmount,
    logType: 'purchase' as const,
  };
};

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

const looksLikeFirestoreId = (value?: string | null) =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{20}$/.test(value);
export const iyzicoWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    verifyWebhookSignature(req);
    const body = req.body || {};

    console.log('Iyzico webhook received:', JSON.stringify(body, null, 2));

    let orderId: string | undefined;
    let paymentDetails: any = body;
    const orderIdHints = [
      body.orderId,
      body.conversationId,
      body.paymentConversationId,
      body.basketId,
      body.referenceCode,
      body.iyziReferenceCode,
    ];
    for (const hint of orderIdHints) {
      if (typeof hint === 'string' && hint.trim().length > 0) {
        orderId = hint.trim();
        break;
      }
    }

    console.log('Extracted orderId:', orderId ?? '(empty)');

    const normalizedStatus = mapStatus(paymentDetails.paymentStatus || body.paymentStatus || body.status);
    const paidPrice =
      typeof paymentDetails.paidPrice === 'string'
        ? Number(paymentDetails.paidPrice)
        : paymentDetails.paidPrice;
    const candidateEmails = collectCandidateEmails(body, paymentDetails);
    const candidatePhones = collectCandidatePhones(body, paymentDetails);
    const linkCodeHint = extractLinkCodeFromPayload(body, paymentDetails);
    const iyziPaymentId =
      paymentDetails.iyziPaymentId ||
      paymentDetails.paymentId ||
      paymentDetails.paymentTransactionId ||
      body.iyziPaymentId ||
      body.paymentId ||
      body.paymentTransactionId;
    const iyziReferenceCode =
      paymentDetails.iyziReferenceCode ||
      paymentDetails.referenceCode ||
      paymentDetails.hostReferenceCode ||
      body.iyziReferenceCode ||
      body.referenceCode ||
      body.hostReferenceCode ||
      body.token;
    const referenceInfo = normalizeReferenceInput(iyziReferenceCode);
    const webhookDocId =
      coerceDocumentId(iyziPaymentId) ??
      referenceInfo?.compact ??
      coerceDocumentId(iyziReferenceCode);

    if (webhookDocId) {
      await db
        .collection(WEBHOOK_PAYMENTS_COLLECTION)
        .doc(webhookDocId)
        .set(
          {
            iyziPaymentId: iyziPaymentId ?? null,
            iyziReferenceCode: iyziReferenceCode ?? null,
            referenceCodeNormalized: referenceInfo?.normalized ?? null,
            status: normalizedStatus,
            pendingOrderId: orderId ?? null,
            payload: body,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paidPrice: typeof paidPrice === 'number' && !Number.isNaN(paidPrice) ? paidPrice : null,
            linkSlug: linkCodeHint ?? null,
            candidateEmails,
            candidatePhones,
          },
          { merge: true }
        );
    } else {
      await db.collection(WEBHOOK_PAYMENTS_COLLECTION).add({
        status: normalizedStatus,
        pendingOrderId: orderId ?? null,
        iyziReferenceCode: iyziReferenceCode ?? null,
        referenceCodeNormalized: referenceInfo?.normalized ?? null,
        payload: body,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paidPrice: typeof paidPrice === 'number' && !Number.isNaN(paidPrice) ? paidPrice : null,
        linkSlug: linkCodeHint ?? null,
        candidateEmails,
        candidatePhones,
      });
    }

    console.log('Processing webhook:', { orderId, status: normalizedStatus, paidPrice });

    let orderRef: FirebaseFirestore.DocumentReference | null = null;
    let snap: FirebaseFirestore.DocumentSnapshot | null = null;
    let foundCollection: string | null = null;
    let fallbackMatchInfo: FallbackMatchResult | null = null;

    if (looksLikeFirestoreId(orderId)) {
      orderRef = db.collection(ORDERS_COLLECTION).doc(orderId!);
      snap = await orderRef.get();
      foundCollection = ORDERS_COLLECTION;

      if (!snap.exists) {
        console.log(`Order not found in ${ORDERS_COLLECTION}, trying paymentOrders...`);
        orderRef = db.collection('paymentOrders').doc(orderId!);
        snap = await orderRef.get();
        foundCollection = 'paymentOrders';
      }
    } else {
      orderId = undefined;
    }

    if (!snap || !snap.exists) {
      fallbackMatchInfo = await tryMatchPendingOrder({
        emails: candidateEmails,
        phones: candidatePhones,
        linkCode: linkCodeHint,
        paidPrice,
      });

      if (fallbackMatchInfo) {
        orderRef = fallbackMatchInfo.snap.ref;
        snap = fallbackMatchInfo.snap;
        foundCollection = PENDING_PAYMENTS_COLLECTION;
        orderId = orderRef.id;
        console.log('Order matched via fallback strategy', {
          orderId,
          matchReason: fallbackMatchInfo.reason,
          matchedEmail: fallbackMatchInfo.matchedEmail,
          matchedPhone: fallbackMatchInfo.matchedPhone,
        });
      }
    }

    if (!snap || !snap.exists || !orderRef) {
      console.error(`Order not found in any collection (hint: ${orderId ?? 'n/a'})`);
      await db.collection('unprocessedWebhooks').add({
        event: body,
        orderId: orderId ?? null,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        reason: 'Order not found in database',
        emailsTried: candidateEmails,
        phonesTried: candidatePhones,
        linkCodeHint,
      });
      res.status(202).json({ error: 'Order not found yet' });
      return;
    }

    console.log(`Order found in ${foundCollection} collection`);

    await db.runTransaction(async (tx) => {
      const orderData = snap!.data() as {
        status?: OrderStatus;
        credits: number;
        tickets?: number;
        userId?: string;
        packageType?: string;
        packageId?: string;
        packageName?: string;
      };
      if (!orderData.userId) {
        throw new functions.https.HttpsError('failed-precondition', 'Order is missing user reference');
      }

      if (orderData.status === 'paid') {
        console.log('Order already paid, skipping');
        return;
      }

      const updateData: Record<string, any> = {
        status: normalizedStatus,
        providerPayload: paymentDetails,
        webhookBody: body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (fallbackMatchInfo) {
        updateData.matchInfo = {
          matchedBy: fallbackMatchInfo.reason,
          matchedEmail: fallbackMatchInfo.matchedEmail,
          matchedPhone: fallbackMatchInfo.matchedPhone,
          matchedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
      }
      if (paymentDetails.paymentId || body.paymentId || body.iyziPaymentId) {
        updateData.paymentId = paymentDetails.paymentId || body.paymentId || body.iyziPaymentId;
      }
      if (paidPrice !== undefined && paidPrice !== null) {
        updateData.paidPrice = paidPrice;
      }
      if (body.iyziEventType) {
        updateData.iyziEventType = body.iyziEventType;
      }
      if (body.iyziEventTime) {
        updateData.iyziEventTime = body.iyziEventTime;
      }
      if (body.token) {
        updateData.iyziToken = body.token;
      }

      tx.update(orderRef!, updateData);
      console.log('Order updated:', updateData);

      if (normalizedStatus === 'paid') {
        const userRef = db.collection('users').doc(orderData.userId);
        const userSnap = await tx.get(userRef);
        const packageType = orderData.packageType || 'credit';

        if (packageType === 'duel-ticket') {
          const beforeTickets = userSnap.exists ? Number(userSnap.get('duelTickets') ?? 0) : 0;
          const ticketsToAdd = Number(orderData.tickets ?? 0);
          const afterTickets = beforeTickets + ticketsToAdd;

          tx.set(userRef, { duelTickets: afterTickets }, { merge: true });
          console.log('Duel tickets updated:', { beforeTickets, afterTickets, added: ticketsToAdd });

          const logRef = userRef.collection('creditTransactions').doc();
          tx.set(logRef, {
            type: 'duel-ticket-purchase',
            amount: ticketsToAdd,
            before: beforeTickets,
            after: afterTickets,
            metadata: {
              orderId,
              provider: 'iyzico-link',
              packageId: orderData.packageId,
              packageName: orderData.packageName,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          const beforeCredits = userSnap.exists ? Number(userSnap.get('aiCredits') ?? 0) : 0;
          const afterCredits = beforeCredits + Number(orderData.credits ?? 0);

          tx.set(userRef, { aiCredits: afterCredits }, { merge: true });
          console.log('Credits updated:', { beforeCredits, afterCredits, added: orderData.credits });

          const logRef = userRef.collection('creditTransactions').doc();
          tx.set(logRef, {
            type: 'purchase',
            amount: Number(orderData.credits ?? 0),
            before: beforeCredits,
            after: afterCredits,
            metadata: {
              orderId,
              provider: 'iyzico-link',
              packageId: orderData.packageId,
              packageName: orderData.packageName,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });

    console.log('Webhook processed successfully');
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
export const processPaymentByReference = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Kullanıcı girişi gerekli.');
  }

  const pendingIdRaw = typeof data?.pendingId === 'string' ? data.pendingId.trim() : '';
  const referenceRaw = typeof data?.referenceCode === 'string' ? data.referenceCode : '';

  if (!pendingIdRaw) {
    throw new functions.https.HttpsError('invalid-argument', 'pendingId gerekli.');
  }

  const referenceInfo = normalizeReferenceInput(referenceRaw);
  if (!referenceInfo) {
    throw new functions.https.HttpsError('invalid-argument', 'Geçerli bir referans kodu girin.');
  }
  if (referenceInfo.compact.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Referans kodu en az 6 karakter olmalı.');
  }

  const pendingRef = db.collection(PENDING_PAYMENTS_COLLECTION).doc(pendingIdRaw);
  const pendingSnap = await pendingRef.get();

  if (!pendingSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Sipariş kaydı bulunamadı.');
  }

  const pendingData = pendingSnap.data() as PendingPaymentDoc;
  if (pendingData.userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Bu sipariş sana ait değil.');
  }
  if (pendingData.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Bu sipariş zaten işlenmiş.');
  }

  try {
    const webhookSnap = await findWebhookPaymentByReference(referenceInfo);
    if (!webhookSnap) {
      throw new functions.https.HttpsError(
        'not-found',
        'Webhook henüz gelmedi, lütfen biraz sonra tekrar deneyin.'
      );
    }

    const webhookData = (webhookSnap.data() as WebhookPaymentDoc) || {};
    const webhookStatus = mapStatus(webhookData.status);
    if (webhookStatus !== 'paid') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Ödeme henüz başarılı olarak işaretlenmemiş.'
      );
    }

    const impact = getPendingImpact(pendingData);
    if (!impact.amount || impact.amount <= 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Bu sipariş için uygulanacak bakiye bulunamadı.'
      );
    }

    const processedRef = db.collection(PROCESSED_PAYMENTS_COLLECTION).doc(referenceInfo.compact);
    const userRef = db.collection('users').doc(pendingData.userId);
    const iyziPaymentId = webhookData.iyziPaymentId || webhookSnap.id || referenceInfo.compact;

    let response: ProcessPaymentResult | null = null;

    await db.runTransaction(async (tx) => {
      const freshPendingSnap = await tx.get(pendingRef);
      if (!freshPendingSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Sipariş kaydı bulunamadı.');
      }
      const freshPending = freshPendingSnap.data() as PendingPaymentDoc;
      if (freshPending.userId !== context.auth!.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Bu sipariş sana ait değil.');
      }
      if (freshPending.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Bu sipariş zaten işlenmiş.');
      }

      const processedSnap = await tx.get(processedRef);
      if (processedSnap.exists) {
        throw new functions.https.HttpsError(
          'already-exists',
          'Bu referans kodu daha önce kullanılmış.'
        );
      }

      const processedByIyziQuery = db
        .collection(PROCESSED_PAYMENTS_COLLECTION)
        .where('iyziPaymentId', '==', iyziPaymentId)
        .limit(1);
      const processedByIyziSnapshot = await tx.get(processedByIyziQuery);
      if (!processedByIyziSnapshot.empty) {
        throw new functions.https.HttpsError('already-exists', 'Bu ödeme zaten işlenmiş.');
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'Kullanıcı kaydı bulunamadı.');
      }
      const currentValue = Number(userSnap.get(impact.field) ?? 0);
      const newValue = currentValue + impact.amount;

      tx.update(userRef, {
        [impact.field]: newValue,
      });

      tx.update(pendingRef, {
        status: 'completed',
        iyziPaymentId,
        referenceCode: referenceInfo.raw,
        referenceCodeNormalized: referenceInfo.normalized,
        processedBy: context.auth!.uid,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(webhookSnap.ref, {
        matchedPendingId: pendingIdRaw,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const logRef = userRef.collection('creditTransactions').doc();
      tx.set(logRef, {
        type: impact.logType,
        amount: impact.amount,
        before: currentValue,
        after: newValue,
        metadata: {
          pendingId: pendingIdRaw,
          referenceCode: referenceInfo.raw,
          iyziPaymentId,
          packageId: freshPending.packageId,
          packageName: freshPending.packageName,
          packageType: freshPending.packageType ?? 'credit',
          linkSlug: freshPending.linkSlug ?? null,
          priceTRY: freshPending.priceTRY ?? null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(processedRef, {
        referenceCode: referenceInfo.raw,
        referenceCodeNormalized: referenceInfo.normalized,
        iyziPaymentId,
        pendingId: pendingIdRaw,
        userId: freshPending.userId,
        packageId: freshPending.packageId,
        packageName: freshPending.packageName,
        packageType: freshPending.packageType ?? 'credit',
        creditsApplied: impact.field === 'aiCredits' ? impact.amount : 0,
        ticketsApplied: impact.field === 'duelTickets' ? impact.amount : 0,
        webhookDocId: webhookSnap.id,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      response = {
        success: true,
        message: 'Kredi yüklendi',
        pendingId: pendingIdRaw,
        iyziPaymentId,
        creditsApplied: impact.field === 'aiCredits' ? impact.amount : undefined,
        ticketsApplied: impact.field === 'duelTickets' ? impact.amount : undefined,
        newBalance: newValue,
      };
    });

    return response;
  } catch (error) {
    functions.logger.error('processPaymentByReference failed', {
      pendingId: pendingIdRaw,
      userId: context.auth.uid,
      error: (error as Error).message,
    });
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      (error as Error).message || 'Referans kodu işlenemedi.'
    );
  }
});

// getOrderStatus endpoint KALDIRILDI - ArtÄ±k sabit linkler kullanÄ±lÄ±yor

// =====================================================================
// SUBSCRIPTION MANAGEMENT
// =====================================================================

export { dailySubscriptionCheck, handlePaymentWebhook } from './subscriptionRenewal';

// NOT: Dinamik link oluÅŸturma fonksiyonlarÄ± KALDIRILDI
// ArtÄ±k sabit Iyzico linkleri kullanÄ±lÄ±yor (services/payments.ts)

// =====================================================================
// MISSION MANAGEMENT
// =====================================================================

import { assignDailyMissionsForUser } from './missions';

type MissionTargetType = 
  | 'duelWins'
  | 'questionsSolved'
  | 'practiceSessions'
  | 'aiAnalysis'
  | 'lessonCompleted'
  | 'kazanimPractice'
  | 'correctStreak'
  | 'speedChallenge'
  | 'difficultQuestions'
  | 'duelInvites'
  | 'rematchWins'
  | 'multiSubject'
  | 'newKazanim'
  | 'allSubjects'
  | 'dailyStreak'
  | 'morningQuestions'
  | 'eveningQuestions'
  | 'questionsCreated'
  | 'examsCreated'
  | 'aiCoachPractice'
  | 'perfectSession'
  | 'marathonSession';

interface ReportMissionProgressData {
  targetType: MissionTargetType;
  amount: number;
  metadata?: {
    subjectId?: string;
    kazanimId?: string;
    isCorrect?: boolean;
    questionId?: string;
    difficulty?: string;
    timestamp?: number;
    sessionId?: string;
    streakCount?: number;
    subjectsUsed?: string[];
    isNewKazanim?: boolean;
    timeSpentMs?: number;
    perfectScore?: boolean;
  };
}

interface MissionPracticeStats {
  attempts: number;
  correct: number;
  uniqueQuestionIds: string[];
  firstAttemptAt?: string;
  lastAttemptAt?: string;
}

interface MissionPracticeConfig {
  kazanimId: string;
  kazanimLabel?: string;
  subjectId?: string;
  minQuestions: number;
  minAccuracy: number;
  dueAt?: string;
}

interface MissionInstance {
  missionId: string;
  targetType: MissionTargetType;
  status: 'pending' | 'completed' | 'claimed' | 'expired';
  progress: {
    current: number;
    target: number;
    lastUpdatedAt: string;
  };
  practiceConfig?: MissionPracticeConfig;
  practiceStats?: MissionPracticeStats;
  completedAt?: string;
  rewardPoints: number;
}

export const reportMissionProgress = functions.https.onCall(async (data: ReportMissionProgressData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'KullanÄ±cÄ± giriÅŸi gerekli.');
  }

  const uid = context.auth.uid;
  const { targetType, amount, metadata } = data;

  if (!targetType || typeof amount !== 'number' || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'GeÃ§ersiz parametreler.');
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const missionsRef = userRef.collection('activeMissions');
    const snapshot = await missionsRef
      .where('targetType', '==', targetType)
      .where('status', '==', 'pending')
      .get();

    if (snapshot.empty) {
      return { updated: 0 };
    }

    const batch = db.batch();
    const now = new Date().toISOString();
    let updateCount = 0;

    for (const doc of snapshot.docs) {
      const mission = doc.data() as MissionInstance;

      // KazanÄ±m pratik gÃ¶revleri iÃ§in Ã¶zel iÅŸlem
      if (targetType === 'kazanimPractice' && mission.practiceConfig && metadata?.kazanimId) {
        // Sadece eÅŸleÅŸen kazanÄ±m iÃ§in gÃ¼ncelle
        if (mission.practiceConfig.kazanimId !== metadata.kazanimId) {
          continue;
        }

        const stats = mission.practiceStats || {
          attempts: 0,
          correct: 0,
          uniqueQuestionIds: [],
          firstAttemptAt: now,
        };

        // Soru ID'si saÄŸlanmÄ±ÅŸsa ve benzersizse ekle
        if (metadata.questionId && !stats.uniqueQuestionIds.includes(metadata.questionId)) {
          stats.uniqueQuestionIds.push(metadata.questionId);
          stats.attempts += 1;
          if (metadata.isCorrect) {
            stats.correct += 1;
          }
          stats.lastAttemptAt = now;

          // GÃ¶rev tamamlanma kontrolÃ¼
          const minQuestions = mission.practiceConfig.minQuestions;
          const minAccuracy = mission.practiceConfig.minAccuracy;
          const currentAccuracy = stats.attempts > 0 ? (stats.correct / stats.attempts) * 100 : 0;

          const isCompleted = stats.attempts >= minQuestions && currentAccuracy >= minAccuracy;

          batch.update(doc.ref, {
            practiceStats: stats,
            'progress.current': stats.attempts,
            'progress.lastUpdatedAt': now,
            ...(isCompleted && {
              status: 'completed',
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
            }),
          });

          updateCount++;
        }
      } else if (targetType === 'difficultQuestions') {
        // Zor sorular iÃ§in Ã¶zel filtreleme
        if (metadata?.difficulty === 'zor') {
          const newCurrent = (mission.progress.current || 0) + amount;
          const isCompleted = newCurrent >= mission.progress.target;

          batch.update(doc.ref, {
            'progress.current': newCurrent,
            'progress.lastUpdatedAt': now,
            ...(isCompleted && {
              status: 'completed',
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
            }),
          });

          updateCount++;
        }
      } else {
        // Standart gÃ¶revler iÃ§in basit artÄ±rÄ±m
        const newCurrent = (mission.progress.current || 0) + amount;
        const isCompleted = newCurrent >= mission.progress.target;

        batch.update(doc.ref, {
          'progress.current': newCurrent,
          'progress.lastUpdatedAt': now,
          ...(isCompleted && {
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        });

        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
    }

    return { updated: updateCount };
  } catch (error: any) {
    functions.logger.error('reportMissionProgress failed', { uid, error: error.message });
    throw new functions.https.HttpsError('internal', error.message || 'GÃ¶rev gÃ¼ncellemesi baÅŸarÄ±sÄ±z.');
  }
});

export const claimMissionReward = functions.https.onCall(async (data: { missionId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'KullanÄ±cÄ± giriÅŸi gerekli.');
  }

  const uid = context.auth.uid;
  const { missionId } = data;

  if (!missionId) {
    throw new functions.https.HttpsError('invalid-argument', 'missionId gerekli.');
  }

  try {
    await db.runTransaction(async (tx) => {
      const missionRef = db.collection('users').doc(uid).collection('activeMissions').doc(missionId);
      const missionSnap = await tx.get(missionRef);

      if (!missionSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'GÃ¶rev bulunamadÄ±.');
      }

      const mission = missionSnap.data() as MissionInstance;

      if (mission.status !== 'completed') {
        throw new functions.https.HttpsError('failed-precondition', 'GÃ¶rev henÃ¼z tamamlanmamÄ±ÅŸ.');
      }

      // Ã–dÃ¼lÃ¼ ver
      const userRef = db.collection('users').doc(uid);
      const userSnap = await tx.get(userRef);
      const currentPoints = userSnap.exists ? Number(userSnap.get('missionPoints') ?? 0) : 0;
      const newPoints = currentPoints + mission.rewardPoints;

      tx.update(userRef, {
        missionPoints: newPoints,
      });

      // GÃ¶revi claimed olarak iÅŸaretle
      tx.update(missionRef, {
        status: 'claimed',
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Transaction log ekle
      const logRef = userRef.collection('missionRewards').doc();
      tx.set(logRef, {
        missionId: mission.missionId,
        points: mission.rewardPoints,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error: any) {
    functions.logger.error('claimMissionReward failed', { uid, missionId, error: error.message });
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Ã–dÃ¼l alÄ±namadÄ±.');
  }
});

export const ensureDailyMissions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'KullanÄ±cÄ± giriÅŸi gerekli.');
  }

  const uid = context.auth.uid;

  try {
    const result = await assignDailyMissionsForUser(uid);
    return result;
  } catch (error: any) {
    functions.logger.error('ensureDailyMissions failed', { uid, error: error.message });
    throw new functions.https.HttpsError('internal', error.message || 'GÃ¼nlÃ¼k gÃ¶revler atanamadÄ±.');
  }
});

// Scheduled function - Her gÃ¼n gece yarÄ±sÄ± Ã§alÄ±ÅŸÄ±r ve sÃ¼resi dolan gÃ¶revleri expired yapar
export const expireMissions = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Europe/Istanbul')
  .onRun(async () => {
    const now = new Date().toISOString();
    const usersSnapshot = await db.collection('users').limit(1000).get();

    let totalExpired = 0;

    for (const userDoc of usersSnapshot.docs) {
      const missionsSnapshot = await userDoc.ref
        .collection('activeMissions')
        .where('status', '==', 'pending')
        .get();

      const batch = db.batch();
      let batchCount = 0;

      for (const missionDoc of missionsSnapshot.docs) {
        const mission = missionDoc.data();
        if (mission.expiresAt && mission.expiresAt < now) {
          batch.update(missionDoc.ref, {
            status: 'expired',
            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          batchCount++;
          totalExpired++;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
    }

    functions.logger.info(`expireMissions completed: ${totalExpired} missions expired`);
    return null;
  });

