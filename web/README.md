# ContentFlow CRM

Hệ thống báo cáo công việc nội dung hàng ngày (Facebook / YouTube / TikTok) + Kế hoạch tháng + Bot thông báo + Phân tích BI.

## Tính năng chính

- **Báo cáo hàng ngày**: nhập link tự nhận diện nền tảng, chọn nhóm/kênh, reach, hook, ảnh thumbnail, share status.
- **Nhập liệu nhanh**: Bulk Import nhiều link 1 lượt, Clone báo cáo, sửa inline Reach/Hook trong bảng.
- **Lọc thời gian**: Hôm nay / Theo tháng / Theo năm / Tất cả — dữ liệu lưu file theo ngày (`web/data/reports-YYYY-MM-DD.json`).
- **Xuất PDF**: báo cáo ngày/tháng/năm chuẩn thương hiệu + PDF Kế hoạch tháng; Xuất Excel (.csv).
- **Kế hoạch tháng**: Form chi tiết + Grid Excel + Kanban, Target Reach, Deadline, cảnh báo mục sắp đến hạn.
- **Bot Webhook**: gửi tổng hợp báo cáo NGÀY qua Lark/Telegram/Zalo — chỉ khi xác nhận, tối đa 2 lượt/ngày (file `bot-state.json`).
- **Analytics**: so sánh tháng này vs tháng trước, line chart xu hướng reach theo ngày, so sánh nền tảng, nhãn Viral ≥10k.
- **Phân quyền**: Admin (toàn quyền) / Member (nhập & xem, không quản lý kênh/bot, không xóa).

## Chạy local

```bash
cd web
bun install
bun run dev
# http://localhost:3000
```

## Tài khoản mặc định

| Vai trò | Mật khẩu mặc định | Biến môi trường |
|---|---|---|
| Admin | `admin123` | `NEXT_PUBLIC_ADMIN_PASSWORD` |
| Member | `member123` | `NEXT_PUBLIC_MEMBER_PASSWORD` |

> Đổi mật khẩu bằng cách tạo file `web/.env.local`:
> ```
> NEXT_PUBLIC_ADMIN_PASSWORD=matkhau_admin
> NEXT_PUBLIC_MEMBER_PASSWORD=matkhau_member
> NOTIFICATION_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/xxx
> ```
> Webhook cũng có thể cấu hình trực tiếp trong app (tab Quản Lý → khung 🤖, lưu vào `data/webhook-config.json`, ưu tiên hơn env).

## Đồng bộ dữ liệu qua Git

Toàn bộ dữ liệu nằm trong `web/data/*.json` và được commit lên git. Người khác chỉ cần `git pull` là thấy toàn bộ báo cáo/kế hoạch.

## Deploy lên Vercel (Lưu ý quan trọng)

App đang lưu dữ liệu bằng **file JSON trong thư mục project** — phù hợp chạy local + đồng bộ git. Nếu deploy lên Vercel:

1. Filesystem của serverless là **tạm thời**: ghi vào `data/` sẽ mất khi function tái khởi động.
2. Để chạy thật trên Vercel, cần đổi tầng lưu trữ sang database cloud (Vercel Postgres / Supabase / Turso) ở các API routes `web/src/pages/api/*`.

Các bước deploy (sau khi đã có DB hoặc chỉ muốn demo read-only):

```bash
npm i -g vercel
cd web
vercel            # lần đầu: link project
vercel --prod
```

Env cần set trên Vercel: `NEXT_PUBLIC_ADMIN_PASSWORD`, `NEXT_PUBLIC_MEMBER_PASSWORD`, `NOTIFICATION_WEBHOOK_URL`.

## Cấu trúc

```
web/src/pages/
  index.tsx      # Báo cáo hàng ngày + Quản lý kênh/nhóm + Bot config
  plan.tsx       # Kế hoạch tháng (Form/Grid/Kanban)
  analytics.tsx  # Dashboard BI
  login.tsx      # Đăng nhập phân quyền
  api/           # reports (đa ngày), plans, groups, yt-channels, tt-channels, webhook-config
web/data/        # JSON data (git-synced)
```
