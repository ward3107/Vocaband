/**
 * Fisher-Yates letter shuffler with an anti-identity guard so a
 * single-letter or palindrome-ish word doesn't render unscrambled.
 */
export function scrambleWord(input: string): string {
  const chars = input.split('');
  if (chars.length <= 1) return input;
  for (let attempt = 0; attempt < 20; attempt++) {
    const arr = [...chars];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const joined = arr.join('');
    if (joined !== input) return joined;
  }
  return chars.reverse().join('');
}
