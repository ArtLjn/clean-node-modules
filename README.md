<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:2F81F7,100:06b6d4&height=180&section=header&text=clean-node-modules&fontSize=36&fontColor=ffffff&animation=fadeIn&fontAlignY=32&desc=Scan%20and%20clean%20node_modules%20safely%20on%20macOS&descSize=16&descAlignY=52" width="100%" />
</p>

<p align="center">
  <a href="./README_zh.md">简体中文</a> | <b>English</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/node-%3E%3D16-green?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" />
  <img src="https://img.shields.io/badge/trash-%E2%88%9E-orange?style=flat-square" />
</p>

## Features

- **Scan** — Recursively find all `node_modules` under your home directory
- **Interactive** — Multi-select with space bar, confirm with enter
- **Safe** — Moves to macOS Trash (recoverable via Finder), never `rm -rf`
- **Smart** — Skips system dirs (`.Trash`, `Library`, `.cache`, etc.)
- **Flexible** — Custom scan path, global mode, dry-run supported

## Install

```bash
# Clone and build
git clone https://github.com/ArtLjn/clean-node-modules.git
cd clean-node-modules
npm install && npm run build

# Copy to PATH
cp dist/index.cjs ~/.local/bin/cnm && chmod +x ~/.local/bin/cnm
```

## Usage

```bash
cnm                          # Scan home directory, select to clean
cnm --dry-run                # Preview only, no changes
cnm -g                       # Include global node_modules
cnm --path ~/projects        # Scan a specific directory
cnm -h                       # Help
```

## How It Works

1. Recursively walks your directory tree (max depth 20)
2. Skips `.Trash`, `Library`, `.cache`, and other system directories
3. Calculates each `node_modules` size via `du -sk`
4. Displays sorted list with interactive checkbox selection
5. Moves selected directories to `~/.Trash/` (with conflict handling)
6. Falls back to `osascript` Finder move if cross-volume rename fails

## Recovery

Cleaned directories go to macOS Trash. A `.node_modules-trashed` marker file is left in the original project directory with the restore command:

```bash
# Example restore
mv ~/.Trash/node_modules "/path/to/project/node_modules"
```

## License

[MIT](./LICENSE)

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:2F81F7,100:06b6d4&height=100&section=footer" width="100%" />
</p>
