# ADR 0001 — General-purpose local-first platform

Status: accepted for licensing and general-purpose scope; local-first architecture is the proposed implementation direction.

Apache-2.0 licenses original project code. Keep diagram semantics independent of Angular and X6; use built-in plugins first, not executable third-party extensions. Security/public safety is an optional thematic room, never a dependency of the core. Keep SSR for public pages and CSR for the graphical editor. Prefer local storage before introducing a backend. Preserve existing functionality while migrating.
