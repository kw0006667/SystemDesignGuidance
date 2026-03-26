import type { ChapterContent } from '../../types.js';

export default {
  title: '負載平衡器（Load Balancer）',
  content: `
<section id="why-load-balancer">
  <h2>為什麼需要負載平衡？</h2>
  <p>
    想像你的服務一開始只有一台伺服器，每秒可以處理 1,000 個請求。隨著用戶增長，
    請求量到了 3,000 QPS——單台伺服器無法負荷，怎麼辦？
  </p>
  <p>
    你有兩個選擇：
  </p>
  <ul>
    <li>
      <strong>垂直擴展（Vertical Scaling / Scale-Up）：</strong>升級到更強的機器（更多 CPU、更多 RAM）。
      簡單，但有硬體上限，而且單點故障（SPOF）問題沒有解決。一台 128 核機器也可能因為記憶體洩漏或 OOM 而崩潰。
    </li>
    <li>
      <strong>水平擴展（Horizontal Scaling / Scale-Out）：</strong>加更多台伺服器。
      理論上可無限擴展，但需要一個機制決定「這個請求要送到哪台伺服器」——這就是<strong>負載平衡器</strong>的角色。
    </li>
  </ul>
  <arch-diagram src="./diagrams/ch04-load-balancer.json" caption="負載平衡器架構：用戶請求先到 LB，再被分發到多台後端伺服器。LB 也負責健康檢查，自動移除故障節點。"></arch-diagram>

  <h3>負載平衡器的核心職責</h3>
  <p>
    現代負載平衡器不只是「分流器」，它是整個服務入口層的核心，承擔著多項關鍵職責：
  </p>
  <ul>
    <li><strong>流量分發：</strong>根據演算法將請求均勻（或智慧地）分配到後端節點</li>
    <li><strong>健康檢查（Health Check）：</strong>定期探測後端節點，自動移除故障節點，避免請求送到壞掉的機器</li>
    <li><strong>SSL 終止（SSL Termination）：</strong>在 LB 層解密 HTTPS，後端服務器只處理純 HTTP，減少加解密開銷</li>
    <li><strong>會話持久性（Session Persistence / Sticky Session）：</strong>確保同一用戶的請求持續路由到同一台伺服器</li>
    <li><strong>速率限制（Rate Limiting）：</strong>防止單一 IP 或用戶過度使用資源</li>
    <li><strong>連線池管理：</strong>維護與後端的長連線池，降低每次新連線的 TCP Handshake 開銷</li>
    <li><strong>可觀測性：</strong>記錄每個請求的延遲、錯誤率，作為監控資料的匯集點</li>
  </ul>

  <h3>SSL Termination 的詳細機制</h3>
  <p>
    SSL/TLS 加解密是 CPU 密集型操作。若讓每一台後端伺服器都處理 TLS Handshake，
    CPU 資源會被大量消耗。SSL Termination 的設計如下：
  </p>
  <pre data-lang="text"><code class="language-text">用戶端  ──HTTPS（加密）──→  Load Balancer  ──HTTP（明文）──→  後端伺服器 1
                              ↑                              後端伺服器 2
                         TLS 在此解密                         後端伺服器 3
                         憑證在此管理

優點：
  - 後端伺服器免於 TLS 計算開銷，專注業務邏輯
  - 憑證集中管理，只需在 LB 更新憑證，不用分發到所有後端
  - 後端之間的通訊通常在受信任的內網，可用 HTTP 提升效能

注意：
  - 後端到 LB 之間若需要加密（合規要求），可使用 TLS Re-encryption
    （LB 解密後再次加密才送到後端），但會增加延遲</code></pre>

  <h3>Health Check 的詳細機制</h3>
  <p>
    健康檢查分為兩種，各有其使用場景：
  </p>
  <ul>
    <li>
      <strong>被動健康檢查（Passive）：</strong>LB 觀察真實請求的回應。如果某台後端連續返回 5xx 錯誤，
      就將其標記為不健康並從輪詢中移除。優點是零額外請求；缺點是已有真實用戶請求失敗了才偵測到問題。
    </li>
    <li>
      <strong>主動健康檢查（Active）：</strong>LB 每隔幾秒向後端發送 HTTP <code>GET /health</code> 或 TCP Ping，
      根據回應狀態判斷節點健康與否。典型設定：每 5 秒檢查一次，連續 3 次失敗則標記為 DOWN，
      連續 2 次成功後恢復為 UP。
    </li>
  </ul>
  <pre data-lang="text"><code class="language-text">典型 Active Health Check 流程（以 Nginx 為例）：

server 192.168.1.10:8080  → 健康（回應 200）✓
server 192.168.1.11:8080  → 第1次失敗（超時）✗
server 192.168.1.11:8080  → 第2次失敗（連線拒絕）✗
server 192.168.1.11:8080  → 第3次失敗（超時）✗
→ 192.168.1.11 被標記為 DOWN，從流量分發中移除
→ 所有流量暫時只送往 192.168.1.10
→ 繼續每 5 秒探測一次 .11
→ 連續 2 次成功 → 恢復 UP，重新加入輪詢</code></pre>

  <h3>生產環境的典型架構配置</h3>
  <p>
    在實際生產環境中，負載平衡通常是多層的：
  </p>
  <pre data-lang="text"><code class="language-text">Internet
    ↓
[DNS / Anycast]  ← 全球流量路由（GSLB）
    ↓
[L4 NLB]         ← 處理海量 TCP 連線（AWS NLB / 硬體 F5）
    ↓
[L7 ALB]         ← HTTP 路由、SSL 終止、認證、限流
    ↓
[Nginx / Envoy]  ← Service Mesh 內部負載均衡（微服務間）
    ↓
[後端服務 Pod]   ← Kubernetes kube-proxy 也做 L4 負載均衡</code></pre>

  <callout-box type="warning" title="單台 Load Balancer 也是單點故障">
    如果只有一台 Load Balancer，它本身就是單點故障（Single Point of Failure）。
    生產環境通常部署兩台 LB（Active-Passive 或 Active-Active），
    透過 Virtual IP（VIP）和 Heartbeat 機制保證高可用性。
    詳見本章最後一節的 HA Patterns。
  </callout-box>
</section>

<section id="l4-vs-l7">
  <h2>L4 vs L7 Load Balancer</h2>
  <p>
    負載平衡器依據它「看得到」哪一層的資訊來決定路由，分為 L4（傳輸層）和 L7（應用層）兩種。
    這個差別決定了 LB 的智慧程度和效能開銷。
  </p>

  <h3>L4 負載平衡器（Transport Layer）</h3>
  <p>
    L4 LB 只看 TCP/UDP 的<strong>來源 IP、目標 IP、Port</strong>，不解析應用層資料（不看 HTTP Headers、不看 URL）。
    因為不需要解包，速度極快，延遲極低。它在 TCP 層面做 NAT（Network Address Translation）或 DSR（Direct Server Return），
    將封包轉發到後端節點。
  </p>
  <ul>
    <li><strong>代表實現：</strong>AWS NLB（Network Load Balancer）、HAProxy（L4 模式）、Nginx（Stream 模式）</li>
    <li><strong>優點：</strong>高效能（可達數百萬 CPS）、低延遲、支援任何 TCP/UDP 協定</li>
    <li><strong>缺點：</strong>無法做基於 URL 路徑的路由、無法看 Cookie（無法做 Sticky Session based on Cookie）</li>
  </ul>

  <h3>Nginx L4 Stream 模式配置範例</h3>
  <pre data-lang="nginx"><code class="language-nginx"># nginx.conf - L4 Stream (TCP) Load Balancing
stream {
    upstream backend_tcp {
        least_conn;
        server 192.168.1.10:3306;
        server 192.168.1.11:3306;
        server 192.168.1.12:3306;
    }

    server {
        listen 3306;
        proxy_pass backend_tcp;
        proxy_connect_timeout 1s;
        proxy_timeout 3s;
    }
}</code></pre>

  <h3>L7 負載平衡器（Application Layer）</h3>
  <p>
    L7 LB 完全解析 HTTP 請求，可以根據<strong>URL、Headers、Cookie、請求內容</strong>做智慧路由決策。
    這讓它能做到許多 L4 做不到的事：
  </p>
  <ul>
    <li>將 <code>/api/*</code> 路由到 API 服務，<code>/static/*</code> 路由到靜態伺服器</li>
    <li>根據 <code>User-Agent</code> 將手機請求路由到行動版後端</li>
    <li>A/B Testing：隨機將 10% 流量路由到新版本服務</li>
    <li>根據 Cookie 實現 Sticky Session</li>
    <li>根據請求 Header 的 <code>X-Tenant-ID</code> 路由到不同租戶的後端（Multi-tenancy）</li>
  </ul>

  <h3>Nginx L7 HTTP 模式配置範例</h3>
  <pre data-lang="nginx"><code class="language-nginx"># nginx.conf - L7 HTTP Load Balancing with Content-Based Routing
http {
    upstream api_servers {
        least_conn;
        server 10.0.1.1:8080 weight=3;
        server 10.0.1.2:8080 weight=3;
        server 10.0.1.3:8080 weight=1 backup;  # 備援節點
    }

    upstream static_servers {
        server 10.0.2.1:80;
        server 10.0.2.2:80;
    }

    server {
        listen 443 ssl;
        ssl_certificate     /etc/ssl/certs/server.crt;
        ssl_certificate_key /etc/ssl/private/server.key;

        # 根據 URL 路徑路由
        location /api/ {
            proxy_pass http://api_servers;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /static/ {
            proxy_pass http://static_servers;
            proxy_cache_valid 200 1d;  # 快取靜態資源
        }

        # 健康檢查端點
        location /health {
            access_log off;
            return 200 "OK";
        }
    }
}</code></pre>

  <h3>WebSocket 的特殊處理</h3>
  <p>
    WebSocket 是一個需要特別注意的協定。它的連線建立從 HTTP Upgrade 請求開始，
    一旦升級成功就變成持久的雙向 TCP 連線。負載平衡器必須：
  </p>
  <ul>
    <li>辨識並正確處理 <code>Upgrade: websocket</code> 和 <code>Connection: Upgrade</code> Headers</li>
    <li>在連線升級後，不再對這個連線進行輪詢或重新路由——它必須<strong>固定在同一台後端</strong></li>
    <li>將 TCP Keep-Alive 超時設置足夠長（WebSocket 連線可能持續數小時）</li>
  </ul>
  <pre data-lang="nginx"><code class="language-nginx"># Nginx 正確處理 WebSocket 的配置
http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    server {
        location /ws/ {
            proxy_pass http://websocket_backends;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_read_timeout 86400s;  # 24小時，WebSocket 長連線
            proxy_send_timeout 86400s;
        }
    }
}</code></pre>

  <h3>AWS NLB vs ALB 詳細對比</h3>
  <table>
    <thead>
      <tr>
        <th>特性</th>
        <th>AWS NLB（L4）</th>
        <th>AWS ALB（L7）</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>路由依據</td>
        <td>IP:Port</td>
        <td>URL、Headers、Cookie、Body</td>
      </tr>
      <tr>
        <td>協定</td>
        <td>TCP、UDP、TLS</td>
        <td>HTTP/1.1、HTTP/2、gRPC、WebSocket</td>
      </tr>
      <tr>
        <td>SSL 終止</td>
        <td>可（TLS Listener），也可 Passthrough</td>
        <td>標準功能，強制在 ALB 層</td>
      </tr>
      <tr>
        <td>效能</td>
        <td>數百萬 CPS，超低延遲（微秒級）</td>
        <td>高吞吐，但有解包開銷（毫秒級）</td>
      </tr>
      <tr>
        <td>靜態 IP</td>
        <td>每個 AZ 固定一個 IP（適合防火牆白名單）</td>
        <td>DNS 名稱，IP 可能變化</td>
      </tr>
      <tr>
        <td>Target 類型</td>
        <td>EC2、IP、Lambda、ALB</td>
        <td>EC2、IP、Lambda、ECS Task</td>
      </tr>
      <tr>
        <td>Health Check</td>
        <td>TCP / HTTP / HTTPS</td>
        <td>HTTP / HTTPS（可自訂路徑和 Response Code）</td>
      </tr>
      <tr>
        <td>Sticky Session</td>
        <td>基於來源 IP（5-tuple hash）</td>
        <td>基於 Cookie（Application / Duration-based）</td>
      </tr>
      <tr>
        <td>月費起算</td>
        <td>按 LCU（Load Balancer Capacity Unit）</td>
        <td>按 LCU（但計算方式不同，通常 ALB 更貴）</td>
      </tr>
      <tr>
        <td>典型使用場景</td>
        <td>資料庫代理、遊戲伺服器、IoT、低延遲服務</td>
        <td>Web 應用、API Gateway、微服務路由</td>
      </tr>
    </tbody>
  </table>

  <callout-box type="info" title="實務中的組合使用">
    大型系統通常組合使用 L4 和 L7：外層用 L4 NLB 做高效能的 TCP 負載均衡，
    同時獲得靜態 IP（方便防火牆規則設定），
    內層用 L7 ALB 做 HTTP 路由和 SSL 終止。
    NLB → ALB → 後端這樣的雙層架構在 AWS 上非常常見。
  </callout-box>
</section>

<section id="lb-algorithms">
  <h2>常見演算法</h2>
  <p>
    Load Balancer 如何決定將請求送到哪一台伺服器？不同的演算法有不同的行為，
    選錯演算法可能導致部分伺服器過載、用戶會話中斷等問題。
  </p>

  <h3>1. Round Robin（輪詢）</h3>
  <p>最簡單的演算法，按順序依次分配請求：Server A → B → C → A → B → C...</p>
  <pre data-lang="python"><code class="language-python"># Round Robin 虛擬碼
class RoundRobinLB:
    def __init__(self, servers: list[str]):
        self.servers = servers
        self.index = 0

    def pick(self) -> str:
        server = self.servers[self.index]
        self.index = (self.index + 1) % len(self.servers)
        return server

# 輸出：A → B → C → A → B → C...
lb = RoundRobinLB(["A", "B", "C"])</code></pre>
  <ul>
    <li><strong>優點：</strong>實作簡單、分配均勻，無需了解後端狀態</li>
    <li><strong>缺點：</strong>不考慮伺服器當前負載（一台 16 核和一台 4 核的機器收到相同請求量）</li>
    <li><strong>變體：Weighted Round Robin</strong>——根據伺服器規格設定權重。16 核機器 weight=4，4 核機器 weight=1，
    則 16 核機器處理 4 倍的請求量</li>
    <li><strong>適用：</strong>所有後端規格相同、請求處理時間均勻的場景</li>
  </ul>

  <h3>2. Least Connections（最少連線數）</h3>
  <p>將新請求路由到<strong>當前活躍連線數最少</strong>的伺服器。這考慮了伺服器的實際負載狀況。</p>
  <pre data-lang="python"><code class="language-python"># Least Connections 虛擬碼
class LeastConnectionsLB:
    def __init__(self, servers: list[str]):
        # {server: active_connections}
        self.connections = {s: 0 for s in servers}

    def pick(self) -> str:
        # 選擇連線數最少的節點
        server = min(self.connections, key=self.connections.get)
        self.connections[server] += 1
        return server

    def release(self, server: str):
        self.connections[server] -= 1</code></pre>
  <ul>
    <li><strong>優點：</strong>適合請求處理時間差異大的場景（如某些請求 10ms 完成，某些需要 5 秒）</li>
    <li><strong>缺點：</strong>連線數不等於實際 CPU/記憶體負載；有些連線可能是空閒的長連線</li>
    <li><strong>變體：Weighted Least Connections</strong>——綜合考量伺服器規格和當前連線數：
    <code>score = active_connections / weight</code>，選擇 score 最低的節點</li>
    <li><strong>適用：</strong>長連線（WebSocket）、長短請求混合的服務</li>
  </ul>

  <h3>3. IP Hash（IP 雜湊）</h3>
  <p>根據客戶端 IP 計算 Hash 值，將同一 IP 的請求<strong>永遠路由到同一台伺服器</strong>。這是實現 Sticky Session 的常見方式。</p>
  <pre data-lang="python"><code class="language-python"># IP Hash 虛擬碼
def pick_server(client_ip: str, servers: list[str]) -> str:
    hash_value = hash(client_ip)          # 或使用 CRC32、MD5
    index = hash_value % len(servers)
    return servers[index]

# 同一個 IP 永遠映射到同一台伺服器
pick_server("203.0.113.5", servers)  # → Server B（永遠）</code></pre>
  <ul>
    <li><strong>優點：</strong>同一用戶的請求總去同一台，適合有本地 Session 的應用</li>
    <li><strong>缺點：</strong>若某個 IP 的請求量很大（例如來自同一家公司的 NAT IP，可能代表數千用戶），會造成負載不均；
    增減伺服器時，大量 IP 的映射會改變，所有 Session 失效</li>
    <li><strong>現代替代方案：</strong>Cookie-based Sticky Session——LB 給每個用戶發一個 Cookie，
    記錄其綁定的伺服器 ID，比 IP Hash 更可靠</li>
  </ul>

  <h3>4. Consistent Hashing（一致性雜湊）</h3>
  <p>
    一致性雜湊是分散式系統中最重要的演算法之一。它解決了普通 Hash 的一個根本問題：
    <strong>當節點數量改變時，普通 Hash 會重新映射幾乎所有 Key，而一致性雜湊只重新映射少數 Key。</strong>
  </p>
  <pre data-lang="text"><code class="language-text">概念：把 Hash 空間想成一個圓（0 到 2^32-1）

正常情況（3 個節點）：
  Hash Ring: [A........B........C........回到A]
  Key "user:123" hash=5000 → 順時針找到 Server B

新增節點 D（插入 B 和 C 之間）：
  Hash Ring: [A........B....D....C........回到A]
  只有原本路由到 D（B~D 之間）的 Key 需要重新映射
  其他 Key 不受影響！

移除節點 B：
  只有原本在 B 的 Key 需要遷移到下一個節點 D
  其他不受影響

普通 Hash（N個節點）的對比：
  hash(key) % 3 → 如果節點數從 3 變成 4
  幾乎所有 Key 的 hash(key) % 4 都和 hash(key) % 3 不同
  → 大量 Cache Miss，快取系統幾乎失效</code></pre>
  <p>
    一致性雜湊廣泛應用於：分散式快取（Memcached cluster）、
    資料庫分片路由、CDN 節點選擇、Cassandra 的資料分布。
  </p>

  <h3>虛擬節點（Virtual Nodes）的完整機制</h3>
  <pre data-lang="python"><code class="language-python">import hashlib
from bisect import bisect_right, insort

class ConsistentHashRing:
    def __init__(self, virtual_nodes: int = 150):
        self.virtual_nodes = virtual_nodes  # 每個物理節點的虛擬副本數
        self.ring: list[int] = []           # 有序的 hash 值列表
        self.nodes: dict[int, str] = {}     # hash → 物理節點映射

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node: str):
        for i in range(self.virtual_nodes):
            vnode_key = f"{node}#vnode{i}"
            h = self._hash(vnode_key)
            insort(self.ring, h)
            self.nodes[h] = node

    def remove_node(self, node: str):
        for i in range(self.virtual_nodes):
            vnode_key = f"{node}#vnode{i}"
            h = self._hash(vnode_key)
            self.ring.remove(h)
            del self.nodes[h]

    def get_node(self, key: str) -> str:
        h = self._hash(key)
        # 順時針找到第一個 >= h 的虛擬節點
        idx = bisect_right(self.ring, h) % len(self.ring)
        return self.nodes[self.ring[idx]]

# 使用範例：3 個物理節點，每個有 150 個虛擬節點
ring = ConsistentHashRing(virtual_nodes=150)
ring.add_node("server-A")
ring.add_node("server-B")
ring.add_node("server-C")

ring.get_node("user:123")  # → "server-B"（確定性結果）
ring.get_node("user:456")  # → "server-A"

# 新增節點，只有約 1/4 的 Key 需要遷移
ring.add_node("server-D")
ring.get_node("user:123")  # 可能仍是 "server-B"（多數不變）</code></pre>

  <callout-box type="tip" title="為什麼 150 個虛擬節點？">
    虛擬節點數量影響負載分布的均勻程度。虛擬節點越多，分布越均勻，但記憶體消耗也越多。
    Cassandra 的早期版本每個節點預設 256 個 Virtual Token，DynamoDB 使用更複雜的自適應分片機制。
    對於大多數應用，100～200 個虛擬節點是合理的平衡點。
  </callout-box>

  <h3>5. Power of Two Choices（二選一隨機法）</h3>
  <p>
    這是一個看似簡單卻數學上非常優雅的演算法：
    <strong>隨機選兩台伺服器，比較它們的負載（連線數），將請求送到負載較低的那台。</strong>
  </p>
  <pre data-lang="python"><code class="language-python">import random

class PowerOfTwoChoicesLB:
    def __init__(self, servers: list[str]):
        self.connections = {s: 0 for s in servers}

    def pick(self) -> str:
        # 隨機抽取兩個節點
        candidates = random.sample(list(self.connections.keys()), 2)
        # 選連線數較少的那個
        server = min(candidates, key=lambda s: self.connections[s])
        self.connections[server] += 1
        return server</code></pre>
  <p>
    <strong>數學背景：</strong>純隨機選擇（Random）在 N 個節點、N 個請求的情況下，
    最繁忙節點的負載期望值是 <code>O(log N / log log N)</code>。
    而 Power of Two Choices 的最大負載僅為 <code>O(log log N)</code>——
    這是巨大的改進！從 N=1024 節點來看，隨機是約 7，二選一只有約 3。
  </p>
  <ul>
    <li><strong>優點：</strong>近似 Least Connections 的效果，但只需 O(1) 的狀態查詢（不需全局排序）；
    無中心化計數器競爭問題，在分散式 LB 叢集中特別適用</li>
    <li><strong>適用：</strong>大規模分散式 LB 系統（如 Nginx Plus、Envoy、Google Maglev）</li>
  </ul>

  <h3>6. Random（隨機）</h3>
  <p>隨機選擇一台伺服器。看似簡單，但在大量請求下，統計上與 Round Robin 效果相似。
  在無共享狀態的多節點 LB 叢集中，Random 比 Round Robin 更容易實現（不需要共享計數器）。</p>

  <h3>演算法選擇指南</h3>
  <table>
    <thead>
      <tr>
        <th>場景</th>
        <th>建議演算法</th>
        <th>原因</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>所有伺服器規格相同，請求處理時間均勻</td>
        <td>Round Robin</td>
        <td>簡單、均勻、零狀態</td>
      </tr>
      <tr>
        <td>伺服器規格不同</td>
        <td>Weighted Round Robin</td>
        <td>按能力分配流量</td>
      </tr>
      <tr>
        <td>請求處理時間差異大（長短混合）</td>
        <td>Least Connections</td>
        <td>避免慢請求堆積在某台伺服器</td>
      </tr>
      <tr>
        <td>需要 Sticky Session（有狀態服務）</td>
        <td>IP Hash 或 Cookie-based</td>
        <td>同一用戶固定後端</td>
      </tr>
      <tr>
        <td>分散式快取 / 資料庫分片</td>
        <td>Consistent Hashing</td>
        <td>節點增減時最小化 Key 遷移</td>
      </tr>
      <tr>
        <td>大型分散式 LB 叢集，無全局狀態</td>
        <td>Power of Two Choices</td>
        <td>無需全局協調，效果接近 Least Connections</td>
      </tr>
    </tbody>
  </table>
</section>

<section id="ha-patterns">
  <h2>Active-Active vs Active-Passive</h2>
  <p>
    生產環境中，Load Balancer 本身不能是單點故障。業界有兩種主流的高可用模式，
    以及全球層面的流量管理方案。
  </p>

  <h3>Virtual IP（VIP）機制</h3>
  <p>
    理解高可用 LB 之前，需要先理解 Virtual IP（虛擬 IP）的概念。
    VIP 是一個不綁定到任何特定物理網卡的「浮動 IP 地址」。
    在任何時間點，這個 IP 由哪台機器持有，就由哪台機器處理流量。
  </p>
  <pre data-lang="text"><code class="language-text">VIP 切換流程：

正常狀態：
  VIP: 10.0.0.1  → 由 LB-1（Primary）持有
  LB-1 ←── Heartbeat ──→ LB-2（Standby）

  用戶 → 10.0.0.1 → LB-1 → 後端伺服器群

LB-1 故障：
  LB-2 偵測到 Heartbeat 超時（通常 1～3 秒後）

  LB-2 執行：
    1. arping（發送 Gratuitous ARP）通知網絡交換機
       "10.0.0.1 現在對應我的 MAC 地址 AA:BB:CC:DD:EE:02"
    2. 所有網絡設備更新 ARP 快取
    3. 後續到 10.0.0.1 的封包都路由到 LB-2

  恢復後：
    LB-1 重啟 → 可以搶回 VIP（Preemptive 模式）
               或繼續作為 Standby（Non-preemptive 模式）</code></pre>
  <p>
    Gratuitous ARP 的廣播通常幾百毫秒到 1～2 秒內即可讓所有交換機更新 ARP 表，
    因此使用 VIP 的 Failover 比 DNS Failover 快得多。
  </p>

  <h3>Keepalived 原理</h3>
  <p>
    Keepalived 是 Linux 上最常見的 VIP + Failover 工具，基於 VRRP（Virtual Router Redundancy Protocol）協定。
    它的工作原理是：
  </p>
  <ul>
    <li>Primary 節點（MASTER）持有 VIP，並以固定頻率（預設每秒）廣播 VRRP 心跳封包</li>
    <li>Backup 節點監聽心跳，若超過設定秒數（預設 3 秒）沒有收到心跳，就接管 VIP（Failover）</li>
    <li>每個節點可設定優先級（priority），優先級高的成為 MASTER</li>
  </ul>
  <pre data-lang="text"><code class="language-text"># /etc/keepalived/keepalived.conf（LB-1，Primary）
vrrp_instance VI_1 {
    state MASTER           # 初始角色
    interface eth0
    virtual_router_id 51   # 同一 VRRP 群組必須相同
    priority 100           # 越高越優先成為 MASTER
    advert_int 1           # 每 1 秒發送心跳

    authentication {
        auth_type PASS
        auth_pass secret123
    }

    virtual_ipaddress {
        10.0.0.1/24        # VIP
    }
}

# LB-2（Backup）配置相同，但：
#   state BACKUP
#   priority 90            # 優先級較低</code></pre>

  <h3>Active-Passive（主備模式）</h3>
  <p>
    同時運行兩台 LB，但只有一台（Active）實際處理流量。
    另一台（Passive）處於待機狀態，持續接收 Heartbeat 訊號監測 Active 節點的健康狀況。
    當 Active 節點故障時，Passive 自動接管 Virtual IP（VIP），開始處理流量。
  </p>
  <ul>
    <li><strong>優點：</strong>實作簡單；Failover 邏輯清晰；無需擔心兩台 LB 的狀態同步問題</li>
    <li><strong>缺點：</strong>Passive 節點平時閒置，資源浪費；Failover 通常需要 1～5 秒，期間可能有短暫服務中斷</li>
    <li><strong>適用：</strong>中小型系統；成本敏感場景；對流量中斷有一定容忍度的服務</li>
  </ul>

  <h3>Active-Active（雙活模式）</h3>
  <p>
    兩台（或更多）LB 同時處理流量，通常透過 DNS Round Robin 或 BGP Anycast 實現。
    若一台故障，另一台繼續處理所有流量（需要容量上預留冗餘，通常每台各處理 50% 流量，
    單台需有承接 100% 流量的能力）。
  </p>
  <ul>
    <li><strong>優點：</strong>充分利用資源；故障時無明顯中斷（平滑切換）；可水平擴展</li>
    <li><strong>缺點：</strong>設定複雜；需要確保兩台 LB 的共享狀態同步（如 Rate Limiting 計數器、連線狀態）</li>
    <li><strong>適用：</strong>大型系統；對中斷時間零容忍的場景（RTO = 0）</li>
  </ul>

  <h3>GSLB（Global Server Load Balancing）</h3>
  <p>
    GSLB 是「跨資料中心的負載均衡」——它不是在單一資料中心內分配流量，
    而是決定「用戶應該連接到哪個資料中心」。GSLB 通常基於 DNS 實現：
  </p>
  <ul>
    <li>根據用戶<strong>地理位置</strong>（Geolocation），將東南亞用戶導向新加坡 DC，歐洲用戶導向法蘭克福 DC</li>
    <li>根據各資料中心的<strong>健康狀態</strong>，若某個 DC 掛掉，DNS 自動停止返回該 DC 的 IP</li>
    <li>根據各資料中心的<strong>當前負載</strong>，動態調整 DNS 權重，實現全球流量分配</li>
  </ul>
  <pre data-lang="text"><code class="language-text">GSLB DNS 查詢流程：

用戶（台北）查詢 api.example.com
  → DNS 解析請求送到 GSLB
  → GSLB 偵測到請求來自台灣
  → 查詢各 DC 健康狀態：
      新加坡 DC: 健康，負載 45%  ✓
      東京 DC:   健康，負載 80%  ✓
      法蘭克福:  健康，負載 30%  （太遠）
  → 返回新加坡 DC IP（最近且負載不高）

用戶（紐約）查詢 api.example.com
  → GSLB 偵測來自美國東部
  → 返回維吉尼亞 DC IP</code></pre>

  <h3>BGP Anycast</h3>
  <p>
    BGP Anycast 是更底層的全球流量分發機制，主要用於 CDN 和 DNS 基礎設施（如 Cloudflare、Google 的 8.8.8.8）。
    原理是：<strong>多個地理位置的節點廣播同一個 IP 地址</strong>，BGP 路由協定自然地將流量路由到
    「最近的」（路由跳數最少的）節點。
  </p>
  <ul>
    <li><strong>優點：</strong>完全自動，無需應用層干預；故障轉移極快（BGP 重新收斂通常幾秒內）；
    天然具有 DDoS 緩解能力（攻擊流量被分散到全球節點）</li>
    <li><strong>缺點：</strong>需要 AS（自治系統）和 BGP 配置，通常只有大型 CDN 或雲端服務商才有條件部署</li>
    <li><strong>典型應用：</strong>Cloudflare 的全球 Anycast 網路、Google Public DNS（8.8.8.8）、
    Root DNS 伺服器的多點部署</li>
  </ul>

  <h3>DNS Failover</h3>
  <p>
    透過 DNS TTL 控制，當主要節點故障時，將 DNS 記錄切換到備份 IP。
    但 DNS TTL 快取效應意味著可能需要 1～5 分鐘才能讓所有客戶端感知到切換。
    對於要求 RTO &lt; 30 秒的場景，DNS Failover 不夠快。
  </p>
  <callout-box type="info" title="各方案 Failover 速度對比">
    <ul>
      <li><strong>Keepalived VIP（L2 切換）：</strong>1～3 秒（Gratuitous ARP 廣播）</li>
      <li><strong>BGP Anycast：</strong>幾秒～幾十秒（BGP 重新收斂）</li>
      <li><strong>AWS Route 53 Health Check：</strong>10～30 秒（Health Check 間隔 + TTL）</li>
      <li><strong>DNS TTL Failover：</strong>TTL 時間（通常 60 秒～5 分鐘）</li>
    </ul>
    生產系統的 RTO（Recovery Time Objective）決定應選用哪種方案。
    金融交易系統要求秒級 RTO，通常使用 VIP + Keepalived；
    一般 Web 服務可以接受分鐘級，使用 Route 53 Health Check 即可。
  </callout-box>
</section>
`,
} satisfies ChapterContent;
