import { getAuth } from "firebase/auth";

export type CreateLinkPayload = {
  productId: string;
  amount: number; // TL
  credits: number; // verilecek kredi
  description?: string;
};

export async function createPaymentLink(payload: CreateLinkPayload): Promise<{ paymentLinkUrl: string; orderId: string; }>{
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken?.();
  const res = await fetch(`/api/pay/link/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Link oluþturma baþarýsýz: ${res.status} ${text}`);
  }
  return res.json();
}

export async function pollOrderStatus(orderId: string): Promise<{ status: 'pending'|'paid'|'failed'|'expired'; }>{
  const res = await fetch(`/api/pay/orders/${orderId}`);
  if (!res.ok) throw new Error('Sipariþ durumu alýnamadý');
  return res.json();
}

