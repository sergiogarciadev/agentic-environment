# AGENTS.md

## The Host Execution Ban

To ensure environment consistency, host security, and zero local configuration drift, **no AI agent is permitted to execute any command outside the container environment**

All project workflows must take place within the running Docker containers.

---

## Container Architecture

The development environment is orchestrated using Docker Compose (`compose.yml`), defining three services:
1. **`app`**: Built from the custom `Dockerfile`, latest Debian Linux providing updated environment with:
  - development utilities:
    - `git`
    - `jq`
  - programming environment:
    - `clang` and `llvm` managed by `apt-get`
    - `cmake` and `make` managed by `apt-get`
    - `dotnet` and `pwsh` managed by `apt-get`
    - `gcc` and `g++` managed by `apt-get`
    - `go`: 1.26 installed manually
    - `java` and `javac` managed by `apt-get`
    - `node` and `npm` managed by `nvm`
    - `python` managed by `uv`
    - `rustc` and `cargo` managed by `rustup`
  - system utilities:
    - `apt-get`
    - `curl`
    - `ping`
    - `wget`
    - `sudo`
2. **`mongodb`**: Persisted dev MongoDB instance.
3. **`postgres`**: Persisted dev PostgreSQL instance with pgvector extension.
4. **`redis`**: Persisted dev Redis cache.

If required, install tools in the container using the corresponding package manager, such as `apt-get`, `npm`, `uv`, `cargo`, etc. You may also use `curl` and `wget` to download and install tools.

**IMPORTANT:** Never run commands in the host, instead use `docker compose exec app <command>`.

---

## Package Caches

Packages are cached using docker volumes, if you got any error for missing installed tools (like node, npm, cargo, etc), just rebuild the docker image with `docker compose build app` and restart the stack with `docker compose up -d`.

Prior to initiating code modifications, all agents should:
1. **Check Stack Status**: Run `docker compose ps` to ensure development containers are active.
2. **Ensure Volumes are Mounted**: Run `ls -lha $HOME` to check if any directory are accessible only by root user, which indicates incorrect mounts. To fix rebuild and restart `app` service.
