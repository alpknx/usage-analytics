/**
 * Extract user ID from request.
 * Checks x-user-id header first, then falls back to ?userId= query param
 * (needed for EventSource which cannot set custom headers).
 * Returns null if no valid user ID is found.
 */
export function getUserId(req: Request): number | null {
  const fromHeader = req.headers.get("x-user-id");
  if (fromHeader) {
    const id = Number(fromHeader);
    if (Number.isInteger(id) && id > 0) return id;
  }

  const { searchParams } = new URL(req.url);
  const fromQuery = searchParams.get("userId");
  if (fromQuery) {
    const id = Number(fromQuery);
    if (Number.isInteger(id) && id > 0) return id;
  }

  return null;
}
