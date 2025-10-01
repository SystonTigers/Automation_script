# Codex Delivery Steps

1. Install dependencies: `cd backend && npm install`.
2. Run the local worker: `npm run dev` (requires Cloudflare login).
3. Execute lint and typecheck: `npm run lint && npm test`.
4. Build artefacts: `npm run build` to produce `dist/index.js` and `dist/queue-consumer.js`.
5. Deploy via CI by pushing to `main` (requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).
