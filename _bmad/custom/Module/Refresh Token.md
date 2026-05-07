# Session & Refresh Token Module — BMAD Spec

## 1. Mục tiêu module

Session & Refresh Token Module chịu trách nhiệm quản lý phiên đăng nhập, access token lifecycle, refresh token rotation và kiểm soát session security cho hệ thống Mini-ERP B2B.

Module này tách riêng khỏi business authentication logic để tập trung vào:

* session lifecycle
* token lifecycle
* token revocation
* concurrent session management
* device tracking
* security monitoring

Module này hỗ trợ Authentication Module nhưng có thể được scale và quản lý độc lập.

## 2. Phạm vi nghiệp vụ

### In-scope

* Session management.
* Access token lifecycle.
* Refresh token lifecycle.
* Refresh token rotation.
* Session revocation.
* Logout handling.
* Concurrent session control.
* Device/session tracking.
* Session expiration.
* Token replay protection.
* Suspicious session detection.
* Session audit logging.

### Out-of-scope

* Password authentication.
* RBAC authorization logic.
* MFA implementation logic.
* OAuth provider integration.

## 3. Bối cảnh dự án

Hệ thống Mini-ERP B2B sử dụng JWT-based authentication với refresh token.

Yêu cầu:

* access token short-lived
* refresh token revocable
* secure logout
* multi-device support
* session tracking
* replay attack protection

Module này đóng vai trò security-critical infrastructure.

## 4. Mục tiêu thiết kế của Session Module

* Quản lý token an toàn.
* Revoke session đáng tin cậy.
* Hỗ trợ multi-device.
* Chống replay attack.
* Theo dõi suspicious activity.
* Scale session lookup hiệu quả.
* Hỗ trợ audit đầy đủ.

## 5. Định nghĩa domain

### 5.1 Session

Session là aggregate root chính.

#### Thuộc tính cốt lõi

* id
* userId
* sessionIdentifier
* status
* ipAddress
* userAgent
* deviceFingerprint
* location
* lastActivityAt
* expiresAt
* revokedAt
* createdAt

#### Trạng thái gợi ý

* ACTIVE
* EXPIRED
* REVOKED
* SUSPICIOUS

### 5.2 RefreshToken

RefreshToken đại diện token dùng để cấp mới access token.

#### Thuộc tính cốt lõi

* id
* sessionId
* userId
* tokenHash
* status
* expiresAt
* rotatedFrom
* revokedAt
* createdAt

#### Trạng thái gợi ý

* ACTIVE
* USED
* REVOKED
* EXPIRED
* COMPROMISED

### 5.3 DeviceInfo

Thông tin thiết bị/session.

#### Thuộc tính gợi ý

* browser
* operatingSystem
* deviceType
* ipAddress
* geoLocation

## 6. Business rules

* Access token phải short-lived.
* Refresh token phải revoke được.
* Refresh token raw không lưu plain-text.
* Session revoked không reusable.
* Refresh token reuse phải detect được.
* Logout phải revoke session/token.
* Session expired không usable.
* Token rotation phải invalidate token cũ.
* Suspicious activity phải audit.

## 7. Token lifecycle strategy

### Access token

* short-lived (ví dụ 15-30 phút)
* stateless JWT
* signed securely

### Refresh token

* long-lived
* stored securely
* revocable
* rotation supported

### Rotation strategy

* refresh token cũ -> USED/REVOKED
* issue refresh token mới
* detect replay nếu token cũ reuse

## 8. Use cases

### 8.1 Create Session

Tạo session sau login.

### 8.2 Issue Refresh Token

Cấp refresh token.

### 8.3 Refresh Access Token

Refresh access token.

**Rules**

* verify refresh token.
* rotate refresh token nếu policy bật.
* revoke token cũ.

### 8.4 Revoke Session

Revoke session.

### 8.5 Logout Current Session

Logout current device.

### 8.6 Logout All Sessions

Logout mọi thiết bị.

### 8.7 Detect Token Replay

Phát hiện replay attack.

### 8.8 Get Active Sessions

Lấy active sessions của user.

### 8.9 Mark Suspicious Session

Đánh dấu session nghi ngờ.

## 9. API contract đề xuất

### 9.1 POST /sessions/create

Tạo session.

### 9.2 POST /sessions/refresh

Refresh token.

**Request**

```json
{
  "refreshToken": "refresh-token-value"
}
```

**Response**

```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 3600
}
```

### 9.3 POST /sessions/logout

Logout current session.

### 9.4 POST /sessions/logout-all

Logout all sessions.

### 9.5 GET /sessions/active

List active sessions.

### 9.6 DELETE /sessions/:id

Revoke specific session.

## 10. Input validation

* refresh token required.
* sessionId hợp lệ.
* device info sanitize.
* token format hợp lệ.
* session status transition hợp lệ.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* Session
* RefreshToken
* DeviceInfo
* SessionStatus
* TokenStatus
* DeviceFingerprint
* TokenHash

