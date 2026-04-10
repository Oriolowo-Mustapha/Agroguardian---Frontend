import { CloudSun, Droplets, Wind, Gauge, Eye, Sunrise, Sunset, MapPin, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

const isOpenWeatherCurrent = (obj) => {
  return !!(obj && typeof obj === 'object' && obj.main && Array.isArray(obj.weather));
};

const isOpenWeatherForecastList = (arr) => {
  return Array.isArray(arr) && arr.length > 0 && !!arr[0]?.main && Array.isArray(arr[0]?.weather);
};

const toKmh = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 3.6);
};

const degToCompass = (deg) => {
  const n = Number(deg);
  if (!Number.isFinite(n)) return null;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(n / 45) % 8;
  return dirs[idx];
};

const formatUnixWithTz = (unixSeconds, tzOffsetSeconds) => {
  const u = Number(unixSeconds);
  if (!Number.isFinite(u)) return '—';
  const offset = Number(tzOffsetSeconds) || 0;
  // Convert to a shifted UTC time so the string reflects the location's timezone.
  const d = new Date((u + offset) * 1000);
  return d.toUTCString().replace('GMT', '').trim();
};

const iconUrl = (icon, size = 2) => {
  if (!icon) return null;
  const s = size === 4 ? '@4x' : '@2x';
  return `https://openweathermap.org/img/wn/${icon}${s}.png`;
};

const Metric = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
    <div className="flex items-center gap-2 text-gray-500 mb-1">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-sm font-black text-gray-900">{value ?? '—'}</div>
  </div>
);

