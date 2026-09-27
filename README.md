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

## Dữ liệu mã lớp khóa 2026

Khóa 2026 ưu tiên mapping mã lớp đầy đủ trong `src/data/class-mappings-2026.json`.
Với mã lớp chưa có bản ghi riêng, hệ thống nhận diện khoa theo tiền tố `26` + hai chữ cái: sáu tiền tố được đối chiếu không va chạm từ nguồn SV/PDT và 12 tiền tố khoa do người dùng cung cấp trong `scripts/data-2026-faculty-prefixes.json`. Có thể tra cứu chỉ bằng tiền tố, ví dụ `26IT` hoặc `26BA`; số thứ tự lớp không tham gia xác định khoa. Quy tắc do người dùng cung cấp chỉ xác định **khoa**, không tự suy ra ngành/chuyên ngành hay lịch đăng ký.
Pattern/token của khóa 2023–2025 trong `registration-schedule.json` vẫn được giữ nguyên.
Hai nguồn dùng để cập nhật mapping:

- SV: `https://sv.vau.edu.vn/lich-toan-truong.html` cung cấp mã lớp, mã LHP và lịch dạy; khoa giảng viên không được dùng để xác định ngành sinh viên.
- PDT: `https://pdt.vau.edu.vn/tra-cuu-thoi-khoa-bieu` cung cấp bộ lọc ngành và LHP. Collector dùng GET cho trang PDT và các endpoint JSON/POST của trang SV.

Cần Node.js 24 để chạy script cập nhật dữ liệu. Đặt cookie còn hiệu lực vào file `.env` hoặc `.env.local` đã được Git bỏ qua:

```text
ASC_AUTH=<giá trị cookie ASC.AUTH>
```

Không đưa cookie vào source, commit, log hoặc báo cáo. Nếu phiên hết hạn, script sẽ dừng và báo lỗi.

```bash
npm run data:2026:fetch
npm run data:2026:process
npm run data:2026:validate
```

`npm run data:2026` chạy cả ba bước. `fetch` dùng cache theo khoa/ngành/tháng ở `data/raw/2026/` (không commit); chỉ dùng `--refresh` sau khi cần tải lại nguồn. Dữ liệu đã đối chiếu và thống kê nằm ở `data/processed/2026/`. Script kiểm tra số record, mapping và regression 2023–2025 trước khi thay file production bằng ghi atomic.

Mỗi mã lớp được đối chiếu bằng mã LHP chung giữa hai nguồn. Khi thiếu mã LHP, matcher chỉ thử tổ hợp tên môn + giảng viên + phòng + tiết và chỉ nhận khi không có nhiều ứng viên; không ghép chỉ theo mã môn. Ngành được xét ở cấp mã lớp từ nhiều LHP, bỏ qua `Chương trình chung` như bằng chứng phân ngành. Các lớp đã biết khoa nhờ quy tắc người dùng nhưng chưa xác nhận được ngành nằm trong `data/processed/2026/unresolved-summary.json`. Pipeline kiểm tra quy tắc người dùng không mâu thuẫn với mapping nguồn có độ tin cậy cao trước khi ghi file production.

Đợt dữ liệu hiện tại chỉ bao phủ học kỳ 1 năm học 2026–2027. Hai nguồn này không công bố lịch đăng ký học phần khóa 2026 nên website chỉ hiển thị khoa đã đối chiếu, ngành nếu đủ bằng chứng, cùng trạng thái chưa có lịch đăng ký.

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

## Lịch nhận biểu mẫu

Trang `/form-schedule` hiển thị trạng thái mở tủ nhận biểu mẫu theo thời gian thực. Dữ liệu nằm tại:

```text
src/data/form-lockers.json
```

Để sửa lịch của một khoa:

1. Sửa `scheduleText` để cập nhật câu mô tả hiển thị.
2. Sửa danh sách `slots` theo `dayOfWeek` và `session`. `startTime`, `endTime` chỉ là ranh giới kỹ thuật để xác định buổi.

Quy ước thời gian:

- Giao diện chỉ hiển thị buổi sáng hoặc buổi chiều, không hiển thị giờ mở tủ cụ thể.
- `dayOfWeek` từ `1` đến `7`: `1` là Thứ 2, `7` là Chủ nhật.
- `session` nhận giá trị `morning` hoặc `afternoon`.
- Ranh giới kỹ thuật theo giờ Việt Nam: sáng `07:30–11:30`, chiều `13:00–17:00`. Đây không phải cam kết giờ mở khóa thực tế; giao diện vẫn chỉ hiển thị buổi.

Trạng thái được tính một lần khi tải trang theo múi giờ `Asia/Ho_Chi_Minh`. Người dùng reload trang để cập nhật trạng thái mới. Chức năng này không cần database hay backend API.

Lưu ý bảo mật:

- Không dùng biến môi trường `NEXT_PUBLIC_` cho Google Sheet ID, email service account hoặc private key.
- API chỉ append row vào Google Sheets, không có endpoint update/delete.
- IP được hash SHA-256 trước khi ghi vào sheet.
- Google Sheet private/restricted, chỉ share quyền Editor cho service account.
- Rate limit hiện là in-memory mức nhẹ. Với production nhiều traffic, nên thêm Cloudflare Turnstile hoặc reCAPTCHA.
