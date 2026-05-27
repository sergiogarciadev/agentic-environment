# AGENTS.md

This document establishes the mandatory operational boundaries and workflows for all AI coding agents (such as Antigravity, Gemini, Cursor, Copilot, etc.) interacting with this codebase.

---

## The Host Execution Ban

To ensure environment consistency, host security, and zero local configuration drift, **no AI agent is permitted to compile, execute, test, lint, or run tools directly on the host machine.**

All project workflows must take place within the running Docker containers.

---

## Container Architecture

The development environment is orchestrated using Docker Compose (`compose.yml`), defining three services:
1. **`app`**: Built from the custom `Dockerfile`, latest Debian Linux providing updated environment with:
  - development utilities:
    - `git`
    - `jq`
  - programming environment:
    - `clang` and `llvm`
    - `go`: 1.26
    - `node` and `npm` managed by `nvm`
    - `make` and `gcc` managed by `apt-get`
    - `python` managed by `uv`
    - `rustc` and `cargo` managed by `rustup`
  - system utilities:
    - `apt-get`
    - `curl`
    - `ping`
    - `wget`
    - `sudo`
2. **`mongodb`**: Persisted dev MongoDB instance.
3. **`redis`**: Persisted dev Redis cache.

Use `apt-get` to install any missing tools you require

---

### Using other tools

#### APT

##### Run apt

- **❌ Forbidden Host commands:** `apt`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app apt
  ```

##### Install Packages

- **❌ Forbidden Host commands:** `apt-get` or `apt install`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app apt-get install
  docker compose exec app apt install
  ```

#### NodeJS

##### Run nodejs

- **❌ Forbidden Host commands:** `node` or `nodejs`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app node
  ```

##### Install Packages

- **❌ Forbidden Host commands:** `npx` or `npm` or `yarn` or `pnpm`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app npx
  docker compose exec app npm
  ```

#### Python

##### Run python

- **❌ Forbidden Host commands:** `python` or `python3`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app uv run python
  ```

##### Install Packages

- **❌ Forbidden Host commands:** `pip` or `uv`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app uv add
  docker compose exec app uv install
  ```

#### Rust

##### Run rust

- **❌ Forbidden Host commands:** `rustc`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app rustc
  ```

##### Install Packages

- **❌ Forbidden Host commands:** `cargo` or `rustup`
- ** Enforced Containerized command:**
  ```bash
  docker compose exec app cargo
  docker compose exec app rustup
  ```

---

## Package Caches

Packages are cached using docker volumes, if you got any error for missing installed tools (like node, npm, cargo, etc), just rebuild the docker image with `docker compose build --no-cache`.

---

## Agent Setup Verification Checklist

Prior to initiating code modifications, all agents should:
1. **Check Stack Status**: Run `docker compose ps` to ensure development containers are active.
2. **Ensure Network Connectivity**: Verify endpoints can be reached through container networks (internally wired via `app_net`).
3. **Read Code Guidelines**: Review `.golangci.yml` and `.cursorrules` to ensure all edits comply with strict static checks.
