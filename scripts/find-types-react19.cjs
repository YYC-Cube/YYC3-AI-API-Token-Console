// 临时脚本: 找出依赖 @types/react@19 的消费者
const fs = require("fs");
const path = require("path");
const dir = path.resolve(__dirname, "..", "node_modules", ".pnpm");
for (const d of fs.readdirSync(dir)) {
  if (d.includes("@types+react")) continue;
  const pj = path.join(dir, d, "node_modules", "@types", "react", "package.json");
  try {
    if (fs.existsSync(pj)) {
      const v = JSON.parse(fs.readFileSync(pj, "utf8")).version;
      if (v.startsWith("19.")) console.log("CONSUMER:", d);
    }
  } catch {
    // ignore: 依赖目录读取失败不阻断扫描
  }
}
console.log("scan done");
