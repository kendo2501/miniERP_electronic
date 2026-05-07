# Authentication & Authorization Module — BMAD Spec

## 1. Mục tiêu module

Authentication & Authorization Module chịu trách nhiệm quản lý danh tính người dùng, xác thực, phân quyền và bảo mật truy cập cho toàn bộ hệ thống Mini-ERP B2B.

Module này xử lý:

* đăng nhập bằng email doanh nghiệp
* JWT/session management
* refresh token
* RBAC (role-based access control)
* email verification
* password reset
* account lockout
* optional MFA
* audit security events

Authentication Module là foundational module dùng chung cho mọi bounded context khác.

## 2. Phạm vi nghiệp vụ

### In-scope

* Đăng nhập bằng email công ty.
* Quản lý user account.
* RBAC authorization.
* JWT access token.
* Refresh token.
* Session management.
* Email verification.
* Password reset.
* Password policy enforcement.
* Account activation/deactivation.
* Failed login tracking.
* Rate limiting.
* Optional MFA.
* Security audit logs.
* Role & permission management.

### Out-of-scope

* Business workflow riêng của Sales/Inventory/Finance.
* Payment authentication bên thứ ba.
* Social login/OAuth bên ngoài nếu chưa enable.

## 3. Bối cảnh dự án

Hệ thống Mini-ERP B2B sử dụng xác thực email doanh nghiệp nội bộ thay vì OAuth mặc định. User được Admin tạo và phân quyền theo role.

Các role chính:

* Admin
* Manager
* Sales
* Customer

Module này là entry point cho toàn bộ hệ thống và phải đáp ứng yêu cầu bảo mật cao theo OWASP/NIST.

## 4. Mục tiêu thiết kế của Auth

* Xác thực an toàn.
* Không lưu plain-text password.
* Hỗ trợ RBAC rõ ràng.
* Audit mọi security-sensitive actions.
* Quản lý session/token an toàn.
* Chống brute-force và replay.
* Dễ mở rộng MFA/OAuth sau này.

## 5. Định nghĩa domain

### 5.1 User

User là aggregate root chính của Authentication Module.

#### Thuộc tính cốt lõi

* id
* organizationId
* email
* passwordHash
* fullName
* status
* isVerified
* failedLoginAttempts
* lockedUntil
* lastLoginAt
* createdAt
* updatedAt

#### Trạng thái gợi ý

* ACTIVE
* INACTIVE
* LOCKED
* PENDING_VERIFICATION
* SUSPENDED

### 5.2 Role

Role biểu diễn nhóm quyền.

#### Vai trò mặc định

* ADMIN
* MANAGER
* SALES
* CUSTOMER

### 5.3 Permission

Permission biểu diễn hành động cụ thể.

#### Ví dụ

* product.create
* order.confirm
* inventory.adjust
* finance.reverse_payment

### 5.4 Session

Session biểu diễn phiên đăng nhập.

#### Thuộc tính cốt lõi

* id
* userId
* accessTokenId
* refreshTokenId
* ipAddress
* userAgent
* expiresAt
* revokedAt
* createdAt

### 5.5 RefreshToken

Refresh token dùng để cấp mới access token.

#### Thuộc tính cốt lõi

* id
* userId
* tokenHash
* expiresAt
* revokedAt
* createdAt

### 5.6 EmailVerification

Quản lý xác minh email.

### 5.7 PasswordReset

Quản lý reset password.

## 6. Business rules

* Email phải unique.
* Password phải được hash mạnh.
* Không lưu plain-text password.
* Access token phải có expiration.
* Refresh token phải revoke được.
* User chưa verify email không được login nếu policy yêu cầu.
* Failed login vượt threshold phải lock account.
* Role-based access phải enforce ở API/use case level.
* Password reset token chỉ dùng một lần.
* Session revoked không được reuse.

## 7. Password policy

### Yêu cầu gợi ý

* tối thiểu 15 ký tự nếu không dùng MFA
* có entropy đủ mạnh
* reject password phổ biến
* không reuse gần đây nếu policy yêu cầu

### Hashing

* bcrypt hoặc argon2
* salt đầy đủ
* cost factor phù hợp

## 8. Use cases

### 8.1 Register User

Tạo tài khoản user.

### 8.2 Verify Email

Xác minh email qua token.

### 8.3 Login

Đăng nhập.

**Preconditions**

* Email tồn tại.
* Account active.
* Password đúng.

**Postconditions**

* JWT được cấp.
* Refresh token được tạo.
* Session được ghi.
* Failed attempts reset.

### 8.4 Refresh Access Token

Cấp mới access token.

### 8.5 Logout

Logout session.

### 8.6 Forgot Password

Gửi reset password email.

### 8.7 Reset Password

Đặt password mới.

### 8.8 Change Password

Đổi password khi đã login.

### 8.9 Lock Account

Khóa tài khoản do policy hoặc admin.

### 8.10 Assign Role

Gán role cho user.

### 8.11 Check Permission

Kiểm tra quyền.

## 9. API contract đề xuất

### 9.1 POST /auth/login

Đăng nhập.

**Request**

```json
{
  "email": "sales@example.com",
  "password": "StrongPassword123!"
}
```

