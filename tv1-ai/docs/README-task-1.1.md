# Bắt đầu task 1.1 — TV1 — Lead + AI

## Đưa vào repository

Giải nén gói vào folder gốc repository để có đường dẫn:

```text
<repo>/tv1-ai/docs/solution-v1.md
```

Không lồng thêm một folder `haui_task_1_1` giữa root và `tv1-ai`. Không ghi đè file đang có cùng tên mà chưa xem diff; gói được chuẩn bị cho trường hợp repo chưa có ứng dụng.

## Thực hiện

Mở agent tại root repository. Dán khối prompt trong `prompt-task-1.1.md`. Agent chỉ rà/hoàn thiện tài liệu và tạo `review-task-1.1.md`; không cài dependency hoặc dựng ứng dụng.

TV1 đọc solution và review, xem diff, kiểm tra nguồn còn nguyên. Sau khi TV1 chấp nhận tài liệu, đưa thay đổi tài liệu lên nhánh chung theo quy trình Git của nhóm. Gửi đường dẫn/commit cho TV5 để bắt đầu task 1.2. Không coi việc tạo tài liệu là duyệt prototype hay nghiệm thu chương trình.

## File trong gói

| File | Vai trò |
|---|---|
| `solution-v1.md` | Tài liệu solution, phạm vi và bàn giao task 1.1. |
| `prompt-task-1.1.md` | Prompt rà và hoàn thiện tài liệu trong repo đích. |
| `source-manifest.json` | Tên, kích thước và SHA-256 của bảy file nguồn. |
| `sources/` | Bảy file gốc được sao chép nguyên byte, giữ nguyên tên. |
| `review-task-1.1.md` | Chưa có sẵn; agent tạo sau khi thực sự kiểm tra repo đích. |

Hash khớp chỉ chứng minh file nguồn không đổi so với bản đóng gói, không chứng minh quy tắc học vụ đã đúng hoặc UI đã được duyệt. Mọi kết quả runtime/prototype/AI vẫn chưa được kiểm thử trong task này.
