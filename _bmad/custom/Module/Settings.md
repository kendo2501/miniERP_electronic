# Settings Module — BMAD Spec

## 1. Mục tiêu module

Settings Module chịu trách nhiệm quản lý cấu hình hệ thống, cấu hình nghiệp vụ và các thiết lập tùy biến cho hệ thống Mini-ERP B2B.

Module này cung cấp:

* system configuration
* business configuration
* feature toggles
* organization settings
* user preferences
* runtime configuration lookup
* configuration versioning
* audit configuration changes

Settings Module là shared foundational module phục vụ toàn bộ bounded context khác.

## 2. Phạm vi nghiệp vụ

### In-scope

* System settings.
* Business settings.
* Organization settings.
* User preferences.
* Feature flags/toggles.
* Runtime configuration lookup.
* Dynamic configuration.
* Configuration validation.
* Configuration versioning.
* Audit configuration changes.
* Environment-aware settings.
* Default/fallback settings.

### Out-of-scope

* Infrastructure secrets manager.
* CI/CD deployment configs.
* Kubernetes/server configs.
* Low-level OS configuration.

## 3. Bối cảnh dự án

Hệ thống Mini-ERP B2B cần nhiều loại cấu hình:

* credit limit policy
* inventory low-stock threshold
* notification settings
* payment terms
* invoice numbering rules
* session timeout
* feature enable/disable
* organization branding

Các cấu hình cần thay đổi linh hoạt mà không phải redeploy hệ thống.

## 4. Mục tiêu thiết kế của Settings

* Dynamic runtime configuration.
* Không hardcode business rules.
* Hỗ trợ multi-tenant/organization.
* Validation chặt chẽ.
* Cache hiệu quả.
* Audit mọi thay đổi.
* Hỗ trợ fallback/default.

## 5. Định nghĩa domain

### 5.1 Setting

Setting là aggregate root chính.

#### Thuộc tính cốt lõi

* id
* category
* key
* value
* valueType
* scope
* organizationId
* environment
* description
* isSensitive
* isReadonly
* version
* updatedBy
* updatedAt
* createdAt

### 5.2 SettingCategory

#### Ví dụ categories

* AUTH
* SALES
* INVENTORY
* FINANCE
* NOTIFICATION
* SYSTEM
* UI

### 5.3 SettingScope

#### Ví dụ scope

* GLOBAL
* ORGANIZATION
* USER
* ENVIRONMENT

### 5.4 FeatureFlag

FeatureFlag quản lý bật/tắt feature.

#### Thuộc tính gợi ý

* code
* enabled
* rolloutPercentage
* targetAudience

### 5.5 UserPreference

Preference riêng của user.

#### Ví dụ

* theme
* language
* dashboard layout
* timezone

## 6. Business rules

* Setting key phải unique trong scope.
* Sensitive settings phải được bảo vệ.
* Readonly settings không sửa runtime.
* Value phải validate đúng type/schema.
* Feature flags phải fallback an toàn.
* Configuration change phải audit.
* Runtime lookup phải hiệu quả.

## 7. Supported setting types

### Value types gợi ý

* STRING
* NUMBER
* BOOLEAN
* JSON
* ARRAY
* ENUM

### Ví dụ settings

* auth.session_timeout_minutes
* finance.default_credit_limit
* inventory.low_stock_threshold
* notification.email_enabled
* ui.default_theme

## 8. Use cases

### 8.1 Create Setting

Tạo setting.

### 8.2 Update Setting

Cập nhật setting.

### 8.3 Get Setting

Lấy setting.

### 8.4 Get Effective Setting

Resolve setting theo scope/fallback.

### 8.5 Delete Setting

Delete setting.

### 8.6 Enable Feature Flag

Enable feature.

### 8.7 Disable Feature Flag

Disable feature.

### 8.8 Update User Preference

Cập nhật user preference.

### 8.9 Reload Runtime Configuration

Reload cache/config runtime.

## 9. API contract đề xuất

### 9.1 POST /settings

Tạo setting.

**Request**

```json
{
  "category": "FINANCE",
  "key": "default_credit_limit",
  "value": 100000000,
  "valueType": "NUMBER",
  "scope": "GLOBAL"
}
```

### 9.2 PUT /settings/:id

Update setting.

### 9.3 GET /settings/:key

Get setting.

### 9.4 GET /settings/effective/:key

Resolve effective setting.

### 9.5 POST /feature-flags/:code/enable

Enable feature.

### 9.6 POST /feature-flags/:code/disable

Disable feature.

### 9.7 PUT /user-preferences

Update preferences.

## 10. Input validation

* key required.
* key format normalized.
* value đúng type/schema.
* category valid.
* scope valid.
* sensitive setting restricted.
* feature flag code unique.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* Setting
* SettingCategory
* SettingScope
* FeatureFlag
* UserPreference
* SettingValue
* SettingVersion

### Domain invariants

