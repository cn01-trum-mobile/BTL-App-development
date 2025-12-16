# 📸 CapdeCours - Ứng dụng Quản lý ảnh chụp bài giảng
> 💬 **"Chụp nhanh – Lưu gọn – Tìm dễ"**
> 
## 🎯 Tổng quan
Sinh viên thường chụp ảnh bài giảng trên bảng hoặc slide trong quá trình học. Tuy nhiên, các ảnh này dễ bị trộn lẫn với ảnh cá nhân và không được tổ chức theo ngữ cảnh học tập, khiến việc tìm lại để ôn tập trở nên khó khăn.

Ứng dụng này được xây dựng để giải quyết *pain point* đó, giúp người dùng **chụp nhanh – lưu gọn – tìm dễ** mà không cần thao tác thủ công phức tạp.

---

## ❓ Vấn đề & Giải pháp

### 🔎 Why – Tại sao vấn đề này tồn tại?
- Điện thoại cho phép tạo album ảnh, nhưng vì **phải làm thủ công**, sinh viên thường **quên hoặc không duy trì việc sắp xếp**.
- Ảnh bài giảng dễ bị trộn lẫn với ảnh cá nhân, dẫn đến khó quản lý và tốn thời gian tìm kiếm.
- Các ứng dụng lưu trữ ảnh hiện có **chưa được thiết kế riêng cho việc tổ chức ảnh theo lịch học**.

---

### 🚧 What – Thách thức
- Cần một công cụ:
  - **Chụp ảnh nhanh**
  - **Phân loại tự động**
  - **Dễ tìm lại**
- Nhưng vẫn phải **đơn giản, trực quan**, không làm gián đoạn trải nghiệm học tập trên điện thoại.

---

### 💡 How – Giải pháp
- Phát triển một **ứng dụng chụp ảnh chuyên biệt cho bài giảng** với giao diện tối giản.
- Ứng dụng sử dụng **app lịch mặc định trên điện thoại** làm nguồn chính  
  (bao gồm lịch từ các tài khoản đã đăng nhập trên thiết bị).
- Người dùng có thể **thêm nhanh một sự kiện lớp học đơn lẻ ngay trong app** khi cần.
- Khi đến đúng thời gian học, ảnh chụp bằng app sẽ được:
  - **Tự động phân loại** theo môn học, buổi học và thời gian chụp
  - **Lưu vào thư viện của app** với tên file có cấu trúc rõ ràng:
`[Môn học][Buổi học][Thời gian chụp]`

---

### Who – Đối tượng 
- Sinh viên, học sinh ở **bất kỳ trường nào** cho phép sử dụng điện thoại để chụp ảnh trong giờ học.
- **Bất kỳ người dùng nào** có nhu cầu chụp ảnh và **phân loại nội dung dựa trên lịch cá nhân** (lịch học, lịch họp, lịch sinh hoạt).

---

### Where – Bối cảnh sử dụng
- Trong lớp học khi chụp bài giảng.
- Ở thư viện hoặc ký túc xá khi xem lại nội dung.
- Bất kỳ đâu người dùng cần **chụp và tổ chức ảnh nhanh chóng theo ngữ cảnh thời gian**.

---

## ✨ Core Features
- Ứng dụng quản lý ảnh bài học **đơn giản & trực quan**.
- **Kết nối với lịch** trên thiết bị/ Cho phép người dùng thêm sự kiện trong app.
- Chụp ảnh nhanh và **phân loại tự động theo lịch**.
- Ảnh được **tổ chức khoa học** theo cấu trúc thống nhất.

---

## 🌟 Nice-to-have Features
- Ghi chú (note) dưới ảnh, tóm tắt nội dung chính.  
- Recap cuối tuần: tổng hợp lại các ảnh đã chụp.  
- Chia sẻ ảnh cho bạn bè trong danh sách liên hệ.  
- Import ảnh từ thư viện bên ngoài.  
- Ảnh chụp ngoài giờ học → đưa vào mục *“Ảnh lang thang”*, nhắc nhở người dùng phân loại thủ công.  
- Ứng dụng hoạt động *offline*.  

---

## 🚀 Lợi ích
- Sinh viên *không cần lo mất công tìm ảnh bài giảng*.  
- Giúp *ôn tập nhanh chóng* trước kỳ thi.  
- Tăng sự *ngăn nắp & hiệu quả* trong học tập.  

---

## 📅 Roadmap dự kiến
- [1] Thiết kế UI/UX gọn nhẹ, dễ sử dụng.  
- [2] Tích hợp chụp ảnh và lưu theo lịch học.  
- [3] Thêm tính năng ghi chú & recap tuần.  
- [4] Hỗ trợ chia sẻ & import ảnh ngoài.  
- [5] Phát hành bản Beta cho sinh viên thử nghiệm.  

---

## 👨‍🎓 Đối tượng thử nghiệm
- Nhóm sinh viên Bách Khoa (giai đoạn đầu).  
- Mở rộng ra toàn bộ học sinh/sinh viên ở các trường khác.  

---

## 🧪 Hướng dẫn kiểm thử

Dự án này sử dụng **Jest** và **React Native Testing Library** để kiểm
thử cả giao diện UI và logic của ứng dụng.

### 1. Chạy tất cả các bài kiểm thử

``` bash
npm run test
```

Lệnh này sẽ:

-   Chạy tất cả các file test trong thư mục `__tests__/`
-   Hiển thị kết quả pass/fail trên terminal
-   Tự động theo dõi thay đổi file trong chế độ development

### 2. Chạy kiểm thử kèm báo cáo coverage

``` bash
npm run test:coverage
```

Lệnh này sẽ:

-   Tạo **báo cáo coverage**
-   Xuất kết quả vào:

```
    coverage/
    └── index.html
```
Bạn có thể mở `coverage/index.html` trong trình duyệt để xem bảng báo
cáo coverage chi tiết (statements, branches, functions, lines).




[![React Native CI - Test, Report & SonarCloud](https://github.com/cn01-trum-mobile/BTL-App-development/actions/workflows/test.yml/badge.svg)](https://github.com/cn01-trum-mobile/BTL-App-development/actions/workflows/test.yml)

[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=cn01-trum-mobile_BTL-App-development)](https://sonarcloud.io/summary/new_code?id=cn01-trum-mobile_BTL-App-development)
