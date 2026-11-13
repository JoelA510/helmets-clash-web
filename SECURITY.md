# Security policy

## Reporting a vulnerability

Report privately through
[GitHub's report form](https://github.com/JoelA510/helmets-clash-web/security/advisories/new),
or open this repository's
[Security tab](https://github.com/JoelA510/helmets-clash-web/security)
and choose **Report a vulnerability**. Please do not put vulnerability details
in a public issue, discussion, or pull request.

Include the affected URL or commit, browser and platform, reproduction steps,
and what an attacker could do. Use a minimal example with synthetic game data.
Redact credentials and personal information from saves, screenshots, and logs.

The repository maintainer, @JoelA510, handles reports. There is no guaranteed
response or fix deadline. The maintainer will reply in the private report,
discuss whether the issue can be reproduced, and coordinate a fix and public
disclosure. Researcher credit is included only with your consent.

## What's in scope

- The browser game at
  [helmets-clash.secureyour.tech](https://helmets-clash.secureyour.tech/).
- This repository's game client, including setup input, local autosave and
  resume, replay handling, and rendering of game data.
- Unintended exposure of private information or credentials through published
  assets, build output, or the optional client error-reporting integration.
- Repository scripts, GitHub Actions workflows, dependencies as used by the
  game, and build and deployment configuration.

This is a local browser-game prototype. Changing your own save or using browser
developer tools to change your own game state is not by itself a security
vulnerability. A save or input that can execute attacker-controlled code or
expose information beyond the game state is relevant and should be reported
privately. Ordinary balance issues, gameplay bugs, and save corruption can use
GitHub issues when the report contains no private information or security details.

Third-party platforms themselves, including GitHub, Vercel, and Sentry, are
outside this policy's scope; problems in this game's use or configuration of
them remain in scope.

## Testing boundaries

Prefer a local copy and synthetic saves or replays. Test only in browser
profiles and devices you control. Do not collect or change other people's
information, send malicious saves to other players, disrupt the hosted site,
exhaust service quotas, or use social engineering. Stop and report privately if
you encounter credentials or private data. This policy does not authorize
testing third-party systems.

## Supported versions

Security fixes target `main` and the current hosted prototype. Older builds,
previews, and forks do not receive separate patches. Reports affecting them are
welcome when the issue also affects the current game or exposes information
that remains sensitive.
