import * as crypto from 'crypto';

/**
 * İyzico Webhook Signature Doğrulama
 * 
 * Sadece webhook doğrulama için kullanılır.
 * Dinamik link oluşturma FONKSİYONLARI KALDIRILDI.
 * Artık sabit linkler kullanılıyor.
 */

/**
 * İyzico webhook signature doğrulama
 * Webhook'tan gelen isteklerin gerçekten Iyzico'dan geldiğini doğrular
 */
export function verifyIyzicoWebhook(signature: string, payload: string, secretKey: string): boolean {
  try {
    if (!secretKey) {
      console.error('Secret key not found for webhook verification');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('base64');
    
    return hash === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

/**
 * İyzico ödeme durumu mapping
 * Webhook'tan gelen status'u normalize eder
 */
export function mapPaymentStatus(iyzicoStatus?: string): 'pending' | 'paid' | 'failed' | 'expired' {
  if (!iyzicoStatus) return 'pending';
  
  const status = iyzicoStatus.toUpperCase();
  
  if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'PAID') {
    return 'paid';
  }
  if (status === 'FAILURE' || status === 'FAILED' || status === 'CANCELED') {
    return 'failed';
  }
  if (status === 'EXPIRED' || status === 'TIMEOUT') {
    return 'expired';
  }
  
  return 'pending';
}
