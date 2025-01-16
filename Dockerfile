FROM denoland/deno AS install

# Install git
RUN apt update && \
    apt install -y git libc6 curl build-essential pkg-config libssl-dev

WORKDIR /app
ADD . /app

# Install nGit
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

RUN cargo install ngit

FROM install
RUN deno cache main.ts

CMD ["run", "--allow-all", "--unstable-cron", "--env", "main.ts"]

## Install nGit
#ARG NGIT_VERSION=v1.6.0
#ADD https://github.com/DanConwayDev/ngit-cli/releases/download/${NGIT_VERSION}/ngit-${NGIT_VERSION}-x86_64-unknown-linux-gnu.tar.gz ./ngit.tar.gz
#
#RUN mkdir ngit && \
#    tar zxvf ./ngit.tar.gz -C ./ngit/ && \
#    chmod +x ./ngit/git-remote-nostr && \
#    chmod +x ./ngit/ngit
#ENV PATH="$PATH:/app/ngit/"
