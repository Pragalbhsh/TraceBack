# TraceBack 🔍

**A lost & found board that reunites people with their things.**

People post what they **lost** or **found**. TraceBack compares every new post with the open posts of the opposite kind, shows the most likely matches (with the reasons), and **emails** the other person when a good match appears. When the item is returned, the owner marks it as **reunited**.

- **Backend:** Node.js, Express 5, MongoDB (Mongoose), Cloudinary for photos, Nodemailer for alerts
- **Frontend:** React 19 + Vite, in [`traceback-client/`](traceback-client)

---

## Features

| | |
|---|---|
| 📝 **Post lost / found items** | Name, category, description, place, date, contact and a photo |
| 🤝 **Smart matching** | Scores category, name, details (colour, brand...), place and dates; ignores your own posts; explains *why* it's a match |
| 🔁 **Matches keep coming** | Every post's page shows live matches, so a post made today finds things handed in tomorrow |
| 📧 **Email alerts** | The owner of a matching post gets an email (can be switched off in *My posts*) |
| 🔎 **Search & filters** | Search text, lost/found, category, open/reunited, pagination; filters live in the URL so links can be shared |
| 🔐 **Accounts** | Register / log in (bcrypt + JWT). Only the owner can edit, delete or mark a post reunited |
| 🛡️ **Privacy** | Contact details are only shown to signed-in users (stops bots scraping phone numbers); owner emails are never exposed |
| 🎉 **Reunited status & stats** | Home page shows how many items are waiting and how many were reunited |
| 📱 **Works on phones** | Responsive, accessible (keyboard, screen readers, colour contrast), share button for WhatsApp groups |
| ✨ **Thoughtful motion** | Skeleton loading, staggered cards, sliding filter pill, match-strength meters, a "post strength" meter, drag-and-drop photos, toasts, a proper delete dialog, and confetti when a match is found or an item is reunited. Turns off for people who prefer reduced motion |

## What was fixed

These were broken or risky in the previous version:

1. **The React frontend was never actually in the repo.** `traceback-client` was committed as a *gitlink* (a nested git repo), so GitHub only stored a pointer and the folder was empty. The frontend has been rebuilt as real files.
2. **`npm run start:backend` pointed to `backend/server.js`**, which doesn't exist, and there was no `npm start` for hosting.
3. **Matching bug:** `a && b && a.includes(b) || b.includes(a)` - because of operator precedence, an item with an empty name got +3 points against *every* item. Location only matched if typed exactly the same (case-sensitive), and punctuation broke description matching.
4. **Anyone could edit or delete any post** (`PUT`/`DELETE` had no checks), and `...req.body` let clients set any field.
5. **Every phone number/email was public** in the API response.
6. Invalid ids returned **500** instead of **400**, missing items returned **200 + null** instead of **404**.
7. Port was hard-coded to 3000 (breaks Render/Railway/Heroku), no input validation, no upload size/type limits, no rate limiting or security headers.
8. **Security updates:** `cloudinary` 1.x and `nodemailer` 8.x had high-severity advisories - upgraded (and the unmaintained `multer-storage-cloudinary` was replaced with a few lines of direct Cloudinary code). `npm audit --omit=dev` reports 0 vulnerabilities.

---

## Run it locally

You need **Node.js 20+** and a **MongoDB** database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works).

```bash
# 1. Backend
npm install
cp .env.example .env        # then put your MONGO_URI and a JWT_SECRET in .env
npm run dev                 # http://localhost:3000

# 2. Frontend (in a second terminal)
cd traceback-client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:3000
npm run dev                 # http://localhost:5173
```

Or run both at once from the root: `npm run client:install` once, then `npm run dev:all`.

Without Cloudinary keys, photos are saved in `./uploads`. Without SMTP settings, alert emails are printed in the backend console, so you can still see the whole flow.

### Environment variables (backend `.env`)

