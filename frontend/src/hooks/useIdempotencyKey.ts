import { useState, useCallback } from 'react';
import { generateUUID } from '@/lib/utils';

/**
 * Custom hook to generate and maintain a persistent Idempotency-Key UUID
 * per form session. Re-generating on demand upon successful submission or manual reset.
 */
export function useIdempotencyKey() {
  const [key, setKey] = useState<string>(() => generateUUID());

  const regenerateKey = useCallback(() => {
    const newKey = generateUUID();
    setKey(newKey);
    return newKey;
  }, []);

  return { idempotencyKey: key, regenerateKey };
}
