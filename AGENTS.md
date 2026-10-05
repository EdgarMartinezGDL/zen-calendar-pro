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

- All backend data goes through src/lib/microfix/api.ts (MicroFix Cloud, VITE_API_URL); no mock data or direct fetch in screens — single source of truth.
- Session via AuthProvider/useAuth in src/lib/microfix/auth.tsx, hydrated after mount — avoids SSR localStorage access.