* Key unique trong scope.
* Value đúng type.
* Readonly setting immutable runtime.
* Sensitive settings protected.

## 12. Ports

### Inbound ports

* CreateSettingUseCase
* UpdateSettingUseCase
* GetSettingUseCase
* ResolveSettingUseCase
* ToggleFeatureFlagUseCase
* UpdateUserPreferenceUseCase

### Outbound ports

* SettingsRepository
* FeatureFlagRepository
* UserPreferenceRepository
* CachePort
* EventBusPort
* AuditLogPort

## 13. Adapters

### Inbound adapters

* HTTP Controller
* Runtime config adapter
* Validation middleware

### Outbound adapters

* PostgreSQL repository adapter
* Redis cache adapter
* Event bus adapter
* Logging/audit adapter

## 14. Configuration resolution strategy

### Priority gợi ý

1. User scope
2. Organization scope
3. Environment scope
4. Global scope
5. Default value

### Goals

* Flexible override.
* Predictable fallback.
* Fast lookup.

## 15. Feature flag strategy

### Feature rollout

* enable/disable runtime
* gradual rollout
* target groups

### Ví dụ

* beta reporting
* new pricing engine
* inventory reservation v2

### Rules

* fallback safe.
* disabled feature không crash system.

## 16. Runtime cache strategy

### Cache candidates

* frequently used settings
* feature flags
* organization configs

### Cache invalidation

* setting updated
* feature flag changed
* runtime reload

### Cache key gợi ý

* settings:{scope}:{key}
* feature-flag:{code}
* user-preferences:{userId}

## 17. Sensitive settings strategy

### Ví dụ settings nhạy cảm

* SMTP credentials
* API secrets
* JWT configs

### Rules

* encrypted at rest nếu cần.
* restricted access.
* masked in logs/API.

## 18. Versioning strategy

### Goals

* track config history.
* rollback configuration.
* audit changes.

### Version fields

* version number
* changedBy
* changedAt
* previousValue

## 19. Audit strategy

### Audit events gợi ý

* setting created
* setting updated
* feature enabled
* feature disabled
* preference changed

### Audit fields

* actorId
* key
* oldValue
* newValue
* timestamp

## 20. Reporting considerations

### Reports gợi ý

* configuration changes
* feature flag usage
* organization customization
* settings override statistics

## 21. Non-functional requirements

* Runtime lookup nhanh.
* Cache hiệu quả.
* Dynamic configuration.
* Không cần redeploy cho business config.
* Audit đầy đủ.
* Scale tốt.

## 22. Security requirements

* Chỉ admin/config-manager được sửa settings.
* Sensitive settings protected.
* Mask secret values.
* Audit config changes.
* Validate config chặt chẽ.

## 23. Acceptance criteria

### Create Setting

* Setting tạo đúng.
* Validation hoạt động.
* Cache refresh đúng.

### Resolve Setting

* Fallback chain đúng.
* Runtime lookup nhanh.
* Scope resolution chính xác.

### Feature Flags

* Enable/disable runtime hoạt động.
* Feature fallback safe.

### User Preferences

* Preference lưu đúng.
* User chỉ sửa preference của mình.

## 24. Test strategy

### Unit tests

* setting validation
* scope resolution logic
* feature flag toggle flow
* runtime cache flow
* fallback resolution

### Integration tests

* repository integration
* cache invalidation flow
* runtime config reload
* audit integration

### Security tests

* unauthorized config change
* sensitive value exposure
* invalid config injection
* feature flag abuse

## 25. Suggested folder structure

```text
modules/
  settings/
    domain/
      entities/
      value-objects/
      services/
      events/
      ports/
    application/
      use-cases/
      dtos/
      resolvers/
    infrastructure/
      persistence/
      cache/
      runtime/
    presentation/
      http/
      middleware/
      validators/
      controllers/
    tests/
```

## 26. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: dynamic configuration management
* bounded context: Settings
* constraints kiến trúc: Hexagonal, runtime-configurable
* edge cases: fallback resolution, invalid config, sensitive settings, cache invalidation
* output mong muốn: config resolution flow, feature flag strategy, validation flow, test cases

## 27. Dependencies with other modules

### Auth

* auth/security configs

### Sales

* pricing/order configs

### Inventory

* stock threshold configs

### Finance

* credit/payment configs

### Notification

* notification configs

### Audit

* config change audit

## 28. Explicit anti-patterns

* Không hardcode business config.
* Không expose sensitive settings raw.
* Không bỏ validation config.
* Không để cache stale lâu.
* Không bypass audit cho config changes.

## 29. Deliverables cho Settings Module

* Domain model
* Application use cases
* HTTP API contract
* Configuration resolution strategy
* Feature flag strategy
* Runtime cache strategy
* Validation rules
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Security tests
* Audit requirements

## 30. Ghi chú triển khai

Phần database của Settings Module nên được tách thành file riêng sau khi chốt scope resolution strategy, feature flag architecture và sensitive config policy. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
