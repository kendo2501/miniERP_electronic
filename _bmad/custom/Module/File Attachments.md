# File Attachments Module — BMAD Spec

## 1. Mục tiêu module

File Attachments Module chịu trách nhiệm quản lý upload, lưu trữ, truy xuất và liên kết file đính kèm trong hệ thống Mini-ERP B2B.

Module này hỗ trợ:

* upload/download file
* metadata management
* attachment linking
* access control
* storage abstraction
* versioning strategy (optional)
* audit file access

File Attachments là shared infrastructure module phục vụ cho Sales, Finance, Inventory, Auth và các bounded context khác.

## 2. Phạm vi nghiệp vụ

### In-scope

* Upload file.
* Download file.
* Metadata management.
* File attachment linking.
* Access control.
* File validation.
* Virus scan integration hook.
* Storage abstraction.
* Signed URL strategy.
* File preview metadata.
* Attachment audit logging.
* File lifecycle management.

### Out-of-scope

* Real-time collaborative editing.
* Full document management system.
* OCR processing phức tạp.
* Video streaming platform.

## 3. Bối cảnh dự án

Hệ thống Mini-ERP B2B cần lưu trữ nhiều loại tài liệu:

* invoice PDF
* quotation PDF
* hợp đồng
* chứng từ thanh toán
* hình ảnh sản phẩm
* file import/export
* attachment cho order/customer

Module này cần tách biệt storage implementation khỏi business logic.

## 4. Mục tiêu thiết kế của File Attachments

* Tách abstraction khỏi physical storage.
* Hỗ trợ nhiều storage backend.
* Kiểm soát quyền truy cập file.
* Không block business transaction lớn.
* Theo dõi audit truy cập file.
* Hỗ trợ scale lớn.
* Dễ migrate storage.

## 5. Định nghĩa domain

### 5.1 Attachment

Attachment là aggregate root chính.

#### Thuộc tính cốt lõi

* id
* ownerType
* ownerId
* fileName
* originalFileName
* mimeType
* fileSize
* storagePath
* storageProvider
* checksum
* status
* uploadedBy
* visibility
* metadata
* uploadedAt
* deletedAt

#### Trạng thái gợi ý

* UPLOADING
* AVAILABLE
* FAILED
* DELETED
* ARCHIVED

### 5.2 AttachmentLink

AttachmentLink liên kết attachment với entity business.

#### Ví dụ

* Order -> quotation PDF
* Invoice -> invoice PDF
* Customer -> contract document

### 5.3 StorageProvider

#### Providers gợi ý

* LOCAL_STORAGE
* S3
* MINIO
* AZURE_BLOB
* GCS

## 6. Business rules

* File upload phải validate.
* File access phải kiểm tra quyền.
* File metadata phải được lưu.
* File delete thường là soft delete.
* File checksum phải verify nếu policy yêu cầu.
* Không cho phép upload file nguy hiểm.
* Download URL có thể expire.
* Audit truy cập file quan trọng.

## 7. Supported file types

### Ví dụ gợi ý

* PDF
* XLSX
* CSV
* PNG/JPG
* DOCX
* ZIP

### Validation rules

* whitelist mime types
* max file size
* scan malware nếu policy yêu cầu

## 8. Use cases

### 8.1 Upload File

Upload file attachment.

### 8.2 Download File

Download attachment.

### 8.3 Generate Signed URL

Sinh signed URL.

### 8.4 Delete Attachment

Soft delete attachment.

### 8.5 Link Attachment To Entity

Liên kết file với entity.

### 8.6 Get Attachments By Owner

Lấy attachment theo entity.

### 8.7 Validate File

Validate file trước upload.

### 8.8 Archive Attachment

Archive attachment cũ.

## 9. API contract đề xuất

### 9.1 POST /attachments/upload

Upload file.

### Multipart request

```http
POST /attachments/upload
Content-Type: multipart/form-data
```

### Response

```json
{
  "id": 1,
  "fileName": "invoice-0001.pdf",
  "mimeType": "application/pdf",
  "fileSize": 204800,
  "downloadUrl": "https://example.com/files/1"
}
```

### 9.2 GET /attachments/:id/download

Download file.

### 9.3 DELETE /attachments/:id

Delete attachment.

### 9.4 GET /attachments/owner/:ownerType/:ownerId

List attachments.

### 9.5 POST /attachments/:id/signed-url

Generate signed URL.

## 10. Input validation

* file required.
* mime type phải allow.
* file size trong limit.
* ownerType/ownerId hợp lệ.
* checksum đúng format nếu có.
* visibility hợp lệ.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* Attachment
* AttachmentLink
* FileMetadata
* FileChecksum
* StoragePath
* FileVisibility
* FileStatus
* StorageProvider

### Domain invariants

* File size > 0.
* Mime type hợp lệ.
* Storage path không rỗng.
* Attachment owner hợp lệ.

## 12. Ports

### Inbound ports

* UploadAttachmentUseCase
* DownloadAttachmentUseCase
* DeleteAttachmentUseCase
* GenerateSignedUrlUseCase
* LinkAttachmentUseCase
* GetAttachmentsUseCase

