# SmartBin web dashboard (frontend-web)

React (Vite) + Tailwind CSS + Recharts. It calls the FastAPI backend for all data.

## Run it

```
cd frontend-web
npm install
npm run dev
```

Open http://localhost:5173.

By default the app calls the live backend on Render. To use a backend on your own computer,
copy `.env.example` to `.env.local` and set:

```
VITE_API_BASE_URL=http://localhost:8000
```

The free Render server sleeps after 15 minutes idle. The first request after that can take up to a
minute; the app shows a "server is waking up" notice while it waits.

Other commands: `npm run lint` (checks the code), `npm run build` (production build into `dist/`).

## Where things are

| File | What it does |
|---|---|
| `src/api.js` | Every call to the backend. Change endpoints here only. |
| `src/App.jsx` | Layout, page switching (`#receiver`, `#dashboard`, `#log`, `#admin`), shared filter |
| `src/pages/WasteReceiver.jsx` | Upload form, analysis result, low-confidence pop-up |
| `src/pages/Dashboard.jsx` | KPI cards, pending notice, charts, report buttons |
| `src/pages/LiveLog.jsx` | Log table with sorting, filters, pages and the detail pop-up |
| `src/pages/Admin.jsx` | Food price table and "Add a food category" |
| `src/reports/` | ESG and cost analysis reports (A4 preview, printed with `@media print`) |
| `src/components/` | Shared pieces: sidebar, filter bar, charts, pop-up, photo + breakdown panel |
| `src/lib/format.js` | Reasons, carbon factor, category colours, number and date formatting (Malaysia time) |

## API endpoints used

| Page | Endpoint |
|---|---|
| Waste receiver | `POST /api/waste/disposal` |
| Analytics dashboard | `GET /api/analytics/dashboard?range=&station=&from=&to=` |
| Live log | `GET /api/waste/logs?range=&station=&page=&limit=&sort_by=&sort_order=&category=&status=` |
| Detail pop-up | `GET /api/waste/logs/{event_id}` |
| Admin | `GET /api/config/pricing`, `PUT /api/config/pricing/batch`, `POST /api/config/pricing/category` |
| Reports | The logs and detail endpoints above (there is no report endpoint yet) |
