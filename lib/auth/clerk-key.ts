export function isClerkPublishableKey(
  value: string | null | undefined,
): value is string {
  return /^pk_(test|live)_/.test(value ?? "");
}

export function hasClerkPublishableKey(): boolean {
  return isClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}
