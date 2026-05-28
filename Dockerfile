ARG DEBIAN_VERSION=trixie
ARG GO_VERSION=1.26

FROM golang:${GO_VERSION}-${DEBIAN_VERSION} AS golang-tmp

FROM debian:${DEBIAN_VERSION}

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV DEBIAN_FRONTEND=noninteractive

# Install required build tools, development utilities, and sudo
RUN apt-get update && apt-get install -y --no-install-recommends              \
    ant                                                                       \
    bash-completion                                                           \
    build-essential                                                           \
    ca-certificates                                                           \
    clang                                                                     \
    cmake                                                                     \
    curl                                                                      \
    file                                                                      \
    git                                                                       \
    jq                                                                        \
    inetutils-ping                                                            \
    llvm                                                                      \
    make                                                                      \
    maven                                                                     \
    ninja-build                                                               \
    openjdk-25-jdk                                                            \
    openssl                                                                   \
    sudo                                                                      \
    vim                                                                       \
    xz-utils                                                                  \
    wget                                                                      \
    && rm -rf /var/lib/apt/lists/*

#
# Make dotnet repository available
#
RUN <<-EOF
    wget https://packages.microsoft.com/config/debian/13/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
    dpkg -i packages-microsoft-prod.deb
    rm packages-microsoft-prod.deb
EOF

#
# Install nodejs
#

RUN <<-EOF
cd /tmp

wget https://nodejs.org/dist/v24.16.0/node-v24.16.0-linux-x64.tar.xz

tar -xf node-v24.16.0-linux-x64.tar.xz

cp -r node-v24.16.0-linux-x64/{bin,include,lib,share} /usr/local/

rm -rf node-v24.16.0-linux-x64
rm -rf node-v24.16.0-linux-x64.tar.xz

corepack enable pnpm
corepack enable yarn
EOF

#
# Create non root user
#

# Define default UID and GID for the non-root user
ARG UID=1000
ARG GID=1000

# Create a nonroot user and group matching the host user UID/GID dynamically
RUN (groupadd -g ${GID} nonroot || groupadd nonroot) && \
    (useradd -u ${UID} -g ${GID} -m -s /bin/bash nonroot || useradd -g ${GID} -m -s /bin/bash nonroot) && \
    echo "nonroot ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to the non-root user
USER nonroot

ENV PATH="/home/nonroot/.local/bin:${PATH}"

#
# Make cache directory available
#
RUN mkdir -p /home/nonroot/.cache && touch /home/nonroot/.cache/.keep
VOLUME /home/nonroot/.cache

#
# Make python available using uv
#
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_TOOL_BIN_DIR=/usr/local/bin
ENV UV_PROJECT_ENVIRONMENT=/home/nonroot/.venv
ENV PATH="${UV_PROJECT_ENVIRONMENT}/bin:${PATH}"
RUN mkdir -p /home/nonroot/.venv && touch /home/nonroot/.venv/.keep
VOLUME /home/nonroot/.venv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

#
# Make golang available
#
ENV GOPATH=/home/nonroot/go
ENV PATH="$GOPATH/bin:/usr/local/go/bin:${PATH}"
RUN mkdir -p /home/nonroot/go/src /home/nonroot/go/pkg /home/nonroot/go/bin
VOLUME /home/nonroot/go
COPY --from=golang-tmp /usr/local/go /usr/local/go

# Install golangci-lint
RUN curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b /home/nonroot/.local/bin v1.60.3

#
# Make rust available using rustup
#
ENV RUSTUP_HOME=/home/nonroot/.rustup
ENV CARGO_HOME=/home/nonroot/.cargo
ENV PATH="${RUSTUP_HOME}/bin:${CARGO_HOME}/bin:${PATH}"
VOLUME /home/nonroot/.rustup
VOLUME /home/nonroot/.cargo
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --no-modify-path --profile minimal --default-toolchain none -y

#
# Make nodejs caches cacheable
#
RUN mkdir -p /home/nonroot/.npm && touch /home/nonroot/.npm/.keep
VOLUME /home/nonroot/.npm

RUN npm config set prefix /home/nonroot/.local
RUN corepack install -g pnpm
RUN corepack install -g yarn

# Set up working directory and change ownership
WORKDIR /app
RUN chown -R nonroot:nonroot /app

#
# Install required tools versions
#
RUN sudo apt-get update && sudo apt-get install -y dotnet-sdk-10.0 powershell
RUN rustup toolchain install stable
RUN uv python install 3.14

CMD [ "sleep", "infinity" ]
