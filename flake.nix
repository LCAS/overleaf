{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv.url = "github:cachix/devenv";
  };

  outputs = inputs@{ flake-parts, ... }: flake-parts.lib.mkFlake { inherit inputs; } {
    imports = [ inputs.devenv.flakeModule ];
    systems = [ "x86_64-linux" "aarch64-darwin" ];
    perSystem = { config, self', inputs', pkgs, system, ... }: {

      devenv.shells.default = {
        languages.javascript.enable = true;
        packages = [ pkgs.gnumake pkgs.gcc ];
        enterShell = ''
          echo "Hello World"
        '';
      };

    };
  };
}
