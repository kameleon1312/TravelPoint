export function encrypt(_plaintext: string): string {
  throw new Error('encrypt is server-side only');
}

export function decrypt(_ciphertext: string): string {
  throw new Error('decrypt is server-side only');
}
