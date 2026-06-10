const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function nanoid(length: number): string {
  let result = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (const byte of array) {
    result += CHARS[byte % CHARS.length];
  }
  return result;
}