### Domain invariants

* Revoked session không active.
* Used refresh token không reusable.
* Token expired không usable.
* Session phải thuộc user hợp lệ.

## 12. Ports

### Inbound ports

* CreateSessionUseCase
* RefreshAccessTokenUseCase
* RevokeSessionUseCase
* LogoutAllSessionsUseCase
* DetectReplayUseCase
* GetActiveSessionsUseCase

### Outbound ports

* SessionRepository
* RefreshTokenRepository
* CachePort
* EventBusPort
* AuditLogPort
* SecurityMonitoringPort

## 13. Adapters

### Inbound adapters

* HTTP Controller
* Security middleware
* Token validation middleware

### Outbound adapters

* PostgreSQL repository adapter
* Redis cache adapter
* JWT provider adapter
* Security monitoring adapter
* Logging/audit adapter

## 14. Session management strategy

### Multi-device support

* nhiều active sessions cùng lúc.
* revoke từng session riêng.

### Session tracking

* IP address
* device info
* last activity
* suspicious changes

### Idle timeout

* auto-expire inactive sessions nếu policy yêu cầu.

## 15. Refresh token rotation strategy

### Mục tiêu

* giảm replay risk.
* revoke chain nếu compromise.

### Flow

1. client gửi refresh token cũ
2. verify token
3. issue token mới
4. mark token cũ USED
5. nếu token USED reuse -> suspicious activity

## 16. Replay attack detection strategy

### Detection cases

* reused refresh token
* impossible travel
* suspicious IP/device changes

### Actions

* revoke session chain
* notify user
* require re-login
* security audit

## 17. Session cache strategy

### Cache candidates

* active session lookup
* refresh token lookup
* revoked token blacklist

### Cache invalidation

* logout
* revoke
* expiration
* suspicious activity

### Cache key gợi ý

* session:{sessionId}
* refresh-token:{tokenId}
* revoked-token:{jti}

## 18. Device tracking strategy

### Device metadata

* browser
* OS
* IP
* geo location
* fingerprint hash

### Goals

* security visibility
* suspicious login detection
* session management UI

## 19. Audit strategy

### Audit events gợi ý

* session created
* token refreshed
* logout
* replay detected
* suspicious login
* revoke session

### Audit fields

* userId
* sessionId
* IP
* device info
* timestamp

## 20. Non-functional requirements

* Session lookup nhanh.
* Refresh flow ổn định.
* Token revoke reliable.
* Scale lớn.
* Security-first.
* Audit đầy đủ.

## 21. Security requirements

* Refresh token hash storage.
* Access token short-lived.
* Replay detection.
* Secure cookie nếu dùng cookie.
* HTTPS mandatory.
* Token signing key rotation support.
* Session fixation protection.

## 22. Acceptance criteria

### Create Session

* Session tạo thành công.
* Device info lưu đúng.
* Refresh token issue đúng.

### Refresh Token

* Token refresh hoạt động.
* Rotation đúng.
* Token cũ invalidated.

### Logout

* Session revoke đúng.
* Revoked token không reusable.

### Replay Detection

* Reused token bị detect.
* Security event được log.
* Session chain revoke nếu cần.

## 23. Test strategy

### Unit tests

* token rotation flow
* replay detection logic
* session revoke flow
* expiration handling
* suspicious session detection

### Integration tests

* JWT provider integration
* refresh flow integration
* cache invalidation flow
* logout all sessions flow

### Security tests

* replay attack attempt
* revoked token reuse
* token theft simulation
* session fixation attempt
* concurrent refresh requests

## 24. Suggested folder structure

```text
modules/
  session/
    domain/
      entities/
      value-objects/
      services/
      events/
      ports/
    application/
      use-cases/
      dtos/
      security/
    infrastructure/
      persistence/
      cache/
      jwt/
      monitoring/
    presentation/
      http/
      middleware/
      controllers/
    tests/
```

## 25. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: secure session management
* bounded context: Session & Refresh Token
* constraints kiến trúc: Hexagonal, security-first
* edge cases: replay attack, concurrent refresh, revoked token reuse, suspicious sessions
* output mong muốn: token lifecycle flow, rotation strategy, replay detection, test cases

## 26. Dependencies with other modules

### Auth

* login flow integration
* identity validation

### Audit

* security audit events

### Notification

* suspicious login alerts

## 27. Explicit anti-patterns

* Không lưu refresh token raw.
* Không để refresh token sống vô hạn.
* Không bỏ replay detection.
* Không trust client session metadata hoàn toàn.
* Không reuse revoked token.

## 28. Deliverables cho Session & Refresh Token Module

* Domain model
* Application use cases
* HTTP API contract
* Session strategy
* Refresh token rotation strategy
* Replay detection strategy
* Security strategy
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Security tests
* Audit requirements

## 29. Ghi chú triển khai

Phần database của Session & Refresh Token Module nên được tách thành file riêng sau khi chốt token lifecycle strategy, replay detection policy và cache architecture. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
