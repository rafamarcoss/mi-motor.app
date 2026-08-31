import { fuelStatistics, MITECO_URL, parseFuelPrice } from '../src/fuel.js';
import { normaliseText } from '../src/validation.js';

const zone = process.argv[2] || 'Córdoba';
const fuel = process.argv[3] || 'diesel';
const field = fuel === 'gasoline' ? 'Precio Gasolina 95 E5' : 'Precio Gasoleo A';
const response = await fetch(MITECO_URL, { headers: { Accept: 'application/json' } });
if (!response.ok) throw new Error(`MITECO respondió HTTP ${response.status}`);
const dataset = await response.json();
const rows = Array.isArray(dataset?.ListaEESSPrecio) ? dataset.ListaEESSPrecio : [];
const matches = rows.filter((row) => normaliseText(row.Municipio) === normaliseText(zone));
const values = matches.map((row) => row[field]);
const statistics = fuelStatistics(values);
const stationIds = matches.map((row) => row.IDEESS).filter(Boolean);
const validCount = values.filter((value) => parseFuelPrice(value) !== null).length;
const outlierCandidates = values.map(parseFuelPrice).filter((value) => value !== null && (value < 1 || value > 3));

console.log(JSON.stringify({
  source: MITECO_URL,
  updatedAt: dataset.Fecha || null,
  zone,
  fuel,
  field,
  rows: matches.length,
  samples: statistics?.samples || 0,
  min: statistics?.min ?? null,
  max: statistics?.max ?? null,
  mean: statistics?.mean ?? null,
  median: statistics?.median ?? null,
  empty: values.filter((value) => value === null || value === undefined || String(value).trim() === '').length,
  zero: values.filter((value) => String(value).trim() === '0').length,
  invalid: values.length - validCount - values.filter((value) => value === null || value === undefined || String(value).trim() === '').length,
  outlierCandidates,
  duplicateStations: stationIds.length - new Set(stationIds).size
}, null, 2));
