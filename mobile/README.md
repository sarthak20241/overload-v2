# Overload (React Native / Expo)

Mobile app for Overload — progressive overload workout tracker. Same UI as the Figma-designed web app, built with Expo and Supabase.

## Setup

1. **Environment**

   Copy `.env.example` to `.env` and set:

   - `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL (e.g. `https://xxxx.supabase.co`)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public key

   These are read at build time. For local dev, create `.env` in the `mobile/` directory.

2. **Install and run**

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

   Then run on iOS simulator, Android emulator, or Expo Go.

## Build for stores

- **EAS Build**: `npx eas build --platform all` (after `eas init` and setting `projectId` in `app.json`).
- **Env for production**: Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in EAS secrets or in the `production` profile in `eas.json`.

## Design

Theme and tokens match the web app design system (see `../src/imports/design-system-audit-output.md`): dark/light theme, neon primary `#c8ff00`, spacing and typography aligned with the audit.

## Backend

Uses Supabase for auth and data: `profiles`, `routines`, `routine_exercises`, `workout_sessions`, `session_exercises`, `session_sets`, `body_measurements`, `weight_log`, `bodyfat_log`, `xp_data`. RLS is enabled so each user only sees their own rows.