**Response**

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "email": "sales@example.com",
    "roles": ["SALES"]
  }
}
```

### 9.2 POST /auth/refresh

Refresh access token.

### 9.3 POST /auth/logout

Logout.

### 9.4 POST /auth/forgot-password

Gửi reset email.

### 9.5 POST /auth/reset-password

Reset password.

### 9.6 POST /auth/verify-email

Verify email.

### 9.7 GET /auth/me

Thông tin current user.

### 9.8 POST /roles/assign

Gán role.

## 10. Input validation

* email: required, normalized, valid format.
* password: required, policy compliant.
* refresh token: required.
* verification token: required.
* reset token: required.
* role assignment phải hợp lệ.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* User
* Role
* Permission
* Session
* RefreshToken
* EmailVerification
* PasswordReset
* PasswordHash
* AccessToken
* UserStatus

### Domain invariants

* Email unique.
* Password hash không rỗng.
* Session revoked không reusable.
* Refresh token expired không usable.
* User phải active để login.

## 12. RBAC strategy

### Mô hình

* User -> Roles -> Permissions

### Ví dụ

#### Admin

* full access

#### Manager

* approve orders
* manage sales team

#### Sales

* create orders
* manage customers

#### Customer

* view own orders

### Enforcement

* route level
* controller level
* use case level

## 13. JWT strategy

### Access token

* short-lived
* chứa userId + roles + permissions summary

### Refresh token

* long-lived
* revoke được
* rotate nếu policy yêu cầu

### Claims gợi ý

* sub
* roles
* exp
* iat
* jti

## 14. Session management strategy

### Mục tiêu

* Theo dõi active sessions.
* Revoke session khi cần.
* Detect suspicious activity.

### Session metadata

* IP address
* user agent
* login time
* last activity

## 15. Security strategy

### Brute-force protection

* rate limiting
* exponential delay
* captcha optional
* account lockout

### Token security

* HttpOnly cookies hoặc secure storage.
* revoke refresh token.
* rotate refresh token.

### Transport security

* HTTPS/TLS only.

### Audit

* login success/failure
* password reset
* role assignment
* account lockout

## 16. MFA strategy (optional)

### MFA methods gợi ý

* TOTP authenticator app
* email OTP
* SMS OTP (không ưu tiên)

### Rules

* Admin có thể bắt buộc MFA.
* Recovery flow phải audit.

## 17. Module events

Authentication Module có thể phát các events sau:

* UserRegistered
* UserVerified
* UserLoggedIn
* UserLoggedOut
* PasswordChanged
* PasswordResetRequested
* AccountLocked
* RoleAssigned

### Event consumers

#### Notification Module

* gửi email verify/reset
* security alert

#### Audit Module

* security logging

## 18. Cache strategy

### Cache candidates

* session lookup
* permission cache
* RBAC policy cache

### Cache invalidation

* role change
* permission change
* logout/revoke

### Cache key gợi ý

* auth:session:{sessionId}
* auth:user-permissions:{userId}
* auth:refresh-token:{tokenId}

## 19. Audit logging requirements

### Security events cần audit

* login success/failure
* logout
* password reset
* role assignment
* failed attempts
* account lock/unlock
* token revoke

### Audit fields

* userId
* action
* ipAddress
* userAgent
* timestamp
* metadata

## 20. Non-functional requirements

* Authentication response nhanh.
* Session/token revoke đáng tin cậy.
* Không lộ thông tin nhạy cảm.
* Hỗ trợ scale ngang.
* Audit đầy đủ.
* Dễ mở rộng OAuth/MFA.

## 21. Security requirements

* Password hashing mạnh.
* Không log password/token raw.
* HTTPS mandatory.
* CSRF/XSS protection.
* JWT signing secret an toàn.
* Secure cookie nếu dùng cookie.
* Principle of least privilege.

## 22. Acceptance criteria

### Login

* Login thành công với credential hợp lệ.
* Failed attempts tăng đúng.
* Account lock hoạt động.
* JWT/refresh token được cấp đúng.

### Password Reset

* Token reset chỉ dùng một lần.
* Expired token bị reject.
* Password mới pass policy.

### RBAC

* User chỉ truy cập được resource được phép.
* Role assignment cập nhật đúng permission.

### Session Management

* Logout revoke session/token.
* Revoked token không reuse được.

## 23. Test strategy

### Unit tests

* password hashing correctness
* login success/failure
* refresh token flow
* account lockout logic
* permission check
* reset password flow
* email verification flow

### Integration tests

* controller -> use case -> repository flow
* JWT validation flow
* RBAC enforcement flow
* revoke session flow

### Security tests

* brute-force protection
* token replay attempt
* expired token handling
* unauthorized access
* privilege escalation attempt

## 24. Suggested folder structure

```text
modules/
  auth/
    domain/
      entities/
      value-objects/
      services/
      events/
      ports/
    application/
      use-cases/
      dtos/
      mappers/
    infrastructure/
      persistence/
      cache/
      jwt/
      mail/
      security/
    presentation/
      http/
      guards/
      validators/
      controllers/
    tests/
```

## 25. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: authentication + RBAC
* bounded context: Auth
* constraints kiến trúc: Hexagonal, Modular Monolith
* edge cases: brute-force, replay token, lockout, expired token, permission escalation
* output mong muốn: use case, guards, JWT flow, RBAC flow, test cases

## 26. Dependencies with other modules

### Notification

* gửi verify/reset/security email

### Audit

* ghi security events

### Sales/Inventory/Finance

* consume authorization/identity information
* không tự quản lý authentication riêng

## 27. Explicit anti-patterns

* Không lưu plain-text password.
* Không hardcode permissions trong nhiều nơi.
* Không để refresh token sống vô hạn.
* Không bỏ qua audit security events.
* Không expose sensitive error details.

## 28. Deliverables cho Authentication Module

* Domain model
* Application use cases
* HTTP API contract
* RBAC strategy
* JWT/session strategy
* Validation rules
* Security strategy
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Security tests
* Event contracts

## 29. Ghi chú triển khai

Phần database của Authentication Module nên được tách thành file riêng sau khi chốt RBAC model, JWT/session strategy và security policy. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
