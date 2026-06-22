import { useState, useRef, useCallback, useEffect } from 'react';
import { API_URL } from '../lib/constants';

interface UseMpesaProps {
  onSuccess?: () => void;
}

export function useMpesa(props?: UseMpesaProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'waiting' | 'confirmed' | 'failed'>('idle');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const initiate = useCallback(async ({
    phone, amount, listingId, listingTitle, onSuccess
  }: {
    phone: string;
    amount: number;
    listingId?: string;
    listingTitle?: string;
    onSuccess?: () => void;
  }) => {
    setError('');
    setStatus('loading');
    setCheckoutId(null);
    try {
      const res = await fetch(API_URL + '/api/mpesa/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount, listingId, listingTitle }),
      });
      const data = await res.json();
      if (!data.success) {
        setStatus('failed');
        setError(data.error || 'Failed to send M-Pesa prompt');
        return;
      }
      setCheckoutId(data.checkoutId);
      setStatus('waiting');
      setCountdown(120);

      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(API_URL + '/api/mpesa/status?checkoutId=' + data.checkoutId);
          const statusData = await statusRes.json();
          if (statusData.status === 'confirmed') {
            cleanup();
            setStatus('confirmed');
            if (onSuccess) onSuccess();
          } else if (statusData.status === 'failed') {
            cleanup();
            setStatus('failed');
            setError('Payment failed. Please try again.');
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 3000);
    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'Network error');
    }
  }, [cleanup]);

  const manualConfirm = useCallback((onSuccess?: () => void) => {
    cleanup();
    setStatus('confirmed');
    if (onSuccess) onSuccess();
  }, [cleanup]);

  const resend = useCallback(async ({
    phone, amount, listingId, listingTitle
  }: {
    phone: string;
    amount: number;
    listingId?: string;
    listingTitle?: string;
  }) => {
    cleanup();
    await initiate({ phone, amount, listingId, listingTitle, onSuccess: props?.onSuccess });
  }, [cleanup, initiate, props?.onSuccess]);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setError('');
    setCountdown(0);
    setCheckoutId(null);
  }, [cleanup]);

  return {
    status,
    error,
    countdown,
    checkoutId,
    initiate,
    manualConfirm,
    resend,
    reset,
  };
}
