import type { Kind } from './types';

const WRITE = new Set(['eth_sendTransaction', 'eth_sendRawTransaction']);
const SIGN = new Set([
  'eth_sign', 'personal_sign',
  'eth_signTypedData', 'eth_signTypedData_v1', 'eth_signTypedData_v3', 'eth_signTypedData_v4',
]);
const SUBSCRIBE = new Set(['eth_subscribe', 'eth_unsubscribe']);

export function classify(method: string): Kind {
  if (WRITE.has(method)) return 'write';
  if (SIGN.has(method)) return 'sign';
  if (SUBSCRIBE.has(method)) return 'subscribe';
  if (method.startsWith('wallet_')) return 'sign';
  return 'read';
}
