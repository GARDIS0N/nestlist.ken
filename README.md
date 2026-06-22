# NestList — Kenya's Premium Rental Platform

A property listing platform connecting landlords, caretakers, and agents with tenants across Kenya. Property owners pay a small listing fee via M-Pesa to post their properties. Tenants browse and inquire for free.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Auth:** Clerk (email/password)
- **Database:** Supabase (PostgreSQL) with RLS
- **Payments:** M-Pesa STK Push via Safaricom Daraja API
- **Image Upload:** Cloudinary (unsigned upload)
- **SMS:** Africa's Talking
- **Email:** EmailJS
- **Backend:** Node.js + Express (deployed on Render.com)

## Business Registration

BN-P7SEPZD3

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn

### Installation

```bash
git clone https://github.com/GARDIS0N/nestlist.ken.git
cd nestlist
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk frontend API key
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

### Database

Run `supabase/schema.sql` in your Supabase SQL Editor to create all tables, indexes, RLS policies, and triggers.

### Development

```bash
npm run dev
```

### Backend Server

The backend server handles M-Pesa STK Push and Africa's Talking SMS.

```bash
cd server
npm install
npm start
```

Deploy the server to Render.com with the environment variables from Section 7.

## Listing Fees

| Property Type | Fee (KES) | Duration |
|--------------|-----------|----------|
| Single Room  | 100       | 30 days  |
| Bedsitter    | 200       | 30 days  |
| Studio       | 250       | 30 days  |
| 1 Bedroom    | 500       | 30 days  |
| 2 Bedroom    | 700       | 30 days  |
| 3 Bedroom    | 1,000     | 30 days  |
| 4 Bedroom    | 1,200     | 30 days  |
| 5+ Bedroom   | 1,500     | 30 days  |

## License

Private — All rights reserved.
