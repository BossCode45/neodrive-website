self:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.neodrive-website;
  inherit (lib)
    mkEnableOption
    mkIf
    mkOption
    types
    ;
in
{
  options.services.neodrive-website = {
    enable = mkEnableOption "the NEODRIVE website";

    package = mkOption {
      type = types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
      defaultText = lib.literalExpression "neodrive-website.packages.\${system}.default";
      description = "The neodrive-website package to run.";
    };

    domain = mkOption {
      type = types.str;
      example = "neodrive.example.com";
      description = "Domain of the nginx virtual host.";
    };

    port = mkOption {
      type = types.port;
      default = 3000;
      description = "Port the Next.js server listens on, on 127.0.0.1.";
    };

    environmentFile = mkOption {
      type = types.nullOr types.path;
      default = null;
      example = "/run/secrets/neodrive-website.env";
      description = ''
        File with extra environment variables, loaded by systemd and kept out of the Nix store.
        Set `STEAM_API_KEY=...` here to look up player names and avatars with the Steam Web API.
      '';
    };

    configureNginx = mkOption {
      type = types.bool;
      default = true;
      description = "Whether to add an nginx virtual host with a Let's Encrypt certificate (security.acme) for `domain`.";
    };
  };

  config = mkIf cfg.enable {
    systemd.services.neodrive-website = {
      description = "NEODRIVE website";
      wantedBy = [ "multi-user.target" ];
      wants = [ "network-online.target" ];
      after = [ "network-online.target" ];

      environment = {
        PORT = toString cfg.port;
        HOSTNAME = "127.0.0.1";
      };

      serviceConfig = {
        ExecStart = lib.getExe cfg.package;
        EnvironmentFile = mkIf (cfg.environmentFile != null) cfg.environmentFile;
        Restart = "on-failure";
        RestartSec = 5;

        DynamicUser = true;
        # The package symlinks .next/cache here (image optimizer cache).
        CacheDirectory = "neodrive-website";

        # Hardening. No MemoryDenyWriteExecute: V8's JIT needs writable + executable memory.
        CapabilityBoundingSet = "";
        NoNewPrivileges = true;
        PrivateTmp = true;
        PrivateDevices = true;
        PrivateMounts = true;
        PrivateUsers = true;
        ProtectClock = true;
        ProtectControlGroups = true;
        ProtectHome = true;
        ProtectHostname = true;
        ProtectKernelLogs = true;
        ProtectKernelModules = true;
        ProtectKernelTunables = true;
        RestrictAddressFamilies = [
          "AF_INET"
          "AF_INET6"
        ];
        RestrictNamespaces = true;
        RestrictRealtime = true;
        RestrictSUIDSGID = true;
        LockPersonality = true;
        SystemCallArchitectures = "native";
      };
    };

    services.nginx = mkIf cfg.configureNginx {
      enable = true;
      virtualHosts.${cfg.domain} = {
        enableACME = true;
        forceSSL = true;
        extraConfig = ''
          add_header Strict-Transport-Security "max-age=31536000" always;
        '';

        locations."/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.port}";
          recommendedProxySettings = true;
          # Let streamed responses (Suspense on the home page) through as they render.
          extraConfig = ''
            proxy_buffering off;
          '';
        };

        # Hashed build assets, served straight from the store.
        locations."/_next/static/" = {
          alias = "${cfg.package}/share/neodrive-website/.next/static/";
          extraConfig = ''
            add_header Cache-Control "public, max-age=31536000, immutable";
          '';
        };
      };
    };
  };
}
