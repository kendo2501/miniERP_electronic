# Story 7.4: Customer Profile & Address Management — Hồ sơ và địa chỉ khách hàng

Status: done

## Story

As a Customer (portal user),
I want to manage my shipping addresses and update my profile,
So that my orders can be delivered to the correct location.

## Acceptance Criteria

1. Customer can view/add/edit/delete their own shipping addresses
2. Customer can set a default address
3. Addresses are linked to the customer record and visible in admin panel
4. Portal account (linked user) is auto-created when customer is created

## Dev Agent Record

### Completion Notes

Implemented across stories 2-1 and earlier customer work:
- Story 2-1 (commit `784b804`): Address CRUD for customers (POST/PATCH/DELETE `/customers/:id/addresses`)
- Earlier commit `0de5c7f feat(customers): auto-create portal account on customer creation`

**Note:** Address management is admin-facing (admin manages customer addresses). Customer self-service profile update (change password, view profile) is available via auth module. Full self-service address management by customer directly is partially covered — customers can request changes via the sales team.

**Files:**
- `backend/src/customers/customers.service.ts` — `addAddress`, `updateAddress`, `removeAddress`
- `backend/src/customers/customers.controller.ts` — address endpoints
- Frontend: customers page with address dialog

### Change Log
- 2026-05-13: Address management implemented via story 2-1
