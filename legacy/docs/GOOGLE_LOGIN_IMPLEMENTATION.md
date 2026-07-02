# Google 登入實作說明

## 概述

本專案已成功實作 Google OAuth 2.0 登入功能，讓使用者可以使用 Google 帳號快速登入 Newledge 平台。

## 功能特色

- ✅ Google OAuth 2.0 登入流程
- ✅ 使用者頭像和名字顯示
- ✅ 響應式設計（桌面和行動裝置）
- ✅ 完整的登入/登出流程
- ✅ 錯誤處理和載入狀態
- ✅ 本地儲存 token 管理
- ✅ BDD 測試覆蓋

## 技術架構

### 前端架構

```
src/
├── components/
│   ├── GoogleLoginButton.tsx    # Google 登入按鈕
│   ├── UserAvatar.tsx          # 使用者頭像組件
│   └── Navbar.tsx              # 導航欄（已更新）
├── contexts/
│   └── AuthContext.tsx         # 認證上下文
├── services/
│   └── authService.ts          # 認證服務
├── types/
│   └── User.ts                 # 使用者類型定義
└── app/
    ├── login/
    │   └── page.tsx            # 登入頁面
    └── auth/
        └── callback/
            └── page.tsx        # OAuth 回調頁面
```

### 後端 API 端點

根據 OpenAPI 規格，使用以下端點：

- `GET /auth/google/login` - 取得 Google OAuth URL
- `GET /auth/google/callback` - 處理 OAuth 回調
- `POST /auth/token` - 交換 OAuth code 為 access token
- `GET /api/v1/users` - 取得使用者資料

## 實作細節

### 1. Google 登入流程

1. 使用者點擊「使用 Google 登入」按鈕
2. 前端呼叫 `/auth/google/login` 取得 OAuth URL
3. 重導向到 Google OAuth 頁面
4. 使用者授權後，Google 重導向回 `/auth/callback`
5. 前端處理回調，呼叫 `/auth/token` 交換 token
6. 使用 token 呼叫 `/api/v1/users` 取得使用者資料
7. 儲存認證狀態並重導向到首頁

### 2. 使用者介面

#### 登入頁面 (`/login`)
- 美觀的登入介面
- Google 登入按鈕
- 功能特色介紹
- 響應式設計

#### 導航欄
- 未登入：顯示 Google 登入按鈕
- 已登入：顯示使用者頭像、名字和下拉選單
- 支援登出功能

#### 使用者頭像組件
- 顯示 Google 頭像（如果有）
- 備用顯示使用者名字首字母
- 下拉選單顯示詳細資訊和登出選項

### 3. 狀態管理

使用 React Context 管理認證狀態：

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### 4. 安全性考量

- Token 儲存在 localStorage（生產環境建議使用 httpOnly cookies）
- Token 過期檢查
- 錯誤處理和重試機制
- 安全的 OAuth 流程

## 環境設定

### 環境變數

建立 `.env.local` 檔案：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 後端設定

確保後端已設定：
- Google OAuth 2.0 憑證
- 正確的 redirect URI
- CORS 設定

## 使用方法

### 開發環境

1. 安裝依賴：
```bash
npm install
```

2. 設定環境變數

3. 啟動開發伺服器：
```bash
npm run dev
```

4. 訪問 `http://localhost:3000/login`

### 測試

執行 BDD 測試：

```bash
npm run cucumber
```

執行 E2E 測試：

```bash
npm run test:e2e
```

## 自訂化

### 樣式調整

所有組件都使用 Tailwind CSS，可以輕鬆調整：

- 顏色主題
- 按鈕樣式
- 響應式斷點
- 動畫效果

### 功能擴展

可以輕鬆添加：

- 其他 OAuth 提供者（Facebook、GitHub 等）
- 記住登入狀態
- 多因素認證
- 使用者權限管理

## 故障排除

### 常見問題

1. **OAuth 回調失敗**
   - 檢查 redirect URI 設定
   - 確認後端 API 狀態

2. **Token 無效**
   - 檢查 token 格式
   - 確認後端驗證邏輯

3. **CORS 錯誤**
   - 檢查後端 CORS 設定
   - 確認 API 端點可達性

### 除錯模式

在開發環境中，檢查瀏覽器開發者工具：

- Network 標籤：API 請求狀態
- Console 標籤：錯誤訊息
- Application 標籤：localStorage 狀態

## 貢獻指南

1. Fork 專案
2. 建立功能分支
3. 實作功能並通過測試
4. 提交 Pull Request

## 授權

本專案採用 MIT 授權條款。
