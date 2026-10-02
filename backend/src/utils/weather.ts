/**
 * Open-Meteo Free Weather Service (Zero API Key Required)
 * Fetches historical/current weather data at GPS coordinates
 */

export interface WeatherData {
  temperatureC: number;
  condition: string;
  windSpeedKmh: number;
  humidityPercent: number;
}

export async function fetchActivityWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current_weather;
    if (!current) return null;

    // Weather condition code to human description
    const weatherCode = current.weathercode;
    let condition = 'Clear Sky';
    if (weatherCode >= 1 && weatherCode <= 3) condition = 'Partly Cloudy';
    else if (weatherCode >= 45 && weatherCode <= 48) condition = 'Foggy';
    else if (weatherCode >= 51 && weatherCode <= 67) condition = 'Rainy';
    else if (weatherCode >= 71 && weatherCode <= 77) condition = 'Snowy';
    else if (weatherCode >= 80 && weatherCode <= 99) condition = 'Stormy';

    return {
      temperatureC: Math.round(current.temperature),
      condition,
      windSpeedKmh: Math.round(current.windspeed),
      humidityPercent: data.hourly?.relativehumidity_2m?.[0] || 60,
    };
  } catch (err) {
    console.warn('Weather fetch failed, skipping weather metadata:', err);
    return null;
  }
}
