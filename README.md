# Smart Class

Register for a Grade 9–11 mathematics tuition: QR attendance, monthly fees, exam marks, and printable student cards.

The dashboard is a React app in `client`. The API is Express and MongoDB in `server`. Production runs on Vercel: the dashboard is static, and the API is a function on the same address. `npm start` still serves both from one Node process.

## Layout

```
Smart-Class/
├── client/                 React, TypeScript, Tailwind
│   ├── src/pages/          Attendance, Students, Fees, Marks
│   ├── src/components/     Layout, smart card, forms
│   └── public/class-logo.svg
├── server/
│   └── src/
│       ├── models/         Student, Attendance, Fee, Mark
│       ├── controllers/
│       ├── routes/
│       └── seed.ts
├── .env.example
├── docker-compose.yml      Local MongoDB
├── render.yaml
└── railway.toml
```

## Run it locally

Requirements: Node.js 20 or newer, and MongoDB.

```powershell
cd C:\Smart-Class
copy .env.example .env
docker compose up -d
npm install
npm run seed
npm run dev
```

Open http://localhost:5173. The entrance has two doors: **Teacher** and **Student**. The API listens on http://localhost:5000. Vite proxies `/api` to that port.

`docker compose` is optional. You can install MongoDB yourself, or put an Atlas connection string in `MONGODB_URI`.

`npm run seed` loads six demo students. It does nothing if students already exist. `npm run seed:reset` replaces that demo class.

Demo cards:

| ID | Name | Guardian phone | Fee this month |
| --- | --- | --- | --- |
| MATH-9-001 | Amaya Perera | 0771000101 | Paid |
| MATH-9-002 | Nethmi Fernando | 0771000102 | Paid |
| MATH-10-001 | Kavindu Silva | 0771000103 | Paid |
| MATH-10-002 | Ishara Jayawardena | 0771000104 | Pending |
| MATH-11-001 | Sahan Rathnayake | 0771000111 | Pending |
| MATH-11-002 | Dilini Wickramasinghe | 0771000112 | No bill yet (scan shows pending) |

A student signs in with their ID and guardian phone. Amaya sees a paid fee. Ishara sees a pending fee. The teacher door uses `APP_PASSWORD` when it is set. Leave that blank on this machine and the teacher door opens straight into the register.

Type an ID on the Attendance page if you do not want to use the camera. Dilini’s scan should flash red. Amaya’s should flash green.

## What the screens do

The entrance at `/` offers the teacher dashboard and the student dashboard.

- **Teacher** (`/admin`) scans attendance, keeps the student register, records fees, and enters marks. Sign-in is `/admin/login` when `APP_PASSWORD` is set.
- **Student** (`/student`) shows only that student’s fee, attendance, marks, and smart card. Sign-in is the student ID plus the guardian phone.
- **Attendance** starts the camera with `html5-qrcode`. A recognised card is marked Present, or Late at or after `CLASS_LATE_AFTER` in `APP_TIMEZONE`. The card flashes green when this month’s fee is paid and red when it is pending, and plays a different tone for each. One student can only be marked once per day.
- **Students** creates IDs such as `MATH-10-001`, edits the record, and opens print-sized smart cards. Replace `client/public/class-logo.svg` with your logo.
- **Fees** filters by grade, month, and paid or pending, and shows how many of this month’s class days each student attended. “Create pending fees” adds a bill only for students who do not have one.
- **Marks** keeps one score per student per exam and summarises the selected paper.

## Environment

Copy `.env.example` to `.env` in the project root. The API reads that file, and Vite reads `VITE_` values from it.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Mongo connection string |
| `PORT` | API port. Leave at `5000` for local dev |
| `CLIENT_ORIGIN` | Browser origins allowed to call the API, comma-separated |
| `APP_TIMEZONE` | Timezone for “today” and late marks. Default `Asia/Colombo` |
| `CLASS_LATE_AFTER` | `HH:MM`, 24-hour. Scans at or after this time are Late |
| `CURRENCY` | Label shown next to amounts |
| `DEFAULT_MONTHLY_FEE` | Monthly fee per student. This class is Rs. 1,000 |
| `APP_PASSWORD` | Teacher password. Required when `NODE_ENV=production` |
| `CLASS_NAME` | Name in the sidebar |
| `TEACHER_NAME` | Teacher shown in the sidebar and on smart cards |
| `TEACHER_PHONE` | Class telephone |
| `VITE_API_URL` | Leave empty when the API serves the dashboard. Set the API origin for a split deploy |

