"use client";

import { useQuery } from "@tanstack/react-query";
import type { GeoCoords } from "@/lib/types/geo";

let cachedCoords: GeoCoords | null = null;
let inFlight: Promise<GeoCoords> | null = null;

function getCurrentPosition(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 정보를 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.",
          2: "위치 정보를 가져올 수 없습니다.",
          3: "위치 요청 시간이 초과되었습니다.",
        };
        reject(new Error(messages[error.code] ?? "위치 정보를 가져올 수 없습니다."));
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
}

function resolveGeoCoords(force = false): Promise<GeoCoords> {
  if (!force && cachedCoords) {
    return Promise.resolve(cachedCoords);
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = getCurrentPosition()
    .then((coords) => {
      cachedCoords = coords;
      return coords;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function clearGeoCoordsCache() {
  cachedCoords = null;
  inFlight = null;
}

export function useGeolocation(enabled = true) {
  return useQuery({
    queryKey: ["geolocation"],
    queryFn: () => resolveGeoCoords(),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
