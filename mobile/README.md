# EcoTrack Mobile

Concise architecture:

- `app/`: Expo Router route files only.
- `src/api/`: internal `@api` client layer mirroring backend auth, citizen, tours, planning, and health modules.
- `src/features/`: screen-level feature modules.
- `src/components/`: reusable UI shells/cards.
- `src/providers/`: app-wide providers, including session state and the citizen sidebar shell.
- `src/lib/`: env parsing, route resolution, and architecture metadata.
- `src/device/`: native adapters for location, secure storage, notifications, and camera media capture.
- `src/theme/`: palette, light/dark theme tokens, and reusable styling hooks.

Current scope:

- Real auth/session restore through the backend auth module.
- Local mobile auth now includes sign in, self-service citizen signup, and forgot-password request flows against the live backend auth endpoints.
- Secure session snapshot persistence with Expo Secure Store so cold starts can reuse the last known user while auth revalidation completes.
- Citizen dashboard, report, challenge, history, schedule, profile, settings, and feedback screens connected to live API state or runtime capability state.
- Map-first citizen reporting with `GET /api/containers` search, a single floating GPS map control that starts from an approximately 100 m local view around the citizen position, immediate container popups triggered from GPS-ranked shortcuts, search results, map markers, and offscreen arrows, viewport-synced offscreen arrow indicators for the nearest 3-5 containers that collapse overlapping targets and focus the nearest container on tap, compact popups limited to the container name plus a color-coded fill-progress tag, container fill progress surfaced as green under 50%, warning at 50-75%, and red above 75%, highlighted nearby-container markers limited to that same nearest set, a bottom-sheet composer with location refresh and optional camera evidence that still works when live location is temporarily unavailable, 1-hour duplicate protection from the backend, zone-manager notification queuing, and post-submit history/challenge refresh.
- A citizen-first home screen with the restored report/history flow, feature shortcuts, icon-first section headers, and a 2x2 overview metrics matrix.
- Citizen bottom navigation now adapts to phone width: narrow phones collapse to four primary tabs, move `Schedule` into the drawer, and reserve bottom space from the same runtime layout rules so taps stay reliable.
- Filterable citizen history presented as a mobile activity timeline with status, timestamps, location, and optional photo evidence.
- Agent operations now support assigned-tour start, active-stop validation with optional live GPS capture, anomaly submission from live anomaly types, and a recent route activity feed.
- Manager operations now support planning report generation, history review, regenerate actions, and authenticated PDF/CSV export download or native sharing.
- Expo Go-safe notification capability checks that avoid `expo-notifications` push-token warnings until a development build is introduced.
- TanStack Query is wired to Expo `AppState` and network reachability so foreground and reconnect refetch behavior stays consistent on device.
- Role-aware route branching for citizen, agent, and manager entry lanes.
- Global light/dark appearance with light mode as the default first-run experience plus manual override in Settings from the citizen menu footer.
- Citizen pages use a shared theme-aware fixed header shell with isolated controls: the authenticated profile avatar on the left, a centered EcoTrack mark, the current page name on the right, a tappable title that scrolls the current screen to top, a logo that scrolls the active home screen to top or returns users to their home route, a citizen swipe-open drawer zone that begins below the header so header taps stay reliable, and page content that starts directly with the first section unless a screen explicitly renders top actions.
- The citizen sidebar now groups utility links behind a single expandable entry for `Settings`, `Feedback`, and `Support`, while keeping sign-out centered as a separate bottom action.
- Internal `@api/*` aliases are the only supported mobile-to-server client boundary.
- `EXPO_PUBLIC_API_BASE_URL` is the canonical mobile API base key.

Commands:

- `npm run start --workspace=ecotrack-mobile`
- `npm run lint --workspace=ecotrack-mobile`
- `npm run typecheck --workspace=ecotrack-mobile`
- `npm run test --workspace=ecotrack-mobile`

Local API base setup:

- `npm run mobile:api-base` prints the recommended `EXPO_PUBLIC_API_BASE_URL` values for LAN, Android emulator, and iOS simulator.
- `npm run mobile:env:lan` writes the detected LAN URL into `mobile/.env.local`.
- `npm run mobile:env:android-emulator` writes `http://10.0.2.2:3001` into `mobile/.env.local`.
- `npm run mobile:env:ios-simulator` writes `http://localhost:3001` into `mobile/.env.local`.
- `npm run mobile:start:tunnel` starts Expo with tunnel mode for the JS bundle. This does not tunnel the backend API; your `EXPO_PUBLIC_API_BASE_URL` still has to be reachable from the device.
