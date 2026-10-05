# Neodrive website

Marketing site for [NEODRIVE](https://store.steampowered.com/app/2804240), a high speed time-attack racing game.
Next.js (App Router) with live data from Steam: update posts from the news API and per-track leaderboards.

## Development

```bash
nix develop     # or direnv: node, pnpm
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # vitest, against recorded Steam fixtures in test/fixtures
pnpm lint
```

Optional: set `STEAM_API_KEY` (in `.env.local`) to look up player names and avatars with the Steam Web API.
Without it, each player's public profile XML is used instead.

## Deploying on NixOS

The flake exports a package (`packages.<system>.default`, a Next.js standalone server) and a NixOS module
(`nixosModules.default`) that runs it as a hardened systemd service behind nginx, with a Let's Encrypt
certificate from `security.acme`.

1. Point a DNS A/AAAA record for the subdomain at the server. The ACME HTTP challenge needs it.
2. In the server's flake:

   ```nix
   {
     inputs.neodrive-website.url = "github:BossCode45/neodrive-website";

     outputs = { nixpkgs, neodrive-website, ... }: {
       nixosConfigurations.server = nixpkgs.lib.nixosSystem {
         modules = [
           neodrive-website.nixosModules.default
           {
             services.neodrive-website = {
               enable = true;
               domain = "neodrive.example.com";
               # environmentFile = "/run/secrets/neodrive-website.env"; # STEAM_API_KEY=...
             };

             # Only if ACME isn't configured on the server yet:
             security.acme.acceptTerms = true;
             security.acme.defaults.email = "you@example.com";
           }
         ];
       };
     };
   }
   ```

3. `nixos-rebuild switch`. To deploy a new version later: `nix flake update neodrive-website && nixos-rebuild switch`.

Module options (`services.neodrive-website.*`):

| Option            | Default | Description                                                              |
|-------------------|---------|--------------------------------------------------------------------------|
| `enable`          | `false` | Run the site.                                                            |
| `domain`          | —       | nginx virtual host name.                                                 |
| `port`            | `3000`  | Port the Node server listens on, on 127.0.0.1 only.                      |
| `environmentFile` | `null`  | Extra environment (e.g. `STEAM_API_KEY`), kept out of the Nix store.     |
| `configureNginx`  | `true`  | Add the nginx vhost (`enableACME`, `forceSSL`, HSTS, static asset cache). |
| `package`         | flake   | The package to run.                                                      |

The service runs as a `DynamicUser`. The image optimizer cache is in `/var/cache/neodrive-website`.
Logs: `journalctl -u neodrive-website`.

### Updating dependencies

`nix/package.nix` pins the pnpm dependencies by hash. After changing `pnpm-lock.yaml`, set `hash = lib.fakeHash;`,
run `nix build`, and copy the hash it reports into the file.

### Checks

`nix flake check` builds the package (which runs the tests) and boots a NixOS VM with the module. The VM has no
network, so this also checks that every page still renders when Steam is unreachable.
