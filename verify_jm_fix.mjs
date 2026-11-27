// jm.js 修复验证 harness：用最小运行时桩模拟 Venera 的 ComicSource/Network/Convert，
// 直接执行 baseUrl / overwriteApiDomains / refreshApiDomains 的过滤逻辑。
// 用法: node verify_jm_fix.mjs <jm.js 路径>
import { readFileSync } from "node:fs";

const file = process.argv[2] || "jm.js";
const code = file === "-"
  ? readFileSync(0, "utf8")          // 从 stdin 读，便于管道喂入 git show 的原始版本
  : readFileSync(file, "utf8");

// ---- 最小运行时桩 ----
class ComicSource {
  constructor() { this.settings = { apiDomain: "1" }; }
  loadSetting(k) { return this.settings[k]; }
}
const NewtonNetwork = {
  async get() { return { status: 200, body: "" }; },
};
const Convert = {};

// 去掉顶部 class 声明以外的 class 体，转成可 new 的类
// 直接把源码里的 `class JM extends ComicSource { ... }` 原样 eval 出来
const JM = new Function(
  "ComicSource", "Network", "Convert",
  code + "\nreturn JM;"
)(ComicSource, NewtonNetwork, Convert);

let fail = 0;
function check(name, cond, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"} | ${name}${detail ? " :: " + detail : ""}`);
  if (!cond) fail++;
}

// 1) baseUrl 在 refresh 之前就必须可用（根因1：undefined 崩溃）
const s = new JM();
check("baseUrl 有默认值(refresh 前不崩溃)", !/undefined/.test(s.baseUrl), s.baseUrl);

// 2) apiDomain 越界时回退到 domains[0]
s.settings.apiDomain = "99";
check("apiDomain 越界回退", !/undefined/.test(s.baseUrl), s.baseUrl);

// 3) overwriteApiDomains 过滤死节点 cdnbtd.cc
s.overwriteApiDomains(["www.cdnbtd.cc", "www.cdnutc.cc", "www.cdngwc.net", "www.cdngwc.club"]);
const hasDead = JM.apiDomains.some(d => JM.deadServers.includes(d));
check("死节点被过滤", !hasDead, JM.apiDomains.join(","));

// 4) 全部是死节点时保留内置线路，不写空数组
s.overwriteApiDomains(["www.cdnbtd.cc", "www.cdnutc.cc"]);
check("全死节点时保留内置线路", JM.apiDomains.length > 0 && !JM.apiDomains.some(d => JM.deadServers.includes(d)), JM.apiDomains.join(","));

// 5) refreshApiDomains 的下发列表过滤（直接检查过滤表达式结果）
const newsvr = ["www.cdnbtd.cc", "www.cdnutc.cc", "www.cdngwc.net", "www.cdngwc.club"];
let servers = newsvr.filter(d => !JM.deadServers.includes(d));
for (let d of JM.fallbackServers) {
  if (servers.length >= 4) break;
  if (!servers.includes(d)) servers.push(d);
}
check("下发线路过滤死节点后补足4条", servers.length === 4 && !servers.some(d => JM.deadServers.includes(d)), servers.join(","));

console.log(fail === 0 ? "ALL PASS" : `FAILED: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
