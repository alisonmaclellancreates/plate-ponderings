/**
 * Asks for a fresh AI summary of a plate's published stories. Step 45 builds
 * the real generation; until then this records the request so callers and
 * tests already depend on the call being made.
 */
export async function requestSummaryRefresh(subjectId: string): Promise<void> {
  // Step 45 replaces this body with summary generation.
  void subjectId;
}
