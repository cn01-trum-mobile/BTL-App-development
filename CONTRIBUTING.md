# Hướng dẫn đóng góp (Contributing Guide)

Cảm ơn bạn đã quan tâm đóng góp vào dự án!  
Hướng dẫn này giúp mọi người làm việc đồng bộ, dễ quản lý và review code.

---

## 1. Nguyên tắc chung
- Giữ repo gọn gàng, commit rõ ràng, tách branch cho từng tính năng/fix.  
- Trước khi bắt đầu, **check Issues** để tránh trùng công việc.  
- Tôn trọng review, feedback và coding standards của dự án.  

---

## 2. Quy trình xử lý Issue

1. **Chọn Issue**
   - Mở tab **Issues**, chọn issue muốn làm.  
   - Đọc kỹ mô tả, comments, labels, và milestone.

2. **Tạo branch mới**
   - Convention:  
     ```
     issue/<issue-number>-short-description
     ```
     Ví dụ: `issue/23-fix-login-bug`

3. **Làm việc trên branch**
   - Commit code sửa lỗi, thêm tính năng hoặc viết test.  
   - Commit message rõ ràng theo format:  
     ```
     type(scope): mô tả ngắn
     ```
     Ví dụ: `fix(login): sửa lỗi đăng nhập khi password rỗng`  
     **Type** có thể là: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

4. **Push branch lên GitHub**
```bash
   git push origin issue/23-fix-login-bug
```
5. **Tạo Pull Request (PR)**

- Mô tả chi tiết thay đổi, test đã làm.
- Ghi rõ issue liên quan: `Closes #<issue-number>` → tự động đóng issue khi merge.
- Chọn reviewer nếu cần.

6. **Code review**
- Người review có thể yêu cầu chỉnh sửa hoặc comment.
- Sửa theo feedback, commit mới sẽ tự động cập nhật vào PR.

7. **Merge branch**

- Sau khi review xong, merge vào branch chính (`main` hoặc `develop`).
- Xoá branch để giữ repo gọn gàng.

## 3. Commit message chuẩn  
   - Commit message rõ ràng theo format:  
     ```
     type(scope): mô tả ngắn
     ```
     Ví dụ: `fix(login): sửa lỗi đăng nhập khi password rỗng`  
     **Type** có thể là: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## 4. Quy tắc Pull Request
- Tạo PR từ branch riêng, không push trực tiếp lên main.
- Gắn issue liên quan: `Closes #<issue-number>`
- Mô tả chi tiết thay đổi và test đã thực hiện.
- PR được approve mới merge.

## 5. Chỉnh sửa Wiki
Wiki là tài liệu hướng dẫn, quy trình, kiến thức dự án.

1. **Edit trực tiếp trên GitHub**
- Vào tab **Wiki**, chọn trang → nhấn **Edit** → sửa → **Save Page**
- Không cần PR nếu edit trực tiếp.

2. **Edit bằng Git**
- Wiki cũng là Git repo riêng:
```bash
git clone https://github.com/cn01-trum-mobile/BTL-App-development.wiki.git
```
- Tạo branch mới, sửa file .md, commit, push.
- Khuyến nghị tạo PR nếu nhiều người cùng chỉnh sửa.

3. **Nguyên tắc chỉnh sửa**
- Tuân thủ Markdown, viết rõ ràng, dễ hiểu.
- Thêm links nếu liên quan tới issue hoặc page khác.
- Nếu xóa hoặc đổi lớn → ghi chú lý do trong commit hoặc PR.

Cảm ơn bạn đã đóng góp! 🎉