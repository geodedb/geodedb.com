{
  description = "Geode Database Documentation Website";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            hugo
            dart-sass
            nodePackages.npm
            nodejs
            git
          ];

          shellHook = ''
            echo "Geode Documentation Development Environment"
            echo "Hugo version: $(hugo version)"
            echo "Dart Sass version: $(sass --version)"
            echo ""
            echo "Available commands:"
            echo "  make serve  - Start development server"
            echo "  make build  - Build production site"
            echo ""
          '';
        };

        packages.default = pkgs.stdenv.mkDerivation {
          pname = "geodedb-docs";
          version = "0.1.0";
          src = ./.;

          buildInputs = with pkgs; [
            hugo
            dart-sass
            nodePackages.npm
            nodejs
          ];

          buildPhase = ''
            export HOME=$TMPDIR
            hugo --minify --gc -b https://geodedb.com
          '';

          installPhase = ''
            mkdir -p $out
            cp -r public/* $out/
          '';
        };
      }
    );
}
