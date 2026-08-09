# TSMC n8n AI 自動化班 — 課程教材 Repo

> Branch：`tsmc-n8n-course`（獨立於 `master` / `feature/mcp` 的其他實驗內容）
> 全智網 × TSMC IT 維運部門，14hr / 2 天實戰班。
> 教學設計、講稿、投影片、開發日誌維護在 wiki（`tygrus-llm-wiki` repo，`wiki/workspace/tsmc-n8n-course/`），本 repo 只放**可直接匯入 n8n 的 workflow JSON + 環境設定**，方便教室機器直接 `git clone` 使用。

---

## 目錄結構

```
day1/workflows/       Demo 1/2/5 + Lab A（Alert → AI → Jira）
day2/workflows/       Demo 3/4/6/7/8/9/10/11/12 + Lab B1/B2（RAG：Qdrant + BM25 + RRF）
day2/mcp-bonus/       Demo 13（MCP 標準化工具串接，選讀加碼教材，不排入正課）
scenarios/workflows/  進階情境 Adv 0-6（通知中心/告警去重/日報/Agentic Loop/信心度分流/PIR/多源上下文）
environment/          docker-compose.yml + env.example（每人一份 n8n + Qdrant，課堂自足）
assets/               mock-alert-payloads.json（Lab A 測試資料）+ all-workflows.json / all-final.json（整包匯入用）
docs/                 post-course-checklist.md（課後回 TSMC 換環境驗收清單）
```

## 使用方式

```bash
git clone -b tsmc-n8n-course https://github.com/Lung-Yu/automation-n8n.git tsmc-n8n-course
cd tsmc-n8n-course/environment
cp env.example .env   # 填入 Gemini API Key / Jira credential
docker compose up -d
```

進 n8n UI → Import from File，選對應 Day/Demo 的 workflow JSON。

## ⚠️ 已知缺口

- 沒有 `mock-api/server.js`（模擬設備狀態 API，8 台設備）與 `sample-docs/`（Lab B2 RAG 知識庫來源：IT Incident SOP、Network Runbook）。這兩份東西在課程開發日誌（`analyses/tsmc-n8n-course-dev.md`）裡被提到存在於一個從未推上 GitHub 的本機 repo（`tsmc-n8n-workshop`，另一台機器上），內容已經遺失，需要重建才能讓 Lab A / Lab B2 完整跑起來。
- 真實 Gemini API Key、Jira 開票、10 人教室壓測皆尚未驗證，見 wiki `test-results.md`。
- 部分 Demo（4/6/7/8/9/10/11/12/13）與進階情境（Adv 0-6）缺真實操作截圖，見 wiki `screenshot-todo.md`。

## 對應 wiki 文件

- 課程教材工作區索引：`wiki/workspace/tsmc-n8n-course/index.md`
- 開發日誌（設計決策、踩坑）：`wiki/analyses/tsmc-n8n-course-dev.md`
- 投影片、講稿、Lab 操作手冊：`wiki/workspace/tsmc-n8n-course/day1/`、`day2/`
