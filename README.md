# Monitoring Project — VDMS frontend port

[Preview](https://eznzz.github.io/ui-monitoring-project/preview/) · [Central](https://eznzz.github.io/ui-monitoring-project/preview/central/) · [Tenant](https://eznzz.github.io/ui-monitoring-project/preview/tenant/)

Source: VDMS main 24ad075ac45822ac25b9421bbabe4993d33e44c8. Original React/TypeScript screens and API clients copied into frontend/; build emits static HTML/CSS/JS. Only API transport, relative paths and visual CSS overlay changed. Offline adapters are synthetic, not real VDMS fixtures or production security. No network calls to VDMS. LAB flags enabled for demonstration. Claim and mail writes that cannot be simulated safely return 503. GitHub Actions builds and smoke-tests before publishing. No claim of full runtime or visual parity until verified.

VDMS remains read-only.
