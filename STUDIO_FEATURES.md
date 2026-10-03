# TÀI LIỆU ĐẶC TẢ TÍNH NĂNG HỆ THỐNG STUDIO ANALYTICS & CHUYỂN ĐỔI TIN NHẮN (STUDIO FEATURES SPECIFICATION)

> **Dự án:** ContentFlow CRM / Studio Analytics  
> **Mục tiêu:** Nâng cấp từ hệ thống báo cáo thủ công cơ bản thành **Trung tâm Quản trị Hiệu suất Đa kênh & Đo lường Tỷ lệ Chuyển đổi Tin nhắn Khách hàng**, kết hợp các thế mạnh chuyên sâu của **Facebook Creator Studio (Meta Business Suite)**, **TikTok Studio** và **YouTube Studio**.

---

## MỤC LỤC
1. [Bối cảnh & Vấn đề Cần Giải Quyết](#1-bối-cảnh--vấn-đề-cần-giải-quyết)
2. [Phân hệ 1: Quản trị Thực thể Đa kênh (Multi-Entity & Channel Management)](#phân-hệ-1-quản-trị-thực-thể-đa-kênh-multi-entity--channel-management)
3. [Phân hệ 2: Đo lường & Phân tích Tin nhắn Khách (Inbound Messaging & Conversion Analytics)](#phân-hệ-2-đo-lường--phân-tích-tin-nhắn-khách-inbound-messaging--conversion-analytics)
4. [Phân hệ 3: Dashboard Phân tích Chi tiết (Advanced Studio Analytics)](#phân-hệ-3-dashboard-phân-tích-chi-tiết-advanced-studio-analytics)
5. [Phân hệ 4: Cơ chế Tự động hóa Dữ liệu (Daily Auto-Sync & Webhooks)](#phân-hệ-4-cơ-chế-tự-động-hóa-dữ-liệu-daily-auto-sync--webhooks)
6. [Phân hệ 5: Báo cáo Điều hành & Cảnh báo Tự động (Executive Reports & Alerts)](#phân-hệ-5-báo-cáo-điều-hành--cảnh-báo-tự-động-executive-reports--alerts)
7. [Phân hệ 6: Tối ưu Vận hành & Nhập liệu Nhanh (Fast Ops & Data Entry)](#phân-hệ-6-tối-ưu-vận-hành--nhập-liệu-nhanh-fast-ops--data-entry)
8. [Đặc tả Mô hình Dữ liệu (Data Schema Specification)](#đặc-tả-mô-hình-dữ-liệu-data-schema-specification)
9. [Lộ trình Triển khai (Implementation Roadmap)](#lộ-trình-triển-khai-implementation-roadmap)

---

## 1. Bối cảnh & Vấn đề Cần Giải Quyết

### Thực trạng hiện tại của codebase
- **Đơn chỉ số:** Toàn bộ bảng dữ liệu hiện chỉ lưu chỉ số `reach`. Không có tương tác (Likes, Comments, Shares) và thiếu hoàn toàn các chỉ số chuyển đổi thương mại (**Tin nhắn khách / Inbox**, Leads).
- **Đánh đồng thực thể:** Fanpage thương hiệu (`8 Sync Dev`), Profile cá nhân (`Acc Kevin`) và Nhóm Facebook ngoài (`Flutter Vietnam`, `AI Everyday`...) bị gộp chung vào 1 danh sách `"Nhóm Facebook"`, không đo lường được hiệu quả của từng Page.
- **Báo cáo chung chung:** Trang `/analytics` chỉ có biểu đồ đường gộp chung Reach của cả tháng, không có bộ lọc 7 ngày / 28 ngày, không so sánh được giữa các Page, không có phễu video (tỷ lệ giữ chân 3s, thời lượng xem).
- **Thao tác thủ công:** Toàn bộ dữ liệu dựa vào việc nhân sự tự copy link, đếm view và gõ tay, dễ sai lệch và tốn thời gian.

---

## Phân hệ 1: Quản trị Thực thể Đa kênh (Multi-Entity & Channel Management)

Mục đích: Tách bạch rõ ràng tài sản thương hiệu (Owned Channels) với các kênh cộng đồng/vệ tinh (Seeding Channels).

### 1.1 Phân cấp Thực thể (Hierarchy Structure)
- **🏢 Owned Fanpages (Fanpage chính thức):**
  - Quản lý danh sách các Fanpage trực thuộc (VD: `8 Sync Dev`, Page tuyển sinh, Page khóa học...).
  - Mỗi Fanpage có: `Page ID`, `Page Name`, `Page Avatar/URL`, `Access Token`, `Trạng thái kết nối API`.
  - Mục tiêu đo lường: Reach tự nhiên, Tương tác bài đăng, Tăng trưởng Follower, **Số lượng tin nhắn khách đổ về**.
- **👤 Profile / KOL / Vệ tinh:**
  - Trang cá nhân hoặc tài khoản phụ chuyên kéo tương tác (VD: `Acc Kevin`).
- **👥 Seeding Groups (Cộng đồng đối tác / Nhóm ngoài):**
  - Các nhóm chia sẻ bài viết để kéo traffic (VD: `AI Everyday`, `Codex VN`, `Group Lập trình Python`).
  - Mục tiêu đo lường: Tỷ lệ duyệt bài (Đã duyệt / Chờ duyệt), Lượt xem trong nhóm, Khả năng kéo người xem về Fanpage.
- **🎬 YouTube Channels:**
  - Danh sách kênh YouTube (Shorts vs Video dài, Kênh chính vs Kênh phụ).
- **🎵 TikTok Accounts:**
  - Danh sách kênh TikTok doanh nghiệp hoặc kênh sáng tạo nội dung.

### 1.2 Giao diện Quản lý Kênh (`/settings/channels`)
- Bảng danh sách kênh theo từng nền tảng kèm thẻ trạng thái:
  - `🟢 Đã kết nối tự động (API Live)`
  - `🟡 Nhập liệu thủ công (Manual)`
  - `🔴 Lỗi Token / Cần cấp lại quyền`
- Cho phép thêm/sửa/xóa, phân loại vai trò (`Chính chủ` hay `Cộng đồng`).

---

## Phân hệ 2: Đo lường & Phân tích Tin nhắn Khách (Inbound Messaging & Conversion Analytics)

Mục đích: Biến báo cáo nội dung thành công cụ đo lường chuyển đổi kinh doanh thực tế chuẩn Meta Business Suite.

### 2.1 Bộ Chỉ số Tin nhắn Cốt lõi
1. **New Inbound Conversations (Cuộc trò chuyện mới từ khách):**
   - Đếm số lượng khách hàng nhắn tin mới vào Fanpage trong ngày hoặc phát sinh trực tiếp từ một bài viết / Reel cụ thể.
2. **Messaging Rate trên Tiếp cận (Inbox per Reach Rate - %):**
   $$\text{Inbox Rate (Reach)} = \frac{\text{Số tin nhắn khách mới}}{\text{Lượt tiếp cận (Reach)}} \times 100\%$$
   - Đo lường mức độ thôi thúc hành động (Call To Action) của nội dung.
3. **Messaging Rate trên Tương tác (Inbox per Engagement Rate - %):**
   $$\text{Inbox Rate (Eng)} = \frac{\text{Số tin nhắn khách mới}}{\text{Likes} + \text{Comments} + \text{Shares}} \times 100\%$$
   - Đo lường chất lượng tương tác: người xem chỉ bấm Like dạo hay thực sự có nhu cầu tư vấn/mua hàng.
4. **Qualified Leads (Khách hàng tiềm năng chất lượng):**
   - Số lượng khách nhắn tin để lại thông tin cụ thể (Số điện thoại, Email, Yêu cầu báo giá).
5. **Cost Per Message (CPMsg - Chi phí trên mỗi tin nhắn):**
   - Áp dụng khi có ngân sách Boost Post / Quảng cáo chạy trên bài viết.

### 2.2 Bảng Xếp hạng Nội dung Kéo Tin nhắn (Top Inbox Drivers)
- Danh sách top bài viết / Reels mang lại nhiều tin nhắn nhất trong tuần/tháng.
- Phân tích chi tiết thành phần bài viết thành công:
  - **Hook mở đầu** dùng mẫu câu gì?
  - **Lời kêu gọi hành động (CTA)** đặt ở vị trí nào? (Nút "Gửi tin nhắn", hướng dẫn comment nhận tài liệu, link bio).
  - Khung giờ đăng bài nhận được phản hồi chat nhanh nhất.

### 2.3 Phân bổ Tin nhắn theo Nguồn gốc (Message Attribution)
- Tin nhắn phát sinh từ:
  - Nút CTA trực tiếp trên bài viết / Facebook Reel.
  - Khách vào Fanpage nhắn tin sau khi xem bài viết.
  - Tin nhắn chuyển hướng từ link đính kèm trên YouTube Shorts / TikTok Bio.

---

## Phân hệ 3: Dashboard Phân tích Chi tiết (Advanced Studio Analytics)

Nâng cấp toàn diện trang `/analytics` từ mức sơ sài hiện nay thành bảng điều khiển Studio chuyên sâu.

### 3.1 Bảng So sánh Hiệu suất Tổng hợp các Page (Page Scorecard & Leaderboard)
Hiển thị ngay đầu trang, so sánh ngang hàng giữa các Fanpage:

| Chỉ số | Fanpage A (Chính) | Fanpage B (Vệ tinh) | Kênh TikTok | Kênh YouTube |
| :--- | :---: | :---: | :---: | :---: |
| **Số nội dung đăng** | 24 bài | 15 bài | 20 video | 12 video |
| **Tổng Reach / Lượt xem** | 120,000 | 45,000 | 180,000 | 85,000 |
| **Tỷ lệ Tương tác (ER)** | 4.8% | 2.6% | 7.2% | 5.1% |
| **Tin nhắn khách phát sinh** | **185 inbox** | **42 inbox** | *(Link Bio)* | *(Mô tả)* |
| **Tỷ lệ Inbox / Reach** | **0.15%** | **0.09%** | -- | -- |
| **Nội dung tốt nhất kỳ** | Reel AI Tips | Post Hỏi Đáp | Video Setup | Short Code |

### 3.2 Bộ lọc Thời gian Đa tầng (Studio Time Filters)
- Bổ sung các mốc thời gian chuẩn quốc tế:
  - `Hôm nay (Today)`
  - `7 ngày qua (Last 7 Days)`
  - `28 ngày qua (Last 28 Days - Chuẩn Meta & TikTok Studio)`
  - `90 ngày qua (Last 90 Days)`
  - `Tháng này / Tháng trước`
  - `Tùy chọn khoảng ngày (Custom Date Range)`
- Bổ sung bộ lọc: **Theo từng Page cụ thể** hoặc **Xem toàn bộ hệ sinh thái**.

### 3.3 Phân tích Chuyên sâu Video (Video-native Retention Analytics)
Dành riêng cho định dạng Reels / Shorts / TikTok:
- **Biểu đồ Phễu Giữ chân Người xem (Audience Retention Curve):**
  - Mốc Giây 0 → **Giây 3 (3s Hook)** → Giây 10 → 50% thời lượng → 100% (Xem hết).
  - Tỷ lệ rơi rụng ở 3 giây đầu: Chỉ báo trực tiếp đánh giá tiêu đề/hình ảnh mở đầu.
- **Tỷ lệ Xem hết (Completion Rate - VCR):** Đo % người xem trọn vẹn video.
- **Thời lượng xem trung bình (Average Watch Time - AWT):** So sánh AWT với tổng thời lượng video.

### 3.4 Ma trận Khung giờ Vàng (24×7 Posting Heatmap)
- Biểu đồ nhiệt biểu diễn 24 giờ trong ngày × 7 ngày trong tuần:
  - Màu càng đậm thể hiện khung giờ bài đăng đạt **Reach cao nhất** và **Khách phản hồi tin nhắn tích cực nhất**.
  - Đề xuất giờ đăng lý tưởng cho từng Fanpage (VD: Page 8 Sync Dev đạt đỉnh tương tác vào 11h30 Thứ 3 và 20h30 Thứ 7).

### 3.5 Phân tích Nguồn Lưu lượng (Traffic Source Breakdown)
- Tỷ lệ % người xem đến từ:
  - **Đề xuất (FYP / Reels Feed / Shorts Feed)**
  - **Người theo dõi hiện tại (Followers)**
  - **Tìm kiếm từ khóa (Search Traffic)**
  - **Chia sẻ vào Nhóm / Tin nhắn / Link ngoài**

### 3.6 Phân tích theo Trục Nội dung (Content Pillar Performance)
- Gắn thẻ nội dung theo chủ đề: `Chia sẻ kiến thức`, `Case Study thực chiến`, `Tin tức / Xu hướng`, `Giới thiệu sản phẩm`.
- Báo cáo đối chiếu: Trục nội dung nào mang lại nhiều View nhất, trục nào mang lại nhiều Tin nhắn chuyển đổi nhất.

---

## Phân hệ 4: Cơ chế Tự động hóa Dữ liệu (Daily Auto-Sync & Webhooks)

Mục đích: Giảm 90% thời gian nhập liệu thủ công, dữ liệu tự đồng bộ mỗi đêm.

### 4.1 Bộ Kết nối Nền tảng (Platform Connectors)
1. **Meta Graph API Connector (Facebook Fanpage):**
   - Tự động lấy danh sách bài viết/Reels mới đăng trong 24h.
   - Quét số liệu View, Reach, Like, Share, Comment của các bài đăng cũ (để cập nhật tăng trưởng sau 48h, 7 ngày).
   - Tự động lấy số lượng tin nhắn khách mới phát sinh qua API Page Insights.
2. **YouTube Data API v3 Connector:**
   - Quét Playlist Uploads của kênh.
   - Tự động lấy View, Like, Comment, thời lượng của video/Shorts.
3. **TikTok Connector:**
   - Tích hợp TikTok Display / Creator API (hoặc script cào dữ liệu tự động định kỳ an toàn).

### 4.2 Lịch trình Chạy Tự động (Scheduled Cron Job)
- Thiết lập Cron Job chạy định kỳ hàng ngày (lúc **00:05 sáng**):
  - Bước 1: Quét và cập nhật toàn bộ bài viết của ngày hôm trước.
  - Bước 2: Tự động ghi vào cơ sở dữ liệu (`reports-YYYY-MM-DD`).
  - Bước 3: Tính toán tỷ lệ chuyển đổi tin nhắn của từng Page.
  - Bước 4: Tự động kích hoạt Bot gửi báo cáo tổng kết ngày.

### 4.3 Webhook Nhận Tin nhắn Realtime (Meta Messenger Webhook)
- Đăng ký nhận sự kiện `messages` và `messaging_postbacks` từ Meta Graph API.
- Mỗi khi khách hàng bấm nút "Nhắn tin" và bắt đầu chat với Fanpage, Webhook tự động ghi nhận `+1 tin nhắn` vào hồ sơ ngày của Page tương ứng trên hệ thống, hoàn toàn không cần can thiệp thủ công.

---

## Phân hệ 5: Báo cáo Điều hành & Cảnh báo Tự động (Executive Reports & Alerts)

### 5.1 Nâng cấp Xuất Báo cáo PDF Chuyên nghiệp
- Cập nhật hàm `generatePDF` hiện tại trong `index.tsx`:
  - Thêm cột phân loại: **Tên Page**, **Số Tin nhắn Khách**, **Tỷ lệ Inbox (%)**.
  - Phần tóm tắt đầu trang (Executive Summary) bổ sung:
    - *Tổng tin nhắn khách toàn hệ thống*.
    - *Fanpage có tỷ lệ chuyển đổi tin nhắn cao nhất*.
    - *Top 3 nội dung hiệu quả nhất kỳ báo cáo*.
  - Định dạng bảng rõ ràng, tối ưu hiển thị in ấn A4 landscape.

### 5.2 Nâng cấp Bot Thông báo Đa kênh (Lark / Feishu / Telegram / Discord)
Nội dung thông báo tự động mỗi sáng hoặc cuối ngày được cấu trúc trực quan:

```text
📢 [ContentFlow Studio] BÁO CÁO HIỆU SUẤT NGÀY 2026-10-03
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TỔNG QUAN: 12 nội dung | 68,500 Reach | 42 Tin nhắn khách
🎯 TỶ LỆ CHUYỂN ĐỔI INBOX TRUNG BÌNH: 0.18%

🏢 HIỆU SUẤT THEO FANPAGE:
├── 📘 8 Sync Dev: 6 bài | 45,200 Reach | 💬 31 Inbox (0.24%) 🔥
├── 📘 Page Khóa Học: 3 bài | 14,800 Reach | 💬 9 Inbox (0.17%)
└── 👤 Acc Kevin: 3 bài | 8,500 Reach | 💬 2 Inbox (0.07%)

🎬 YOUTUBE & TIKTOK:
├── 🎬 YouTube (8 Sync Dev): 2 Shorts | 12,400 Views
└── 🎵 TikTok (@oj0.8sync): 3 Videos | 26,800 Views

🏆 TOP BÀI VIẾT KÉO INBOX NHIỀU NHẤT:
1. "Bí quyết ứng dụng AI tự động hóa" — 8 Sync Dev (18 inbox)
2. "Lộ trình học Fullstack 2026" — Page Khóa Học (7 inbox)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phân hệ 6: Tối ưu Vận hành & Nhập liệu Nhanh (Fast Ops & Data Entry)

Dành cho các kênh chưa kết nối API tự động hoặc các bài viết seeding ngoài nhóm cần ghi nhận nhanh.

### 6.1 Form Nhập liệu Tách bạch
- Giao diện form trên `index.tsx`:
  - **Chọn Nền tảng:** Facebook | YouTube | TikTok.
  - Khi chọn Facebook:
    - Dropdown 1: **Fanpage đăng bài chính thức** (chỉ tải danh sách Page sở hữu).
    - Dropdown 2 (Tùy chọn): **Nhóm Seeding đã chia sẻ bài**.
  - Trường số liệu:
    - `Lượt Reach / Views`
    - `💬 Số Tin nhắn khách` (Kèm các nút chọn nhanh: `+1`, `+5`, `+10`)
    - `Tương tác (Likes, Comments, Shares)`

### 6.2 Bảng Dữ liệu Tương tác Trực tiếp (Inline Quick Edit)
- Cho phép nhân sự click sửa trực tiếp ô **"Reach"** và **"Tin nhắn"** ngay trên bảng danh sách mà không cần bấm nút Edit rồi mở form.
- Thao tác nhanh với phím `Tab` và `Enter`.

### 6.3 Nhập Nhanh Hàng loạt (Smart Bulk Paste)
- Dán danh sách nhiều URL bài viết cùng lúc.
- Hệ thống tự nhận diện nền tảng (Facebook / YouTube / TikTok) và tự gán đúng Page tương ứng theo cấu trúc đường link.

---

## Đặc tả Mô hình Dữ liệu (Data Schema Specification)

### 1. Cấu hình Kênh & Fanpage (`ChannelConfig`)
Lưu trong bảng `kv` với key `channel-configs`:
```typescript
export interface ChannelConfig {
  id: string;                               // 'page_8syncdev'
  platform: 'Facebook' | 'YouTube' | 'TikTok';
  type: 'OWNED_PAGE' | 'PROFILE' | 'SEEDING_GROUP';
  name: string;                             // '8 Sync Dev'
  url: string;                              // 'https://facebook.com/8syncdev'
  externalId?: string;                      // Facebook Page ID, YouTube Channel ID
  accessToken?: string;                     // Mã truy cập API (nếu có kết nối tự động)
  autoSyncEnabled: boolean;                 // Bật/tắt tự động quét
  targetMonthlyReach?: number;              // KPI Reach tháng
  targetMonthlyInbox?: number;              // KPI Tin nhắn tháng
}
```

### 2. Bản ghi Báo cáo Chi tiết (`ReportEntry`)
Lưu trong bảng `kv` theo ngày `reports-YYYY-MM-DD`:
```typescript
export interface ReportEntry {
  id: number;
  date: string;                             // '2026-10-03'
  time?: string;                            // '11:30'
  platform: 'Facebook' | 'YouTube' | 'TikTok';
  
  // Phân rõ Page/Nhóm
  channelId?: string;                       // Liên kết với ChannelConfig.id
  channelName: string;                      // Tên Fanpage / Kênh
  entityType: 'OWNED_PAGE' | 'PROFILE' | 'SEEDING_GROUP';
  sharedToGroup?: string;                   // Tên nhóm nếu có đăng chéo

  link: string;
  videoType: 'Shorts' | 'Video Dài' | 'Post Ảnh' | 'Post Text' | 'Live';
  hook?: string;                            // Tiêu đề / Câu Hook mở đầu
  pillar?: string;                          // Trục nội dung (AI, Dev, Khóa học...)
  ctaType?: string;                         // 'Gửi tin nhắn', 'Comment nhận tài liệu', 'Link Bio'

  // Chỉ số Tiếp cận & Tương tác
  reach: number;                            // Lượt tiếp cận (FB) hoặc Views (YT/TT)
  likes?: number;
  comments?: number;
  shares?: number;

  // CHỈ SỐ CHUYỂN ĐỔI TIN NHẮN
  inboxCount: number;                       // Số tin nhắn khách mới phát sinh
  qualifiedLeads?: number;                  // Số lead chất lượng

  // Chỉ số Giữ chân Video (Nâng cao)
  retention3sRate?: number;                 // Tỷ lệ giữ chân 3s đầu (%)
  completionRate?: number;                  // Tỷ lệ xem hết video (%)
  avgWatchTimeSeconds?: number;             // Thời lượng xem trung bình

  isShared?: boolean;
  image?: string | null;
  syncSource?: 'AUTO_API' | 'MANUAL';       // Nguồn dữ liệu tự động hay thủ công
}
```

---

## Lộ trình Triển khai (Implementation Roadmap)

```
Giai đoạn 1: Chuẩn hóa Schema & Giao diện Đo lường Page + Tin nhắn (1 - 2 tuần)
├── Tách cấu trúc Fanpage chính chủ và Nhóm Seeding
├── Thêm chỉ số Tin nhắn khách (inboxCount) vào Form, Bảng dữ liệu và Xuất PDF
└── Viết lại Dashboard /analytics: Thêm Page Scorecard & Tỷ lệ Inbox/Reach

Giai đoạn 2: Tự động hóa API Kênh & Đồng bộ Định kỳ (2 - 3 tuần)
├── Tích hợp Meta Graph API: Tự động lấy bài đăng, Reach và Tin nhắn mới của Fanpage
├── Tích hợp YouTube Data API: Tự động lấy danh sách Shorts/Videos và số View
├── Xây dựng Cron Job chạy lúc 00:05 mỗi ngày tự động cập nhật Database
└── Nâng cấp Bot Webhook gửi báo cáo tổng kết phân theo từng Page và số tin nhắn

Giai đoạn 3: Phân tích Video Nâng cao & Tối ưu Chuyển đổi (2 tuần)
├── Xây dựng biểu đồ Phễu Giữ chân Video 3s Hook Retention Curve
├── Xây dựng Ma trận Khung giờ Đăng bài Tối ưu (Posting Time Heatmap)
└── Xây dựng Bảng Xếp hạng Nội dung Kéo Tin nhắn (Top Inbox Driver Leaderboard)
```

---

*Tài liệu được biên soạn đồng bộ với kiến trúc mã nguồn hiện tại của dự án ContentFlow CRM (`web/src/lib/db.ts`, `src/pages/api/reports.ts`, `src/pages/analytics.tsx`, `src/pages/index.tsx`).*
