# 📸 CapdeCours
> **Chụp nhanh – Lưu gọn – Tìm dễ** 

**CapdeCours** là trợ lý học tập đắc lực giúp sinh viên số hóa, phân loại và tìm kiếm ảnh bài giảng chỉ trong một cú chạm. Biến thư viện ảnh phức tạp thành một đề cương ôn tập ngăn nắp.

---

## 🎯 Vấn đề & Giải pháp

Tại sao sinh viên cần **CapdeCours** thay vì thư viện ảnh mặc định?

### 😩 Vấn đề thực tế
* **Thư viện ảnh rối loạn:** Ảnh chụp slide bài giảng quan trọng bị chìm nghỉm giữa hàng ngàn ảnh selfie, meme và ảnh đời sống.
* **Truy xuất khó khăn:** Mất quá nhiều thời gian để lướt tìm lại một công thức cũ mỗi khi đến mùa thi cử.
* **Tốn công sức:** Việc tạo album và di chuyển ảnh thủ công sau mỗi buổi học là một trải nghiệm nhàm chán và tốn thời gian.

### ✅ Giải pháp của chúng tôi
* **🧩 Tự động phân loại:** Thuật toán tự động nhận diện thời gian chụp để khớp với lịch học, đưa ảnh về đúng thư mục môn học mà không cần thao tác.
* **🗂 Tổ chức khoa học:** Hệ thống lưu trữ trực quan theo Môn học và Timeline, giúp việc xem lại bài giảng liền mạch như đọc vở ghi.
* **✨ Trải nghiệm tối giản:** Giao diện tập trung hoàn toàn vào nội dung học tập, loại bỏ các yếu tố gây xao nhãng.

---

## 🚀 Tính năng chính

| Tính năng | Mô tả |
|-----------|------|
| 📅 **Kết nối lịch** | Đồng bộ với lịch trên thiết bị |
| 📸 **Chụp nhanh** | Chụp và phân loại tự động |
| 🗂️ **Tổ chức khoa học** | Sắp xếp theo `[Môn][Buổi][Thời gian]` |
| 🔍 **Tìm dễ dàng** | Tìm ảnh theo môn học, ngày tháng |

---

## 🌟 Tính năng nâng cao

- 📝 Ghi chú dưới ảnh
- 📥 Xuất ra thư viện ảnh
- 📱 Hoạt động offline

---

## 👥 Đối tượng sử dụng
- Sinh viên, học sinh các trường
- Người dùng cần quản lý ảnh theo thời gian

---

## 🔗 Tìm hiểu thêm về ứng dụng

- 🌐 **Landing Page**: [Xem trên Landing Page](https://cn01-trum-mobile.github.io/.github/index.html)
- 🎨 **UI/UX Design**: [Xem trên Behance](https://www.behance.net/gallery/237512783/CapDeCours)

---

## 📲 Tải ứng dụng

### 🤖 Android
Tải file APK tại đây:
[![Download APK](https://img.shields.io/badge/Download-APK-blue?style=for-the-badge)](https://drive.google.com/drive/folders/1G6HguScF-K-VYe7tPWVIxrd02aJe9rf7)

### 🍎 iOS
Trên iOS thì hơi phức tạp một chút, các bạn có thể sử dụng bằng cách dưới đây:
1. Cài **Expo Go** từ App Store
2. Quét mã QR bằng camera dưới đây:

![QR Code](./CapdeCours/assets/images/QR_code.png)

---

## ⚠️ Lưu ý quan trọng

> **Về tính năng Đăng nhập / Đăng ký:**
>
> Hiện tại, hệ thống **Server Backend chưa được triển khai**. Do đó, tính năng **Đăng nhập/Đăng ký** tạm thời không khả dụng.
>
> 💡 **Hướng xử lý:** Vui lòng trải nghiệm ứng dụng khi bỏ qua màn hình đăng nhập bằng nút *Skip* để truy cập các tính năng chính.

---

## ⚙️ Cài đặt và chạy

### Yêu cầu
- Node.js 18+
- npm hoặc yarn

### Các bước thực hiện

```bash
# 1. Vào thư mục dự án
cd CapdeCours

# 2. Cài đặt dependencies
npm install

# 3. Cấu hình môi trường
cp .env.example .env
# Chỉnh sửa API_URL cho backend trong file .env

# 4. Chạy ứng dụng
npm start
```

Code backend: [Tại đây](https://github.com/cn01-trum-mobile/CapdeCours-backend)

### Chạy trên thiết bị
- **Expo Go**: Quét QR code sau khi chạy `npm start`
- **Android**: `npm run android`
- **iOS**: `npm run ios` (chỉ macOS)
- **Web**: `npm run web`

---

## 🧪 Kiểm thử

```bash
# Chạy test
npm run test

# Test với báo cáo coverage
npm run test:coverage
```

---

## 📊 Quality

[![CI/CD](https://github.com/cn01-trum-mobile/BTL-App-development/actions/workflows/test.yml/badge.svg)](https://github.com/cn01-trum-mobile/BTL-App-development/actions/workflows/test.yml)

[![Quality Gate](https://sonarcloud.io/api/project_badges/quality_gate?project=cn01-trum-mobile_BTL-App-development)](https://sonarcloud.io/summary/new_code?id=cn01-trum-mobile_BTL-App-development)
