# Tra cứu lịch đăng ký học phần

Website Next.js App Router dùng TypeScript và Tailwind CSS để tra cứu lịch đăng ký học phần theo mã lớp.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

Trên PowerShell nếu bị chặn `npm.ps1`, dùng:

```bash
npm.cmd install
npm.cmd run dev
```

## Build

```bash
npm run build
```

## Deploy Vercel

1. Push project lên GitHub/GitLab/Bitbucket.
2. Import repository trong Vercel.
3. Framework preset: `Next.js`.
4. Build command: `npm run build`.
5. Output directory: để mặc định.

Project không dùng database, Supabase hay backend API; dữ liệu được import trực tiếp từ JSON nên deploy tĩnh tốt trên Vercel.

## Sửa dữ liệu

Dữ liệu chính nằm tại:

```text
src/data/registration-schedule.json
```

Cấu trúc gồm:

- `faculties`: danh sách khoa/ngành, pattern và token nhận diện.
- `schedules`: danh sách lịch đăng ký theo khóa, nhóm, khoa/ngành áp dụng và thời gian hiển thị.

Khi thêm mã ngành mới:

1. Tìm đúng khoa/ngành trong `faculties`.
2. Thêm pattern vào `patterns`, ví dụ `xxĐHTTxx`.
3. Thêm token vào `tokens`, ví dụ `ĐHTT`.

Khi thêm lịch mới:

1. Thêm object vào `schedules`.
2. Điền `cohort`, `group`, `title`.
3. Gán `appliesToFacultyIds` hoặc `appliesToTokenRules`.
4. Cập nhật các mốc `startFrom`, `startTo`, `transitionAt`, `closeAt` và `display`.

## Thiết lập Google Sheets cho góp ý/báo lỗi

Chức năng `Góp ý / Báo lỗi` ghi dữ liệu qua API server-side của Next.js, không gọi Google Sheets API từ frontend.

1. Tạo Google Cloud Project.
2. Enable Google Sheets API.
3. Tạo service account.
4. Tạo JSON key cho service account. Không commit file JSON key này lên GitHub.
5. Tạo Google Spreadsheet với 2 sheet:
   - `ma_nganh_gop_y`
   - `bao_loi`
6. Để Google Sheet ở chế độ `Restricted/private`. Không bật `Anyone with the link: Editor`.
7. Thêm header row cho sheet `ma_nganh_gop_y`:

```text
id | created_at | type | selected_faculty_id | selected_faculty_name | new_code_pattern | class_code_example | note | existing_patterns_snapshot | page_url | user_agent | ip_hash | status | admin_note
```

Range append: `ma_nganh_gop_y!A:N`

8. Thêm header row cho sheet `bao_loi`:

```text
id | created_at | type | error_title | message | page_url | user_agent | ip_hash | status | admin_note
```

Range append: `bao_loi!A:J`

9. Share spreadsheet cho service account email với quyền `Editor`.
10. Thêm env vars vào `.env.local`:

```bash
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
FEEDBACK_ALLOWED_ORIGIN=http://localhost:3000
FEEDBACK_HASH_SALT=
```

`GOOGLE_PRIVATE_KEY` trên Vercel thường chứa escaped newline. Code đã xử lý dạng `\n` bằng `.replace(/\\n/g, "\n")`.

11. Thêm env vars trên Vercel:
    - `GOOGLE_SHEET_ID`
    - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
    - `GOOGLE_PRIVATE_KEY`
    - `FEEDBACK_ALLOWED_ORIGIN=https://ten-domain-cua-ban.vercel.app`
    - `FEEDBACK_HASH_SALT` nếu muốn dùng salt riêng cho IP hash

12. Chạy lại:

```bash
npm install
npm run dev
npm run build
```

Khi admin duyệt góp ý đúng, sửa file JSON chính tại `src/data/registration-schedule.json`, commit lên GitHub và để Vercel deploy lại.

Lưu ý bảo mật:

- Không dùng biến môi trường `NEXT_PUBLIC_` cho Google Sheet ID, email service account hoặc private key.
- API chỉ append row vào Google Sheets, không có endpoint update/delete.
- IP được hash SHA-256 trước khi ghi vào sheet.
- Google Sheet private/restricted, chỉ share quyền Editor cho service account.
- Rate limit hiện là in-memory mức nhẹ. Với production nhiều traffic, nên thêm Cloudflare Turnstile hoặc reCAPTCHA.
