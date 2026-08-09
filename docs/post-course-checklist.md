# 課後回 TSMC 換環境指引

> 本文件給學員課後帶回去用。  
> 課堂環境（個人 API Key + Jira Cloud + mock API）→ 換成 TSMC 內部系統，workflow 本身不需重寫。

---

## 概覽：需要換的三件事

| 項目 | 課堂用 | 回 TSMC 換成 |
|------|--------|------------|
| AI 模型 API | Google AI Studio 個人 Key | TSMC 內部 Gemini API token |
| Ticket 系統 | Jira Cloud（免費帳號）| TSMC 內部 ticket 系統 |
| 設備狀態 API | mock API（localhost:3001）| TSMC 內部監控 API |

---

## Step 1：取得 TSMC 內部 Gemini API Token

請向你的主管或 IT 部門確認以下資訊：

| 資訊 | 說明 |
|------|------|
| **API Endpoint** | TSMC 的 Gemini 代理 URL（不是 Google 官方的 generativelanguage.googleapis.com）|
| **Token / API Key** | TSMC 發放的授權 token |
| **Model 名稱** | 確認可用的 model（可能與課堂的 `models/gemini-2.0-flash` 不同）|
| **Rate Limit** | 每分鐘允許多少 requests（影響 Lab B2 RAG 索引時的 Loop 速度）|

> **注意**：如果 TSMC 的端點需要特殊的 Header（例如 `X-API-Key` 而不是 URL query param），  
> 需要同步修改 n8n 的 HTTP Request 節點 Auth 設定。

---

## Step 2：更新 n8n Credential

### 2a. 更新 Gemini HTTP Request（Lab A / Lab B1 / Lab B2）

Lab A、Lab B1、Lab B2 呼叫 Gemini 的方式是 **直接 HTTP Request**，URL 和 Key 放在節點裡。

找到所有呼叫 Gemini 的 HTTP Request 節點，更新：

**課堂設定（需要改）**
```
Method: POST
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSy...
```

**改成 TSMC 內部（依實際資訊填入）**
```
Method: POST
URL: https://[TSMC_GEMINI_ENDPOINT]/v1beta/models/[MODEL_NAME]:generateContent
Headers: Authorization: Bearer [YOUR_TSMC_GEMINI_TOKEN]
         （或依 TSMC 規格改成 X-API-Key / 其他 header）
```

> **操作步驟**：  
> 1. n8n → Workflows → 找到 Lab A / Lab B1 / Lab B2 Query  
> 2. 點開 HTTP Request 節點（名稱含 "Gemini"）  
> 3. 修改 URL，把 `?key=...` 改成 Header Auth  
> 4. Test Step 確認回傳正確

---

### 2b. 更新 AI Agent 的 Gemini Credential（Demo 6 / Demo 7 / Demo 8-12 / Demo 13）

Demo 6–13 使用 **Gemini Chat Model 節點**，Credential 集中管理。

1. n8n → Settings → Credentials → 找到「Google Gemini(PaLM) Api account」
2. 點進去，更新：
   - **API Key**：換成 TSMC 內部 token
   - 如果 TSMC endpoint 不同，需確認該 Credential 類型是否支援自訂 endpoint  
     （若不支援，改用 HTTP Request + Header Auth 的方式呼叫）

---

## Step 3：更新 Ticket 系統

### 課堂用：Jira Cloud（個人帳號）

```
POST https://YOUR-DOMAIN.atlassian.net/rest/api/2/issue
Auth: Basic (your-email@gmail.com + Atlassian API token)
```

### 換成 TSMC 內部 Ticket 系統

請向 IT 部門確認：

| 資訊 | 說明 |
|------|------|
| **API Endpoint** | 例如：`https://jira.tsmc.com/rest/api/2/issue` 或其他 |
| **Auth 方式** | Bearer token / Basic / API key（各廠商不同）|
| **Project Key** | TSMC 內部 project 代號（替換課堂的 `"IT-DEMO"`）|
| **Issue Type** | 確認「Incident」在 TSMC 系統中的正確名稱 |

