# AGENTS.md

## The Host Execution Ban

To ensure environment consistency, host security, and zero local configuration drift, **no AI agent is permitted to execute any command outside the container environment**

All project workflows must take place within the running Docker containers.

---

## Container Architecture

The development environment is orchestrated using Docker Compose (`compose.yml`), defining four services:

1. **`app`**: Built from the custom `Dockerfile`, latest Debian Linux providing updated environment.
2. **`mongodb`**: Persisted dev MongoDB instance.
3. **`postgres`**: Persisted dev PostgreSQL instance with pgvector extension.
4. **`redis`**: Persisted dev Redis cache.

## Usage Instructions

Prior to initiating any action, all agents should:

1. **Check Stack Status**: Run `docker compose ps` to ensure development containers are active.
2. **Permission errors**: If you get permission errors, it may be because the volumes are not mounted correctly. To fix it, rebuild and restart the `app` service with `docker compose build app` and `docker compose up -d`.

If required, install tools in the container using the corresponding package manager, such as `apt-get`, `npm`, `uv`, `cargo`, etc. You may also use `curl` and `wget` to download and install tools.

**IMPORTANT:** Never run commands in the host, instead use `docker compose exec app <command>` or start an interactive session with `docker compose exec -it app bash`.
