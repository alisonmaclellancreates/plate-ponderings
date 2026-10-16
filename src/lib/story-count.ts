/** "0 stories", "1 story", "5 stories" — singular only for exactly one. */
export function storyCount(n: number) {
  return `${n} ${n === 1 ? "story" : "stories"}`;
}
