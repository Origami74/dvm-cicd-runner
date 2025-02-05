# DVM CI/CD

## Prerequisistes
- Deno is installed
- [nGit](https://gitworkshop.dev) is installed
- [Act runner](https://nektosact.com/installation/homebrew.html) is installed


## Executing:
```shell
deno run --env --allow-read --allow-write --allow-net --allow-run --allow-sys --allow-env --unstable-cron main.ts
```

## DVM request example:

Note: `git_address` is of this very repository
```json
{
  "kind": 5600,
  "tags": [
    [
      "param",
      "git_address",
      "naddr1qvzqqqrhnypzpwa4mkswz4t8j70s2s6q00wzqv7k7zamxrmj2y4fs88aktcfuf68qy88wumn8ghj7mn0wvhxcmmv9uq32amnwvaz7tmjv4kxz7fwv3sk6atn9e5k7tcpz9mhxue69uhkummnw3ezuamfdejj7qq0v3mx6ttrd93kgttjw4hxuetj4ux9zv"
    ],
    [
      "param",
      "git_ref",
      "main"
    ],
    [
      "param",
      "pipeline_filepath",
      ".github/workflows/ci.yaml"
    ]
  ],
  "content": ""
}
```

### Query for responses
```json
{
  "authors": ["DVM-pubkey"],
  "kinds": [
    6900
  ]
}
```

## Running using docker

```shell
docker run -v /var/run/docker.sock:/var/run/docker.sock --privileged --env-file .env dvm-ci-cd-runner
```

build & push to vps
```shell
docker build . --platform linux/amd64 --tag ngit-test && \
docker save ngit-test > ngit-test.tar && \
scp -O ngit-test.tar admin@x.x.x.x:/tmp/ngit-test.tar && \
scp -O .env admin@x.x.x.x:/tmp/.env 

# On remote machine
cd /tmp && \ 
docker image load -i ngit-test.tar && \
docker run -v /var/run/docker.sock:/var/run/docker.sock --privileged --env-file .env ngit-test
```