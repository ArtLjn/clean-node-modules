import { execSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  statSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { checkbox } from "@inquirer/prompts";
import pc from "picocolors";

// 扫描时跳过的目录名
const SKIP_DIRS = new Set([
  "node_modules",
  ".Trash",
  ".cache",
  ".npm",
  ".yarn",
  ".pnp",
  "Library",
  ".vscode",
  ".cursor",
  ".claude",
  ".git",
  "DerivedData",
  ".gradle",
  ".m2",
  ".cargo",
  ".rustup",
  ".docker",
  ".colima",
  ".orbstack",
]);

interface NodeModulesInfo {
  path: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  return (bytes / 1024).toFixed(0) + " KB";
}

function getDirSize(dirPath: string): number {
  try {
    const result = execSync(`du -sk "${dirPath}" 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    const kb = parseInt(result.split("\t")[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}

function getGlobalNodeModulesPaths(): string[] {
  const paths: string[] = [];
  try {
    const prefix = execSync("npm prefix -g", { encoding: "utf-8" }).trim();
    const nm = join(prefix, "lib", "node_modules");
    if (existsSync(nm)) paths.push(nm);
  } catch {}
  return paths;
}

function scanNodeModules(rootDir: string): NodeModulesInfo[] {
  const results: NodeModulesInfo[] = [];
  const visited = new Set<string>();

  function walk(dir: string, depth: number) {
    if (depth > 20) return;

    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") && depth > 0) continue;
      if (SKIP_DIRS.has(entry.name) && entry.name !== "node_modules") continue;

      const fullPath = join(dir, entry.name);

      if (entry.name === "node_modules") {
        if (visited.has(fullPath)) continue;
        visited.add(fullPath);

        const size = getDirSize(fullPath);
        if (size > 0) {
          results.push({ path: fullPath, size });
        }
        continue;
      }

      try {
        const realPath = statSync(fullPath).isSymbolicLink()
          ? fullPath
          : undefined;
        if (realPath && visited.has(realPath)) continue;
      } catch {}

      walk(fullPath, depth + 1);
    }
  }

  walk(rootDir, 0);
  return results;
}

function moveToTrash(dirPath: string): boolean {
  const trashBase = join(homedir(), ".Trash");
  let targetName = basename(dirPath);
  let targetPath = join(trashBase, targetName);

  // 处理同名冲突：追加时间戳
  if (existsSync(targetPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    targetName = `${basename(dirPath)}-${ts}`;
    targetPath = join(trashBase, targetName);
  }

  try {
    renameSync(dirPath, targetPath);

    const markerPath = join(
      dirPath.replace(/\/node_modules$/, ""),
      ".node_modules-trashed"
    );
    try {
      writeFileSync(
        markerPath,
        `node_modules was moved to Trash: ${targetPath}\nDate: ${new Date().toLocaleString()}\nRestore with: mv "${targetPath}" "${dirPath}"\n`
      );
    } catch {}

    return true;
  } catch {
    // rename 跨卷失败时，fallback 到 osascript
    try {
      execSync(
        `osascript -e 'tell application "Finder" to move POSIX file "${dirPath}" to trash'`,
        { timeout: 30000 }
      );
      return true;
    } catch {
      return false;
    }
  }
}

function parseArgs(): {
  includeGlobal: boolean;
  scanPath: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let includeGlobal = false;
  let dryRun = false;
  let scanPath = homedir();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-g" || args[i] === "--global") {
      includeGlobal = true;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--path" && args[i + 1]) {
      scanPath = args[++i];
    } else if (args[i] === "-h" || args[i] === "--help") {
      console.log(`
${pc.bold("clean-node-modules")} - 扫描并清理 node_modules

${pc.cyan("用法:")}
  clean-node-modules           扫描 Home 目录
  clean-node-modules -g        包含全局 node_modules
  clean-node-modules --path ~/projects  指定扫描目录
  clean-node-modules --dry-run 只展示，不清理
`);
      process.exit(0);
    }
  }

  return { includeGlobal, scanPath, dryRun };
}

async function main() {
  const { includeGlobal, scanPath, dryRun } = parseArgs();

  console.log(pc.bold("\n🔍 正在扫描 node_modules...\n"));
  if (scanPath !== homedir()) {
    console.log(pc.dim(`   扫描目录: ${scanPath}`));
  }

  // 扫描项目 node_modules
  const results = scanNodeModules(scanPath);

  // 扫描全局 node_modules
  if (includeGlobal) {
    const globalPaths = getGlobalNodeModulesPaths();
    for (const gp of globalPaths) {
      if (!results.some((r) => r.path === gp)) {
        const size = getDirSize(gp);
        if (size > 0) {
          results.push({ path: gp + " [global]", size });
        }
      }
    }
  }

  if (results.length === 0) {
    console.log(pc.green("✅ 没有找到 node_modules 目录！"));
    return;
  }

  // 按大小降序排列
  results.sort((a, b) => b.size - a.size);

  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  console.log(
    pc.dim(
      `   找到 ${results.length} 个 node_modules，总计 ${formatSize(totalSize)}\n`
    )
  );

  if (dryRun) {
    for (const r of results) {
      const sizeStr = formatSize(r.size);
      const padded = sizeStr.padStart(10);
      console.log(`   ${pc.yellow(padded)}  ${pc.dim(r.path)}`);
    }
    console.log(
      pc.dim(`\n   总计: ${formatSize(totalSize)} (--dry-run 模式，未执行清理)`)
    );
    return;
  }

  // 交互选择
  const choices = results.map((r) => ({
    name: `${formatSize(r.size).padStart(10)}  ${r.path.replace(homedir(), "~")}`,
    value: r.path,
    checked: false,
  }));

  const selected = await checkbox({
    message: "选择要清理的 node_modules（空格勾选，回车确认）：",
    choices,
    loop: false,
  });

  if (selected.length === 0) {
    console.log(pc.dim("\n   未选择任何目录，退出。"));
    return;
  }

  // 显示确认信息
  const selectedItems = results.filter((r) => selected.includes(r.path));
  const selectedSize = selectedItems.reduce((sum, r) => sum + r.size, 0);

  console.log(
    pc.cyan(
      `\n🗑️  即将移到废纸篓: ${selected.length} 个目录，共 ${formatSize(selectedSize)}\n`
    )
  );
  for (const item of selectedItems) {
    console.log(`   ${pc.red("×")} ${item.path.replace(homedir(), "~")}`);
  }
  console.log();

  // 执行清理
  let success = 0;
  let fail = 0;
  for (const item of selectedItems) {
    process.stdout.write(`   清理 ${item.path.replace(homedir(), "~")}... `);
    if (moveToTrash(item.path)) {
      console.log(pc.green("✓"));
      success++;
    } else {
      console.log(pc.red("✗ 失败"));
      fail++;
    }
  }

  console.log(
    pc.bold(
      `\n✅ 完成！成功清理 ${success} 个，释放 ${formatSize(selectedSize)}${
        fail > 0 ? pc.red(`，${fail} 个失败`) : ""
      }`
    )
  );
  console.log(pc.dim("   已移到废纸篓，可通过 Finder 恢复\n"));
}

main().catch((err) => {
  console.error(pc.red(`\n错误: ${err.message}`));
  process.exit(1);
});
