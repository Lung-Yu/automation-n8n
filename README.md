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
day2/sample-docs/     Lab B2 RAG 知識庫來源（IT Incident SOP、Network Runbook，跟 workflow JSON 內嵌內容一致）
scenarios/workflows/  進階情境 Adv 0-6（通知中心/告警去重/日報/Agentic Loop/信心度分流/PIR/多源上下文）
environment/          docker-compose.yml + env.example + mock-api/（每人一份 n8n + Qdrant + mock API，課堂自足）
assets/               mock-alert-payloads.json（Lab A 測試資料）+ all-workflows.json / all-final.json（整包匯入用）
docs/                 post-course-checklist.md（課後回 TSMC 換環境驗收清單）
```

## 使用方式

```bash
git clone -b tsmc-n8n-course https://github.com/Lung-Yu/automation-n8n.git tsmc-n8n-course
cd tsmc-n8n-course/environment
cp env.example .env   # 填入 Gemini API Key / Jira credential
docker compose up -d  # n8n（明確 pin 2.21.7）+ Qdrant + mock-api（port 3001）
```

進 n8n UI → Import from File，選對應 Day/Demo 的 workflow JSON。

**⚠️ Docker（非 Podman）注意**：workflow JSON 裡的 URL 全部寫死 `host.containers.internal:3001`（Podman 慣例）。`docker-compose.yml` 已加 `extra_hosts: host.containers.internal:host-gateway` 讓 Docker Desktop 也能解析這個名稱，不用改 workflow JSON。

## ✅ 2026-08-09：真實 Gemini API Key 全流程演練已完成

本機用真實 Key 實際跑過 Demo4/6/9 + Lab A/B1/B2 全部成功（Demo7 除外，見下）。過程中發現並修正 3 個原本會讓開課當天直接出錯的問題，**已全部修回本 repo 的 workflow JSON**：

1. **Gemini 模型名稱棄用**：`gemini-2.0-flash` / `text-embedding-004` 皆已回 404，全域改為 `gemini-2.5-flash` / `gemini-embedding-001`（embedding 需帶 `outputDimensionality: 768`）。
2. **HTTP body 序列化雙重編碼**：6 個用 `specifyBody:"string"` 呼叫 Gemini 的節點對真實 API 會 400，已改為 `specifyBody:"json"` + `jsonBody`。
3. **Lab A / Lab B1 回應解析路徑錯誤**：原本寫的是呼叫原始 REST API 才有的 `.candidates[0].content...` 形狀，但接的是 n8n 原生 Gemini 節點（形狀是 `.content.parts[0].text`），因為有防禦性 fallback，解析失敗不會報錯、只會靜默用通用文字蓋掉真正的 AI 分析內容——已修正。
4. `lab-b2-2-rag-query-workflow.json` 用到的 `Basic LLM Chain`（`lmChain`）節點型態在 n8n 2.21.7 不存在，已改用 HTTP Request 直呼 Gemini。

**已知未解決**：Demo 7（Tool Calling）AI Agent 節點報 `supplyData` 方法未定義，一般 HTTP Request 節點無法接到 `ai_tool` 輸入端，尚未排查出根因——開課前最高優先待辦。

詳細發現、真實測試數字（含 Lab B2 三題真實 RRF 分數）見 wiki `test-results.md`「2026-08-09 真實 Gemini API Key 端對端演練」章節。

## 其他待辦（不擋開課）

- Jira 開票尚未用真實 Atlassian 帳號驗證（Gemini 生成內容已驗證正確，只差最後一步）。
- AIN 教室 10 人壓測尚未執行。
- 部分進階 Demo（8/10/11/12/13）與情境（Adv 0-6）缺真實操作截圖，見 wiki `screenshot-todo.md`。

## 對應 wiki 文件

- 課程教材工作區索引：`wiki/workspace/tsmc-n8n-course/index.md`
- 開發日誌（設計決策、踩坑）：`wiki/analyses/tsmc-n8n-course-dev.md`
- 測試紀錄：`wiki/workspace/tsmc-n8n-course/test-results.md`
- 投影片、講稿、Lab 操作手冊：`wiki/workspace/tsmc-n8n-course/day1/`、`day2/`