Guardian phone numbers are personal data. Production refuses to start until `APP_PASSWORD` is set. A teacher session lasts 12 hours. A student session lasts 12 hours and can only read that student’s record.

## API

All JSON responses use `{ "success": true, "data": ... }` or `{ "success": false, "message": "..." }`.

Public routes: `GET /api/health`, `GET /api/config`, `POST /api/session/login`, `POST /api/session/student`.

Teacher routes need `Authorization: Bearer <token>` from `POST /api/session/login` once `APP_PASSWORD` is set. A student token is rejected there. `GET /api/me` always needs the token from `POST /api/session/student`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/session/login` | Teacher password. Returns an admin token |
| POST | `/api/session/student` | Body: `studentId`, `guardianPhone`. Returns a student token |
| GET | `/api/me` | The signed-in student’s fee, attendance, marks, and card |
| GET | `/api/students?grade=&q=` | List students |
| POST | `/api/students` | Create. Body: `name`, `grade`, `guardianPhone` |
| GET | `/api/students/:studentId` | One student |
| PUT | `/api/students/:studentId` | Update name, grade, or phone |
| DELETE | `/api/students/:studentId` | Remove the student and related rows |
| GET | `/api/students/:studentId/qr` | QR payload and a PNG data URL |
| POST | `/api/attendance/scan` | Body: `{ "qrData": "SMARTCLASS:MATH-9-001" }` |
| GET | `/api/attendance?date=&grade=` | Register for a day. Defaults to today |
| DELETE | `/api/attendance/:id` | Undo a mark |
| GET | `/api/fees/dashboard?month=&grade=&status=&q=` | Fees plus attendance |
| POST | `/api/fees` | Create one fee |
| PUT | `/api/fees/:id` | Update amount or status |
| POST | `/api/fees/generate` | Create missing pending fees for a month |
| GET | `/api/marks?grade=&examTitle=` | Mark list |
| POST | `/api/marks` | Add a score |
| PUT | `/api/marks/:id` | Edit a score |
| GET | `/api/marks/summary?examTitle=&grade=` | Average, highest, lowest |
| GET | `/api/marks/exams` | Exam titles |

A card encodes `SMARTCLASS:MATH-9-001`. The scanner also accepts the bare ID.

```powershell
curl.exe -X POST http://localhost:5000/api/attendance/scan -H "Content-Type: application/json" -d "{\"qrData\":\"SMARTCLASS:MATH-9-001\"}"
```

## Deploy on Vercel

`vercel.json` builds the dashboard and serves the API from `api/[...path].ts` on the same site. Leave `VITE_API_URL` empty.

1. Create a MongoDB Atlas database and allow `0.0.0.0/0`, because Vercel has no fixed IP.
2. From this folder, run `npx vercel login` and then `npx vercel --prod`.
3. In the Vercel project settings, set `MONGODB_URI` to the Atlas string and `APP_PASSWORD` to the teacher password. Production will not open the register until both are set.
4. Optional class settings: `APP_TIMEZONE`, `CLASS_LATE_AFTER`, `CURRENCY`, `DEFAULT_MONTHLY_FEE`, `CLASS_NAME`, `TEACHER_NAME`, `TEACHER_PHONE`.

Addresses ending in `.vercel.app` are allowed to call the API. Set `CLIENT_ORIGIN` as well if you use a custom domain.

Health check: `/api/health`.

`render.yaml` and `railway.toml` remain if you later host the same build as one Node service with `npm start`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and dashboard together |
| `npm run build` | Typecheck and build both apps |
| `npm start` | Serve the production build |
| `npm run seed` | Load the demo class if the database is empty |
| `npm run seed:reset` | Replace the demo class |

## Camera

The scanner needs `http://localhost` or HTTPS. If the browser blocks the camera, type the student ID in the field under the video. Allow the page to play sound, or click the page once, so the paid and pending tones can play.
