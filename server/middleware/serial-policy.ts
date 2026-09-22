const POLICY = "serial=(self), usb=(self), bluetooth=(self)";

export default async function serialPolicy(
  _event: unknown,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (result instanceof Response) {
    try {
      result.headers.set("Permissions-Policy", POLICY);
      return result;
    } catch {
      const headers = new Headers(result.headers);
      headers.set("Permissions-Policy", POLICY);
      return new Response(result.body, {
        status: result.status,
        statusText: result.statusText,
        headers,
      });
    }
  }
  return result;
}
