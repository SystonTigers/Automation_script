# Codex Working Agreement

1. Always run `npm run lint` and `npm test` in `backend/` before submitting PRs.
2. Keep Worker request handlers stateless; prefer KV + Durable Objects for persistence.
3. When adding new bindings, update `backend/wrangler.toml` and document them in `docs/README.md`.
4. Queue message payloads must remain JSON serialisable and backwards compatible.
5. Feature flags belong in tenant records (KV) and fall back to environment defaults.
