<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as rewrites history on Lovable's side and the user
> will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- The app ships a static bundle for native/desktop wrapping (Capacitor webDir),
  so every page the app can open must be prerendered: keep each route listed in
  `pages` in `vite.config.ts` with prerendering enabled, and keep the router's
  trailing-slash mode set to preserve. The wrapper requests each route with a
  trailing slash while redirects are pinned off, so the default redirecting mode
  silently drops every route but the root from the bundle.
- Data lives in the local database first; network calls (GitHub sync) must never
  be required for the app to open or work offline.

