# Interactive Dilemmas & Impossible Choices

Automated Telegram channel: entertainment-first dilemmas where the audience votes, debates and reacts. Runs as a Cloudflare Worker.

- **`worker/`** is the project. See [`worker/README.md`](worker/README.md) for layout, deploy steps and settings. In the Cloudflare dashboard, set the root directory to `worker`.
- **`src/pipeline/dilemmas/`** holds the previous generator, quality checks, formatter and curated dilemmas. They are reference material that is being ported into the Worker, and will be deleted once that is done.
- The original GitHub Actions pipeline (psychology posts, image generation, Vite/React shell, mystery experiment) was removed. It is preserved on the `archive/legacy-pipeline` branch.
