## 1. Startup safety

- [x] 1.1 Add an executable regression test and observe generation and migration failure cases fail on the original entrypoint.
- [x] 1.2 Stop startup on preparation failure and preserve the successful startup path.
- [x] 1.3 Document the self-hosted upgrade behavior and run lint, type checks, unit tests, and strict spec validation.

Validation: startup regression tests, lint, type checking, and the open-source build pass. The full unit suite retains six pre-existing Google task mapping failures, reproduced with the original entrypoint. Release remains pending that gate decision.
