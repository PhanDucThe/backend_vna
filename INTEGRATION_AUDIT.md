# Frontend / Backend Integration Audit

Scope:

- Frontend: `D:\coding\fe_vna\VNA_FE\libs\tts\services\api.ts`
- Backend: `D:\coding\vna_backend\backend_vna`
- API prefix: `/api/v1`
- Frontend development origin: `http://localhost:5555`
- Backend development URL: `http://localhost:3000/api/v1`

All JSON responses use:

```ts
{
  success: boolean;
  statusCode: number;
  message: string | string[];
  data: unknown | null;
  timestamp: string;
  path: string;
}
```

## Request contract matrix

`Bearer` means `Authorization: Bearer <accessToken>`. JSON is selected
automatically by the frontend request helper unless the body is `FormData`.

| Frontend function | Method and endpoint | Auth | Content type | Backend request contract | Response data contract |
|---|---|---|---|---|---|
| `login` | `POST /auth/login` | Public | JSON | `LoginDto` | `LoginResponseDto` |
| `getProfile` | `GET /users/me` | Bearer | JSON | Path/JWT user | `UserDetailResponseDto` with API role aliases |
| `updateMe` | `PATCH /users/:id` | Bearer, self or admin | Multipart | `UpdateUserDto`; self-safe fields only | `UserDetailResponseDto` |
| `changePassword` | `PATCH /auth/change-password` | Bearer | JSON | `ChangePasswordDto` | `null` |
| `requestForgotPassword` | `POST /auth/forgot-password/request` | Public | JSON | `ForgotPasswordDto` | OTP delivery metadata |
| `verifyForgotPasswordOtp` | `POST /auth/forgot-password/verify` | Public | JSON | `VerifyForgotPasswordOtpDto` | `null` |
| `resetPassword` | `POST /auth/forgot-password/reset` | Public | JSON | `ResetPasswordDto` | `null` |
| `sendChangeGmailOtp` | `POST /auth/change-gmail/send-otp?newEmail=...` | Bearer | JSON | `SendChangeEmailOtpQueryDto` | OTP delivery metadata |
| `verifyChangeGmailOtp` | `POST /auth/change-gmail/verify-otp` | Bearer | JSON | `VerifyChangeGmailOtpDto` | `null` |
| `updateChangeGmail` | `POST /auth/change-gmail/update` | Bearer | JSON | `UpdateChangeGmailDto` | `BackendUser` |
| `getUsers` | `GET /users?...` | Bearer + Role1/Role3 + permission | JSON | `ListUsersQueryDto` | `UserListResponseDto` |
| `createUser` | `POST /users` | Bearer + Role1/Role3 + permission | Multipart | `CreateUserDto` | `UserDetailResponseDto` |
| `getUserDetail` | `GET /users/:id` | Bearer + Role1/Role3 + permission | JSON | Positive integer path id | `UserDetailResponseDto` |
| `updateUserAdmin` | `PATCH /users/:id` | Bearer + self-or-admin | Multipart | `UpdateUserDto` | `UserDetailResponseDto` |
| `deleteUser` | `DELETE /users/:id` | Bearer + Role1/Role3 + permission | JSON | Positive integer path id | `{ id }` |
| `getBusinesses` | `GET /businesses?...` | Bearer + Role1/Role3 | JSON | `ListBusinessesQueryDto` | `BusinessListResponseDto` |
| `getBusinessDetail` | `GET /businesses/:id` | Bearer + Role1/Role3 | JSON | Positive integer path id | `BusinessResponseDto` |
| `createBusiness` | `POST /businesses` | Bearer + Role1/Role3 | Multipart | `CreateBusinessDto`, attachments | `CreatedBusinessResponseDto` |
| `updateBusiness` | `PATCH /businesses/:id` | Bearer + Role1/Role3 | Multipart | `UpdateBusinessDto`, attachments | `BusinessResponseDto` |
| `updateBusinessStatus` | `PATCH /businesses/:id/status` | Bearer + Role1/Role3 | JSON | `{ isActive }` | `BusinessResponseDto` |
| `deleteBusiness` | `DELETE /businesses/:id` | Bearer + Role1/Role3 | JSON | Positive integer path id | `{ id }` |
| `deleteBusinessAttachment` | `DELETE /businesses/:id/attachments/:attachmentId` | Bearer; admin or owning Role2 | JSON | Two positive integer path ids | `{ id }` |
| `sendRegistrationOtp` | `POST /businesses/register/send-otp` | Public | JSON | `SendBusinessRegistrationOtpDto` | Email/tax code/expiry metadata |
| `verifyRegistrationOtp` | `POST /businesses/register/verify-otp` | Public | JSON | `VerifyBusinessRegistrationOtpDto` | `{ email, verified }` |
| `confirmRegistration` | `POST /businesses/register/confirm` | Public | Multipart | `RegisterBusinessDto`, attachments | `CreatedBusinessResponseDto` |
| `getMyBusinessProfile` | `GET /businesses/me` | Bearer + Role2 | JSON | JWT user | `BusinessResponseDto` |
| `sendBusinessProfileEmailOtp` | `POST /businesses/me/email/send-otp?newEmail=...` | Bearer + Role2 | JSON | `SendChangeEmailOtpQueryDto` | OTP delivery metadata |
| `verifyBusinessProfileEmailOtp` | `POST /businesses/me/email/verify-otp` | Bearer + Role2 | JSON | `VerifyBusinessProfileEmailOtpDto` | `{ email, verified }` |
| `updateMyBusinessProfile` | `PATCH /businesses/me` | Bearer + Role2 | Multipart | `UpdateBusinessProfileDto`, attachments | `BusinessResponseDto` |
| `getDepartmentReports` | `GET /labor-accident-reports/admin?...` | Bearer + Role1/Role3 | JSON | `ListLaborAccidentReportsQueryDto` | Report list with `items/meta` |
| `getDepartmentReportDetail` | `GET /labor-accident-reports/admin/:id` | Bearer + Role1/Role3 | JSON | Positive integer path id | Report detail |
| `receiveDepartmentReport` | `POST /labor-accident-reports/admin/:id/receive` | Bearer + Role1/Role3 | JSON | Positive integer path id | Report detail |
| `bulkReceiveDepartmentReports` | `POST /labor-accident-reports/admin/bulk-receive` | Bearer + Role1/Role3 | JSON | `BulkReceiveLaborAccidentReportsDto` | Operation result |
| `bulkRejectDepartmentReports` | `POST /labor-accident-reports/admin/bulk-reject` | Bearer + Role1/Role3 | JSON | `BulkRejectLaborAccidentReportsDto` | Operation result |
| `getMyLaborAccidentReports` | `GET /labor-accident-reports/my?...` | Bearer + Role2 | JSON | `ListMyLaborAccidentReportsQueryDto` | Report list with `items/meta` |
| `getMyLaborAccidentReportDetail` | `GET /labor-accident-reports/my/:id` | Bearer + Role2, owning business | JSON | Positive integer path id | Report detail |
| `saveLaborAccidentReportDraft` | `POST /labor-accident-reports/my/draft` | Bearer + Role2 | Multipart | `SaveLaborAccidentReportDraftDto`, details JSON, attachments | Report detail |
| `submitLaborAccidentReport` | `POST /labor-accident-reports/my/:id/submit` | Bearer + Role2, owning business | Multipart | `SubmitLaborAccidentReportDto`, attachments | Report detail |
| `getCatalogOptions` | `GET /labor-accident-catalogs/options?type=...` | Bearer + Role1/Role2/Role3 | JSON | `LaborAccidentCatalogOptionsQueryDto` | Catalog option array |
| `getReportPeriods` | `GET /labor-accident-report-periods?...` | Bearer + Role1/Role2/Role3 | JSON | `ListLaborAccidentReportPeriodsQueryDto` | Period list with `items/meta` |
| `createReportPeriod` | `POST /labor-accident-report-periods` | Bearer + Role1/Role3 | JSON | `CreateLaborAccidentReportPeriodDto` | Period detail |
| `updateReportPeriod` | `PATCH /labor-accident-report-periods/:id` | Bearer + Role1/Role3 | JSON | `UpdateLaborAccidentReportPeriodDto` | Period detail |
| `updateReportPeriodStatus` | `PATCH /labor-accident-report-periods/:id/status` | Bearer + Role1/Role3 | JSON | `UpdateLaborAccidentReportPeriodStatusDto` | Period detail |

## Frontend-local helpers

The following exported frontend functions do not send HTTP requests:

- `getBusinessOptions`
- `getIndustries`
- `getRegistrationOptions`

They return static frontend data. Corresponding backend option routes exist for
business and registration options, but are not currently called by
`libs/tts/services/api.ts`.

## Backend-only endpoints relevant to integration

- `POST /auth/refresh`
- `POST /auth/logout`

The frontend stores a refresh token but does not yet call these endpoints or
retry a failed request after HTTP 401.

## Environment contract

Frontend:

```env
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_API_URL=http://localhost:3000/api/v1
```

Backend must configure PostgreSQL, JWT access/refresh secrets and durations,
Cloudinary, mail/OTP settings, and:

```env
APP_PORT=3000
OTP_EXPIRE_MINUTES=5
OTP_MAX_ATTEMPTS=5
```
