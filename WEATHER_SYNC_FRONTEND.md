# Frontend Weather Sync & Enhanced Risk Display

## Changes Made to WeatherRiskPage.jsx

### 1. Weather Sync Feature (Already Implemented)
- Manual sync button triggers backend API
- Shows loading state and success/error notifications
- Auto-refreshes data after sync

### 2. Enhanced Risk Cards with Details

**Now Each Risk Card Shows:**
- Risk level badge (Low/Medium/High)
- **Risk Score** (0-100) with progress bar
- **Contributing Factors** (why the risk is high/medium/low)
- Color-coded: Green (<30), Amber (30-60), Red (>60)

**Example Risk Card:**
```
┌─────────────────────────────────┐
│ 🌧️  Flood Risk          [HIGH] │
│ Precipitation volume            │
├─────────────────────────────────┤
│ Risk Score              72/100  │
│ ████████████████░░░░░░░░ (Red)  │
├─────────────────────────────────┤
│ Contributing Factors            │
│ • clay soil has very poor       │
│   drainage                      │
│ • Flood irrigation creates      │
│   standing water risk           │
│ +2 more factors                 │
└─────────────────────────────────┘
```

### 3. Farm Context Display

The header now shows the selected farm's soil type and irrigation:
```
7-Day Risk Analysis    🪨 clay, loamy  💧 flood
```

This helps users understand WHY their risks are calculated the way they are.

---

## Code Changes

### Risk Card Array Updated
```javascript
{[
  { label: 'Drought Risk', key: 'droughtRisk', detailsKey: 'droughtRiskDetails', icon: CloudSun, color: 'orange', desc: 'Soil moisture levels' },
  { label: 'Flood Risk', key: 'floodRisk', detailsKey: 'floodRiskDetails', icon: Droplets, color: 'blue', desc: 'Precipitation volume' },
  { label: 'Heat Stress', key: 'heatRisk', detailsKey: 'heatRiskDetails', icon: Thermometer, color: 'red', desc: 'Thermal impact' },
  { label: 'Pest Risk', key: 'pestRisk', detailsKey: 'pestRiskDetails', icon: Sprout, color: 'green', desc: 'Infestation likelihood' },
  { label: 'Disease Risk', key: 'diseaseRisk', detailsKey: 'diseaseRiskDetails', icon: AlertCircle, color: 'amber', desc: 'Pathogen development' }
]}
```

### Risk Score Progress Bar
```jsx
{riskDetails?.score !== undefined && (
  <div className="mt-3">
    <div className="flex justify-between items-center mb-1">
      <span className="text-[10px] font-bold text-gray-400 uppercase">Risk Score</span>
      <span className="text-xs font-black text-gray-600">{riskDetails.score}/100</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full ${
          riskDetails.score >= 60 ? 'bg-red-500' : 
          riskDetails.score >= 30 ? 'bg-amber-500' : 'bg-green-500'
        }`}
        style={{ width: `${Math.min(riskDetails.score, 100)}%` }}
      />
    </div>
  </div>
)}
```

### Contributing Factors Display
```jsx
{hasFactors && (
  <div className="mt-3 space-y-1.5">
    <span className="text-[10px] font-bold text-gray-400 uppercase">Contributing Factors</span>
    {riskDetails.factors.slice(0, 2).map((factor, idx) => (
      <div key={idx} className="flex items-start gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
          riskLevel === 'high' ? 'bg-red-500' : 
          riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'
        }`} />
        <p className="text-[11px] text-gray-600 leading-tight">{factor}</p>
      </div>
    ))}
    {riskDetails.factors.length > 2 && (
      <p className="text-[10px] text-gray-400 italic">+{riskDetails.factors.length - 2} more factors</p>
    )}
  </div>
)}
```

### Farm Context in Header
```jsx
{selectedFarm && (
  <div className="flex items-center gap-3">
    {selectedFarm.soilType?.length > 0 && (
      <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded-lg">
        🪨 {selectedFarm.soilType.join(', ')}
      </span>
    )}
    {selectedFarm.irrigationType && (
      <span className="text-[10px] font-bold text-gray-500 uppercase bg-blue-50 px-2 py-1 rounded-lg">
        💧 {selectedFarm.irrigationType}
      </span>
    )}
  </div>
)}
```

---

## API Response Expected

```json
{
  "risk": {
    "droughtRisk": "high",
    "floodRisk": "medium",
    "heatRisk": "low",
    "pestRisk": "high",
    "diseaseRisk": "medium",
    
    "droughtRiskDetails": {
      "score": 75,
      "factors": [
        "Below average rainfall expected",
        "sandy soil has poor water retention",
        "No irrigation - vulnerable to drought"
      ]
    },
    "floodRiskDetails": {
      "score": 45,
      "factors": [
        "Heavy rainfall expected: 25mm/3h"
      ]
    },
    "heatRiskDetails": {
      "score": 20,
      "factors": []
    },
    "pestRiskDetails": {
      "score": 70,
      "factors": [
        "Very high humidity favors pest breeding",
        "Warm humid conditions optimal for pest reproduction"
      ]
    },
    "diseaseRiskDetails": {
      "score": 50,
      "factors": [
        "High humidity promotes disease spread"
      ]
    }
  }
}
```

---

## Backward Compatibility

If the backend hasn't been updated yet:
- Risk cards still show the basic level (Low/Medium/High)
- Score bar and factors simply don't appear
- No errors - graceful fallback

---

## Supported Soil Types (8 total)
- clay
- sandy
- loamy
- silty
- peaty
- laterite
- clay-loam
- sandy-loam

## Supported Irrigation Types (5 total)
- drip
- sprinkler
- flood
- rainfed
- none

All types are fully supported in the backend risk calculations!

---

## Benefits

✅ **Visual risk scores** - See exact 0-100 score
✅ **Explains WHY** - Contributing factors shown
✅ **Farm context** - Soil & irrigation displayed
✅ **Color-coded** - Green/Amber/Red progress bars
✅ **Backward compatible** - Works with old API too
✅ **Responsive** - Works on mobile

---

## Testing

1. Restart backend server
2. Open Weather Risk page
3. Select a farm
4. Verify:
   - Soil type & irrigation shown in header
   - Risk cards show score bar (if backend updated)
   - Contributing factors displayed
   - Colors match risk level

---

## Future Enhancements

- [ ] Expandable factors list (click to see all)
- [ ] Risk comparison between farms
- [ ] Historical risk trends chart
- [ ] Risk notification preferences