### Outbound ports

* AttachmentRepository
* StorageProviderPort
* VirusScanPort
* SignedUrlProviderPort
* EventBusPort
* AuditLogPort

## 13. Adapters

### Inbound adapters

* HTTP multipart upload controller
* Validation middleware

### Outbound adapters

* Local storage adapter
* S3/MinIO adapter
* Virus scan adapter
* PostgreSQL repository adapter
* CDN adapter
* Logging/audit adapter

## 14. Storage abstraction strategy

### Mục tiêu

* Không phụ thuộc trực tiếp vào storage cụ thể.
* Có thể migrate storage backend.

### Storage responsibilities

* upload stream
* download stream
* delete object
* generate signed URL
* metadata retrieval

## 15. Signed URL strategy

### Mục tiêu

* Không expose storage trực tiếp.
* URL có expiration.
* Hạn chế unauthorized access.

### Rules

* signed URL short-lived.
* verify permission trước generate.

## 16. Security strategy

### File validation

* mime type whitelist
* extension validation
* max size
* malware scan hook

### Access control

* role-based access
* owner-based access
* signed URL expiration

### Sensitive documents

* invoice
* contracts
* payment proof

Các file này cần stricter access policy.

## 17. Audit strategy

### Audit events gợi ý

* file uploaded
* file downloaded
* file deleted
* signed URL generated
* unauthorized access attempt

### Audit fields

* actorId
* fileId
* ownerType/ownerId
* ipAddress
* timestamp

## 18. File lifecycle strategy

### Lifecycle states

* upload
* active use
* archived
* deleted

### Cleanup goals

* giảm orphan files
* giảm storage waste
* retention policy rõ ràng

## 19. Versioning strategy (optional)

### Mục tiêu

* Lưu nhiều phiên bản tài liệu.

### Ví dụ

* quotation_v1.pdf
* quotation_v2.pdf

### Rules

* current version tracking
* audit version history

## 20. Cache/CDN strategy

### Cache candidates

* public/static attachments
* image thumbnails

### CDN goals

* tăng tốc download
* giảm tải app server

### Cache invalidation

* file update/delete
* visibility change

## 21. Reporting considerations

### Reports gợi ý

* storage usage
* upload/download statistics
* orphan attachments
* failed uploads
* malware scan failures

## 22. Non-functional requirements

* Upload/download ổn định.
* Hỗ trợ file lớn.
* Không block business transaction.
* Dễ scale storage.
* Audit đầy đủ.
* Hỗ trợ streaming.

## 23. Security requirements

* Không cho phép upload executable nguy hiểm.
* Access control nghiêm ngặt.
* Signed URL expiration.
* Malware scan integration.
* Không expose internal storage path.
* Validate mime type thực tế.

## 24. Acceptance criteria

### Upload File

* Upload thành công.
* Metadata lưu đúng.
* File accessible theo policy.

### Download File

* Download đúng file.
* Permission enforced.
* Signed URL hoạt động.

### Delete Attachment

* Soft delete hoạt động.
* File không còn accessible.
* Audit log được ghi.

### Validation

* Reject file invalid.
* Reject oversized file.
* Reject unsupported mime type.

## 25. Test strategy

### Unit tests

* upload validation
* checksum verification
* signed URL generation
* storage abstraction flow
* access control checks

### Integration tests

* multipart upload flow
* storage provider integration
* download streaming
* malware scan integration

### Security tests

* malicious file upload
* unauthorized download
* expired signed URL
* path traversal attempt
* mime spoofing

## 26. Suggested folder structure

```text
modules/
  attachments/
    domain/
      entities/
      value-objects/
      services/
      events/
      ports/
    application/
      use-cases/
      dtos/
      validators/
    infrastructure/
      persistence/
      storage/
      cdn/
      virus-scan/
    presentation/
      http/
      middleware/
      controllers/
    tests/
```

## 27. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: attachment management
* bounded context: File Attachments
* constraints kiến trúc: Hexagonal, storage abstraction
* edge cases: malicious upload, signed URL expiry, orphan files, storage failure
* output mong muốn: use case, upload flow, storage abstraction, security flow, test cases

## 28. Dependencies with other modules

### Sales

* quotation/order attachments

### Finance

* invoice/payment documents

### Auth

* permission/access control

### Audit

* file access logs

## 29. Explicit anti-patterns

* Không hardcode storage provider.
* Không expose raw storage path.
* Không trust mime type từ client.
* Không lưu file binary trực tiếp trong DB nếu không cần.
* Không bỏ access control cho signed URLs.

## 30. Deliverables cho File Attachments Module

* Domain model
* Application use cases
* HTTP API contract
* Storage abstraction strategy
* Security strategy
* Signed URL strategy
* File lifecycle strategy
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Security tests
* Audit requirements

## 31. Ghi chú triển khai

Phần database của File Attachments Module nên được tách thành file riêng sau khi chốt storage strategy, retention policy và attachment linking model. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
