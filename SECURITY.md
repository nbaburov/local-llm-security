# Security

## Status

Local LLM Security is a finished university project. It is not deployed anywhere and receives no feature work.

Half of it is insecure on purpose. `/api/chat` is an open, unauthenticated model endpoint with a system prompt that tells the model to obey anything, and the `/vulnerabilities` page exists to attack it. Reports about that endpoint behaving badly are the point of the project, not a vulnerability.

The hardened endpoint also carries known weaknesses from the original project, listed under Known issues in the [README](README.md). The most important: bans never lift, and the rate limiter trusts the `X-Forwarded-For` header, so a caller can rotate it.

Run it locally. Do not expose it to the internet.

## Secrets

No credentials are committed. Every key is read from `.env.local`, and [`.env.example`](.env.example) ships with placeholders only. The "hardcoded key" in the vulnerable demo is a fake string, `demo-openweather-key-not-real`.

## Reporting a vulnerability

If you find a problem in the hardened path that isn't already listed as a known issue, please report it privately through [GitHub's private vulnerability reporting](https://github.com/nbaburov/local-llm-security/security/advisories/new) rather than opening a public issue. Expect an acknowledgement within a week. Advisories about the deliberately vulnerable endpoint, or that restate the known issues, will be closed with a pointer to this file.