**更新位置**（n8n 裡）：
- Lab A 的「Jira: Create Issue」HTTP Request 節點
- Lab B1 的「Jira: Create Issue」HTTP Request 節點
- Demo 13 的「Tool B：開 Jira 告警單」HTTP Request 節點

---

## Step 4：更新設備狀態 API

課堂用的 mock API（localhost:3001）回傳假資料。換成真實監控系統後，需確認：

| 項目 | 課堂 | 換成 TSMC 後 |
|------|------|------------|
| Base URL | `http://host.containers.internal:3001` | `https://[TSMC_MONITORING_URL]` |
| 設備狀態端點 | `/api/devices/:host` | 依實際 API 文件 |
| 告警端點 | `/api/alerts` | 依實際 API 文件 |
| Auth | 無（mock 不需要）| 依實際系統 |

> **建議**：先在 n8n 用 HTTP Request 手動測試 TSMC 監控 API，確認回傳格式後，再更新 Lab A / Demo 7 / Demo 13 的節點。  
> 如果 TSMC API 的欄位名稱不同（例如回傳 `cpuUsage` 而不是 `cpu`），需同步更新 Code 節點裡的欄位讀取邏輯。

---

## Step 5：更新 n8n 環境變數（選擇性）

如果在 TSMC 環境用 Docker/Podman 部署 n8n，可以把常用的 token 放進環境變數，避免直接在 workflow 裡暴露：

```env
# .env（不要 commit 到 git）
TSMC_GEMINI_TOKEN=your_token_here
TSMC_JIRA_URL=https://jira.tsmc.com
TSMC_JIRA_TOKEN=your_jira_token_here
```

在 n8n HTTP Request 節點用 `={{ $env.TSMC_GEMINI_TOKEN }}` 讀取。

---

## 完成後驗收清單

每換完一個系統，用這個測試順序驗收：

```
□ 1. 呼叫 Gemini API（用 Lab B1 的第一個節點單獨測試）
      → 確認回傳 {"candidates": [...]} 而不是 401/403

□ 2. 查詢設備狀態（Demo 7 的 Tool 1 單獨 Test Step）
      → 確認回傳設備 CPU/Memory 數值

□ 3. 開 Jira/Ticket（Lab A 最後節點單獨 Test Step，先測 Critical 告警）
      → 確認回傳 ticket key（例如 IT-001）

□ 4. Lab A 全流程端對端（Webhook → Gemini → Ticket）
      → 確認 execution status = success

□ 5. Lab B2 RAG 查詢（輸入「BGP neighbor down 怎麼排查」）
      → 確認回傳文件片段 + Gemini 生成的建議
```

---

## 常見問題

**Q：課堂的 workflow JSON 可以直接帶回 TSMC 用嗎？**  
A：可以匯入，但需要重建 Credentials（token 不跟著 JSON 走）。匯入後 Gemini/Jira 節點會顯示「credential missing」，依上面步驟設定即可。

**Q：Qdrant 向量資料庫需要另外部署嗎？**  
A：課堂用 Docker in-memory 模式，重啟就清空。TSMC 如果要持久化知識庫，建議改用 `storage: local`（掛載 volume）或部署獨立的 Qdrant 服務。

**Q：Lab B2 的 SOP 文件可以換成 TSMC 真實的 Runbook 嗎？**  
A：可以。把 `day2/sample-docs/` 裡的 markdown 換成 TSMC 的文件，重新跑 Lab B2-1（RAG Index）建索引即可。查詢 workflow（Lab B2-2）不需改動。

**Q：n8n 在 TSMC 環境需要設定 HTTPS 嗎？**  
A：課堂用 `N8N_SECURE_COOKIE=false` 是為了方便 local 開發。生產環境建議啟用 HTTPS + 設定 `N8N_HOST` 和 `N8N_WEBHOOK_URL`，細節見 n8n 官方 deployment 文件。
