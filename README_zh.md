<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:2F81F7,100:06b6d4&height=180&section=header&text=clean-node-modules&fontSize=36&fontColor=ffffff&animation=fadeIn&fontAlignY=32&desc=%E6%89%AB%E6%8F%8F%E5%B9%B6%E5%AE%89%E5%85%A8%E6%B8%85%E7%90%86%20node_modules&descSize=16&descAlignY=52" width="100%" />
</p>

<p align="center">
  <b>简体中文</b> | <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/node-%3E%3D16-green?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" />
  <img src="https://img.shields.io/badge/trash-%E2%88%9E-orange?style=flat-square" />
</p>

## 功能

- **扫描** — 递归查找 Home 目录下所有 `node_modules`
- **交互选择** — 空格勾选，回车确认，支持多选
- **安全清理** — 移到 macOS 废纸篓（可通过 Finder 恢复），绝不 `rm -rf`
- **智能跳过** — 自动跳过 `.Trash`、`Library`、`.cache` 等系统目录
- **灵活配置** — 支持自定义扫描路径、全局模式、预览模式

## 安装

```bash
# npm（推荐）
npx @morningljn/clean-node-modules          # 直接运行
npm i -g @morningljn/clean-node-modules     # 全局安装，命令：cnm

# 或从源码构建
git clone https://github.com/ArtLjn/clean-node-modules.git
cd clean-node-modules
npm install && npm run build
cp dist/index.js ~/.local/bin/cnm && chmod +x ~/.local/bin/cnm
```

## 使用

```bash
cnm                          # 扫描 Home 目录，交互选择清理
cnm --dry-run                # 仅预览，不执行清理
cnm -g                       # 包含全局 node_modules
cnm --path ~/projects        # 扫描指定目录
cnm -h                       # 帮助信息
```

## 工作原理

1. 递归遍历目录树（最大深度 20）
2. 跳过 `.Trash`、`Library`、`.cache` 等系统目录
3. 通过 `du -sk` 计算每个 `node_modules` 的大小
4. 按大小降序展示，支持交互式多选
5. 将选中目录移动到 `~/.Trash/`（自动处理同名冲突）
6. 跨卷时回退到 `osascript` 调用 Finder 移动

## 恢复

清理后的目录会进入 macOS 废纸篓。原项目目录会生成 `.node_modules-trashed` 标记文件，包含恢复命令：

```bash
# 示例恢复
mv ~/.Trash/node_modules "/path/to/project/node_modules"
```

## 许可证

[MIT](./LICENSE)

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:2F81F7,100:06b6d4&height=100&section=footer" width="100%" />
</p>
