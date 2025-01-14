# DVM CI/CD

## Prerequisistes
- Deno is installed
- [nGit](https://gitworkshop.dev) is installed
- [Act runner](https://nektosact.com/installation/homebrew.html) is installed


## Executing:
```shell
run --env --allow-read --allow-write --allow-net --allow-run --allow-sys --allow-env 
```

## DVM request example:

Note: `git_address` is of this very repository
```json
{
  "kind": 5900,
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