const groupForecastByDate = (forecastRaw) => {
  if (!isOpenWeatherForecastList(forecastRaw)) return [];
  const groups = new Map();
  for (const item of forecastRaw) {
    const dtTxt = item?.dt_txt;
    const dayKey = typeof dtTxt === 'string' ? dtTxt.split(' ')[0] : null;
    if (!dayKey) continue;
    if (!groups.has(dayKey)) groups.set(dayKey, []);
    groups.get(dayKey).push(item);
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
};

const pickFirst = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const formatFarmLocationLabel = (loc) => {
  if (!loc) return null;
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return loc.address || null;
};

const extractCurrentRaw = ({ weather, riskReport }) => {
  return pickFirst(
    weather?.currentRaw,
    weather?.raw?.current,
    weather?.raw?.currentRaw,
    riskReport?.current,
    riskReport?.currentRaw,
    riskReport?.weather?.current,
    riskReport?.weather?.currentRaw
  );
};

const extractForecastRaw = ({ weather, riskReport }) => {
  const candidate = pickFirst(
    weather?.forecastRaw,
    weather?.raw?.forecast,
    weather?.raw?.forecastRaw,
    weather?.forecast,
    riskReport?.forecast,
    riskReport?.forecastRaw,
    riskReport?.weather?.forecast,
    riskReport?.weather?.forecastRaw
  );

  // Some APIs wrap OpenWeather forecast as { list: [...] }
  if (candidate && Array.isArray(candidate?.list)) return candidate.list;
  return candidate;
};

export default function WeatherDetailsPanel({ weather, riskReport }) {
  const currentRaw = extractCurrentRaw({ weather, riskReport });
  const forecastRaw = extractForecastRaw({ weather, riskReport });

  const simplifiedCurrent = weather?.current;

  const farmLocation = pickFirst(weather?.location, riskReport?.location);
  const farmLocationLabel = formatFarmLocationLabel(farmLocation);
  const openWeatherLabel = `${currentRaw?.name || '—'}${currentRaw?.sys?.country ? `, ${currentRaw.sys.country}` : ''}`;
  const locationLabel = farmLocationLabel || openWeatherLabel;

  const hasAny =
    isOpenWeatherCurrent(currentRaw) ||
    isOpenWeatherForecastList(forecastRaw) ||
    !!simplifiedCurrent;

  if (!hasAny) return null;

  const currentIcon = currentRaw?.weather?.[0]?.icon;
  const currentDesc = currentRaw?.weather?.[0]?.description;
  const windDir = degToCompass(currentRaw?.wind?.deg);

  const simplifiedIcon = simplifiedCurrent?.icon;
  const simplifiedDesc = simplifiedCurrent?.weatherDescription;

  const forecastGroups = groupForecastByDate(forecastRaw);

  return (
    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
      <CardHeader className="bg-sky-50/60 border-b border-sky-100 px-8 py-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun className="h-5 w-5 text-sky-600" />
            <span className="font-black text-gray-900 uppercase tracking-wider text-sm">Full Weather Details</span>
          </div>
          {weather?.timestamp ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
              <Clock className="h-4 w-4" />
              <span>Synced {new Date(weather.timestamp).toLocaleString()}</span>
            </div>
          ) : null}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        {/* Current */}
        {isOpenWeatherCurrent(currentRaw) && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                {currentIcon ? (
                  <img src={iconUrl(currentIcon, 4)} alt="icon" className="h-20 w-20" />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
                    <CloudSun className="h-10 w-10 text-sky-600" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 text-gray-600 font-bold">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{locationLabel}</span>
                  </div>
                  <div className="mt-1 text-4xl font-black text-gray-900 tracking-tighter">
                    {Number.isFinite(currentRaw?.main?.temp) ? `${Math.round(currentRaw.main.temp)}°C` : '—'}
                  </div>
                  <div className="text-sm text-gray-600 font-bold capitalize">{currentDesc || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric icon={CloudSun} label="Feels like" value={Number.isFinite(currentRaw?.main?.feels_like) ? `${Math.round(currentRaw.main.feels_like)}°C` : '—'} />
                <Metric icon={Gauge} label="Pressure" value={Number.isFinite(currentRaw?.main?.pressure) ? `${currentRaw.main.pressure} hPa` : '—'} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric icon={Droplets} label="Humidity" value={Number.isFinite(currentRaw?.main?.humidity) ? `${currentRaw.main.humidity}%` : '—'} />
              <Metric icon={Wind} label="Wind" value={(() => {
                const kmh = toKmh(currentRaw?.wind?.speed);
                const gust = toKmh(currentRaw?.wind?.gust);
                const parts = [];
                if (kmh != null) parts.push(`${kmh} km/h`);
                if (windDir) parts.push(windDir);
                if (gust != null) parts.push(`gust ${gust}`);
                return parts.length ? parts.join(' • ') : '—';
              })()} />
              <Metric icon={Eye} label="Visibility" value={Number.isFinite(currentRaw?.visibility) ? `${Math.round(currentRaw.visibility / 1000)} km` : '—'} />
              <Metric icon={CloudSun} label="Cloud cover" value={Number.isFinite(currentRaw?.clouds?.all) ? `${currentRaw.clouds.all}%` : '—'} />
              <Metric icon={Sunrise} label="Sunrise" value={formatUnixWithTz(currentRaw?.sys?.sunrise, currentRaw?.timezone)} />
              <Metric icon={Sunset} label="Sunset" value={formatUnixWithTz(currentRaw?.sys?.sunset, currentRaw?.timezone)} />
              <Metric label="Coordinates" value={(currentRaw?.coord?.lat != null && currentRaw?.coord?.lon != null) ? `${currentRaw.coord.lat}, ${currentRaw.coord.lon}` : '—'} />
              <Metric label="Last updated" value={formatUnixWithTz(currentRaw?.dt, currentRaw?.timezone)} />
            </div>
          </div>
        )}

        {/* Simplified fallback (when raw payload isn't returned by API) */}
        {!isOpenWeatherCurrent(currentRaw) && !!simplifiedCurrent && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Current Summary</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Limited data</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                {(simplifiedIcon || currentIcon) ? (
                  <img src={iconUrl(simplifiedIcon || currentIcon, 4)} alt="icon" className="h-20 w-20" />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
                    <CloudSun className="h-10 w-10 text-sky-600" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 text-gray-600 font-bold">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{farmLocationLabel || '—'}</span>
                  </div>
                  <div className="mt-1 text-4xl font-black text-gray-900 tracking-tighter">
                    {simplifiedCurrent?.temperature != null ? `${Math.round(Number(simplifiedCurrent.temperature))}°C` : '—'}
                  </div>
                  <div className="text-sm text-gray-600 font-bold capitalize">{simplifiedDesc || currentDesc || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric icon={Droplets} label="Humidity" value={simplifiedCurrent?.humidity != null ? `${simplifiedCurrent.humidity}%` : '—'} />
                <Metric icon={Wind} label="Wind" value={simplifiedCurrent?.windSpeed != null ? `${simplifiedCurrent.windSpeed} km/h` : '—'} />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="bg-amber-600 text-white rounded-xl p-2">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black text-amber-900">Full weather report not available</p>
                <p className="text-xs text-amber-800 font-medium mt-1">
                  The backend response didn’t include raw OpenWeather fields (like pressure, POP, rain, sunrise/sunset, 3‑hour forecast).
                  Ask backend to return <span className="font-black">currentRaw</span> and <span className="font-black">forecastRaw</span> from /weather/current (or expose a /weather/full endpoint).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Forecast */}
        {isOpenWeatherForecastList(forecastRaw) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">3‑Hour Forecast (Next days)</h3>
              <p className="text-xs text-gray-500 font-bold">{forecastRaw.length} data points</p>
            </div>

            <div className="space-y-6">
              {forecastGroups.map((g) => (
                <div key={g.date} className="border border-gray-100 rounded-3xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm font-black text-gray-900">
                      {new Date(g.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{g.items.length} slots</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                          <th className="px-6 py-3 font-black">Time</th>
                          <th className="px-6 py-3 font-black">Condition</th>
                          <th className="px-6 py-3 font-black">Temp</th>
                          <th className="px-6 py-3 font-black">Humidity</th>
                          <th className="px-6 py-3 font-black">Wind</th>
                          <th className="px-6 py-3 font-black">Rain</th>
                          <th className="px-6 py-3 font-black">POP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((it) => {
                          const icon = it?.weather?.[0]?.icon;
                          const desc = it?.weather?.[0]?.description;
                          const time = typeof it?.dt_txt === 'string' ? it.dt_txt.split(' ')[1]?.slice(0, 5) : '—';
                          const rain = Number(it?.rain?.['3h']);
                          const pop = Number(it?.pop);
                          const windKmh = toKmh(it?.wind?.speed);
                          const windC = degToCompass(it?.wind?.deg);

                          return (
                            <tr key={it.dt} className="border-b border-gray-50 last:border-0">
                              <td className="px-6 py-3 text-sm font-black text-gray-900 whitespace-nowrap">{time}</td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  {icon ? <img src={iconUrl(icon, 2)} alt="" className="h-8 w-8" /> : null}
                                  <span className="text-sm font-bold text-gray-700 capitalize">{desc || '—'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-sm font-bold text-gray-700 whitespace-nowrap">
                                {Number.isFinite(it?.main?.temp) ? `${Math.round(it.main.temp)}°C` : '—'}
                                {Number.isFinite(it?.main?.feels_like) ? (
                                  <span className="text-[10px] text-gray-400 font-black ml-2">feels {Math.round(it.main.feels_like)}°</span>
                                ) : null}
                              </td>
                              <td className="px-6 py-3 text-sm font-bold text-gray-700 whitespace-nowrap">
                                {Number.isFinite(it?.main?.humidity) ? `${it.main.humidity}%` : '—'}
                              </td>
                              <td className="px-6 py-3 text-sm font-bold text-gray-700 whitespace-nowrap">
                                {windKmh != null ? `${windKmh} km/h` : '—'}{windC ? ` ${windC}` : ''}
                              </td>
                              <td className="px-6 py-3 text-sm font-bold text-gray-700 whitespace-nowrap">
                                {Number.isFinite(rain) ? `${rain} mm` : '—'}
                              </td>
                              <td className="px-6 py-3 text-sm font-bold text-gray-700 whitespace-nowrap">
                                {Number.isFinite(pop) ? `${Math.round(pop * 100)}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <details className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <summary className="cursor-pointer text-xs font-black text-gray-700 uppercase tracking-widest">
            Data received (debug)
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Metric label="Has currentRaw" value={String(isOpenWeatherCurrent(currentRaw))} />
            <Metric label="Has forecastRaw" value={String(isOpenWeatherForecastList(forecastRaw))} />
            <Metric label="/weather/current keys" value={Array.isArray(weather ? Object.keys(weather) : null) ? Object.keys(weather).join(', ') : '—'} />
            <Metric label="/weather/risk keys" value={Array.isArray(riskReport ? Object.keys(riskReport) : null) ? Object.keys(riskReport).join(', ') : '—'} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
