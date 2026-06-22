import {
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  Sun,
  CloudSun,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  clear: Sun,
  cloudy: Cloud,
  "partly-cloudy": CloudSun,
  rain: CloudRain,
  drizzle: CloudDrizzle,
  snow: CloudSnow,
};

export function WeatherIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = iconMap[icon.toLowerCase()] ?? CloudSun;
  return <Icon className={className} aria-hidden="true" />;
}
