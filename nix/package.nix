{
  lib,
  stdenvNoCC,
  nodejs,
  nodejs-slim,
  pnpm,
  fetchPnpmDeps,
  pnpmConfigHook,
  makeWrapper,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "neodrive-website";
  version = "0.1.0";

  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../src
      ../public
      ../test
      ../package.json
      ../pnpm-lock.yaml
      ../pnpm-workspace.yaml
      ../next.config.ts
      ../tsconfig.json
      ../vitest.config.mts
    ];
  };

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 4;
    hash = "sha256-upeRkwUiwQSEabVIUY3SkdpZfsvTtmXncspdqoMiMQ8=";
  };

  nativeBuildInputs = [
    nodejs
    pnpm
    pnpmConfigHook
    makeWrapper
  ];

  env.NEXT_TELEMETRY_DISABLED = "1";

  buildPhase = ''
    runHook preBuild
    pnpm build
    runHook postBuild
  '';

  doCheck = true;
  checkPhase = ''
    runHook preCheck
    pnpm test
    runHook postCheck
  '';

  installPhase = ''
    runHook preInstall

    app=$out/share/neodrive-website
    mkdir -p $out/share
    cp -r .next/standalone $app
    cp -r .next/static $app/.next/static
    cp -r public $app/public

    # The image optimizer writes to .next/cache, which can't live in the read-only store.
    # The NixOS module provides this directory (systemd CacheDirectory).
    rm -rf $app/.next/cache
    ln -s /var/cache/neodrive-website $app/.next/cache

    # Runtime only needs node itself, not npm or the headers in the full nodejs package.
    makeWrapper ${lib.getExe nodejs-slim} $out/bin/neodrive-website \
      --add-flags $app/server.js \
      --set NODE_ENV production \
      --set NEXT_TELEMETRY_DISABLED 1

    runHook postInstall
  '';

  meta = {
    description = "Marketing site for NEODRIVE, a time-attack racing game";
    homepage = "https://github.com/BossCode45/neodrive-website";
    platforms = lib.platforms.linux;
    mainProgram = "neodrive-website";
  };
})
