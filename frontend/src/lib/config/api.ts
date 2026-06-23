const PRODUCTION_API_URL = "https://board.oldensystem.co.kr";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? PRODUCTION_API_URL;
export const API_PREFIX = "/api";
