#!/usr/bin/env bash
# 回滚 jm.js / index.json / _source_overrides.json 到修复前版本（git HEAD = 36daf74 基线）。
# 在原工作区直接执行：bash ROLLBACK.sh
set -e
cd "$(dirname "$0")"

echo "[rollback] 还原 jm.js / index.json / _source_overrides.json 到 HEAD..."
git checkout HEAD -- jm.js index.json _source_overrides.json

echo "[rollback] 校验还原后哈希与基线一致..."
git diff --quiet HEAD -- jm.js index.json _source_overrides.json \
  && echo "[rollback] OK: 工作区已与 HEAD 一致（缺陷回归）" \
  || { echo "[rollback] FAIL: 仍有差异"; exit 1; }

echo "[rollback] 重跑 harness 应复现 TypeError（缺陷回归验证）："
git show HEAD:jm.js | node verify_jm_fix.mjs - || echo "[rollback] 预期：原始版仍崩溃，回滚成功"
