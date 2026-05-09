export async function parseApiError(err: unknown, fallback: string): Promise<string> {
  const e = err as { response?: Response; message?: string };
  const response = e?.response;
  if (!response) {
    return e?.message || fallback;
  }
  if (response.status === 500) {
    return 'Server error while creating patient. Please contact admin.';
  }
  try {
    const body = await response.clone().json();
    if (body && typeof body.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }
    if (body && body.errors && typeof body.errors === 'object') {
      const flat = Object.values(body.errors as Record<string, unknown>)
        .flat()
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
      if (flat.length > 0) return flat.join(' ');
    }
  } catch {
    /* ignore */
  }
  return fallback;
}
