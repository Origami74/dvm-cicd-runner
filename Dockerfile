FROM denoland/deno AS install

WORKDIR /app

# Install git
RUN apt update && \
    apt install -y git libc6 curl build-essential pkg-config libssl-dev

# Install nGit
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install ngit

RUN curl https://google.com
# Install Act
RUN curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | bash
ENV PATH="$PATH:/app/bin/"

FROM install

ADD . /app
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
