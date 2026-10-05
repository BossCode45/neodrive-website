{
  description = "Neodrive website";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      linuxSystems = [ "x86_64-linux" "aarch64-linux" ];
      forSystems = systems: f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forSystems linuxSystems (pkgs: {
        default = pkgs.callPackage ./nix/package.nix { };
      });

      nixosModules.default = import ./nix/module.nix self;

      checks = forSystems linuxSystems (pkgs: {
        module = pkgs.testers.runNixOSTest {
          name = "neodrive-website";
          nodes.machine = {
            imports = [ self.nixosModules.default ];
            services.neodrive-website = {
              enable = true;
              domain = "neodrive.test";
              configureNginx = false;
            };
          };
          # The VM has no network, so Steam is unreachable: pages must still render their fallbacks.
          testScript = ''
            machine.wait_for_unit("neodrive-website.service")
            machine.wait_for_open_port(3000)

            def status(path):
                return machine.succeed(f"curl -s -o /dev/null -w '%{{http_code}}' 'http://127.0.0.1:3000{path}'").strip()

            for path in ["/", "/updates", "/leaderboard", "/leaderboard/1-01"]:
                assert status(path) == "200", f"{path} returned {status(path)}"
            assert status("/no-such-page") == "404"

            assert status("/_next/image?url=%2Fimages%2Fhero.png&w=640&q=75") == "200"
            machine.succeed("test -n \"$(ls -A /var/cache/neodrive-website/images)\"")

            headers = machine.succeed("curl -sI http://127.0.0.1:3000/")
            assert "nosniff" in headers
            assert "x-powered-by" not in headers.lower()
          '';
        };
      });

      devShells = forSystems systems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs
            pkgs.pnpm
            pkgs.typescript-language-server
          ];
        };
      });
    };
}