| Variable | Required | What it is |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ in production | Long random string for login tokens: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | | Defaults to 3000 (hosts usually set this for you) |
| `CORS_ORIGINS` | | Comma-separated frontend URLs allowed to call the API. Defaults to the Netlify site + localhost:5173 |
| `CLIENT_URL` | | Frontend URL used for links in emails |
| `CLOUD_NAME`, `API_KEY`, `API_SECRET` | recommended | Cloudinary credentials (same names as before) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | | For match alert emails. Gmail: `smtp.gmail.com`, port `465`, `SMTP_SECURE=true`, and an [App Password](https://support.google.com/accounts/answer/185833) |
| `TRUST_PROXY` | | Defaults to `1` in production (correct for Render/Railway/Heroku) |
| `MAX_UPLOAD_MB` | | Photo size limit, default 5 |

Frontend (`traceback-client/.env`): `VITE_API_URL` = the backend URL, no trailing slash.

---

## Tests

```bash
npm test                    # 47 unit + API tests, no database needed
npm run test:integration    # full flow against a throwaway in-memory MongoDB
```

`test:integration` downloads a MongoDB binary (~100 MB) the first time. To use your own database instead, set `MONGO_URI_TEST` to a database whose name contains `test` (it refuses anything else so it can't wipe real data).

---

## Deploying

**Backend (e.g. Render "Web Service")**
- Build command: `npm install` · Start command: `npm start`
- Add the environment variables above (`NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS=https://your-site.netlify.app`, `CLIENT_URL`, Cloudinary keys)
- Use **Cloudinary** in production: free hosts wipe the local disk on every deploy, so `./uploads` would lose photos.
- Health check path: `/health`

**Frontend (Netlify)**
- Base directory: `traceback-client` · Build command: `npm run build` · Publish directory: `traceback-client/dist`
- Environment variable: `VITE_API_URL=https://your-backend.onrender.com`
- `public/_redirects` is included so refreshing a page like `/item/123` works.

Deploy the backend and frontend together: posting now needs an account, so the old frontend build can browse but not post.

> **Old posts:** items created before accounts existed have no owner, so nobody can edit or delete them from the app. They still show up and match normally. Remove any you don't want from MongoDB Atlas (*Browse Collections → items*).

---

## API

All responses are JSON. Send `Authorization: Bearer <token>` for 🔒 routes.

| Method | Path | |
|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` → `{ token, user }` |
| `POST` | `/auth/login` | `{ email, password }` → `{ token, user }` |
| `GET` 🔒 | `/auth/me` | Current user |
| `PATCH` 🔒 | `/auth/me` | `{ name?, emailAlerts? }` |
| `GET` | `/items` | List. Query: `type`, `category`, `q`, `location`, `status=open\|resolved\|all`, `sort=newest\|oldest`, `page`, `limit`. Totals in `X-Total-Count` / `X-Total-Pages` headers |
| `GET` | `/items/type/:type` | Open items of one type (kept for older clients) |
| `GET` 🔒 | `/items/mine` | Your posts, each with `matchCount` |
| `GET` | `/items/:id` | One item (`contact` only when signed in) |
| `GET` | `/items/:id/matches` | Ranked matches with `score`, `strength`, `reasons` |
| `POST` 🔒 | `/items` | Create (JSON or `multipart/form-data` with `image`) → `{ savedItem, possibleMatches }` |
| `PUT`/`PATCH` 🔒 | `/items/:id` | Owner only. Any item field, `status: "resolved"`, new `image`, or `removeImage: true` |
| `DELETE` 🔒 | `/items/:id` | Owner only. Also deletes the photo |
| `GET` | `/stats` | `{ lost, found, reunited, total }` |
| `GET` | `/meta` | Categories and upload limit |
| `GET` | `/health` | `200` when the database is connected |

Errors look like `{ "error": "Where was it lost or found?", "details": [{ "field": "location", "message": "..." }] }`.

## Design & motion

The UI was designed first, in [`traceback-client/DESIGN.md`](traceback-client/DESIGN.md): who it's for, motion principles, timing and easing tokens, and a spec for every component. `src/motion.css` and `src/lib/motion.js` implement it with plain CSS and a few small hooks (no animation library, ~4 KB gzipped). Only `transform` and `opacity` are animated, so it stays smooth on budget phones, and everything turns instant with the OS "reduce motion" setting.

## Project structure

```
server.js            starts the server (connects to MongoDB first)
app.js               Express app: security, CORS, routes, error handling
config.js            every environment variable in one place
models/              Item and User schemas
routes/items.js      browse, search, post, edit, reunite, delete, matches
routes/auth.js       register, login, profile
middleware/          auth (JWT) and image upload (Cloudinary or local disk)
lib/matching.js      the matching algorithm (pure functions, easy to tweak)
lib/serialize.js     what each viewer is allowed to see
lib/validation.js    input validation (zod)
lib/mailer.js        match alert emails
tests/               jest + supertest
traceback-client/    React frontend (see DESIGN.md for the design & motion spec)
```

## How matching works

`lib/matching.js` scores a lost item against a found item (and vice versa):

- **Same category** +20 · different specific categories ×0.4
- **Shared words in the name** +12 each (max 30), one name inside the other (phone / iPhone) +8
- **Shared details** in name + description (colours, brands, markings) +4 each (max 24)
- **Same place** +15, overlapping place words +6 each
- **Dates within 3 days** +10, within 2 weeks +5 · found long *before* it was lost ×0.5
- Place + date alone never count as a match; there must be something about the item itself.

Scores ≥ 50 are *strong*, ≥ 25 *good*, ≥ 15 *possible*. Words are lower-cased, plurals are folded (keys → key), filler words are ignored, and Hindi / other scripts are handled.
