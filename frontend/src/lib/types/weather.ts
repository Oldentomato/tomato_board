export type TodayWeather = {
  date: string;
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  location: string;
};

export type DayForecast = {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
  precipitation: number;
};

export type WeekWeather = {
  days: DayForecast[];
};
