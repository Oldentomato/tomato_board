export function isMockMode() {
  return process.env.NEXT_PUBLIC_USE_MOCK === "true";
}
