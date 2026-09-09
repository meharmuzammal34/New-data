# Security Specification: Editorial Review Articles & Admin Access

## 1. Data Invariants
- `reviewArticles` is strictly dedicated to published and draft editorial articles, completely decoupled from the product catalog.
- Only authenticated and email-verified administrators (`meharmuzammal42@gmail.com` or listed in `/admins/{adminId}`) may create, update, or delete review articles.
- Public anonymous users can ONLY read published articles (`resource.data.published == true`). Unpublished drafts are hidden from non-admin readers.
- All article fields must adhere to strict type, size, and schema boundaries.
- Document IDs must match the valid identifier pattern `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Anonymous user attempting `create` on `/reviewArticles/hack-test`.
2. **Unauthenticated Draft Read**: Anonymous user attempting `get` on an unpublished draft (`published == false`).
3. **Spoofed Admin Email**: Non-verified user setting `email: "meharmuzammal42@gmail.com"` with `email_verified: false`.
4. **Non-Admin Signed-In Write**: Valid authenticated user with email `random_reader@example.com` attempting `create` or `delete`.
5. **ID Poisoning**: Writing to an excessively long ID or invalid characters (e.g. `../` or 500-character string).
6. **Oversized Content Injection**: Attempting to inject > 50,000 characters into the `content` field.
7. **Missing Required Fields**: Attempting to create an article missing `slug` or `title`.
8. **Invalid Rating Type**: Sending `rating: "five_stars"` (string instead of numeric) or rating > 5.0.
9. **Admin Self-Escalation**: Normal user attempting to write a document into `/admins/{userId}`.
10. **Shadow Fields Attack**: Attempting to insert arbitrary executable scripts or unsupported properties outside the schema.
11. **Malicious Delete**: Non-admin attempting to delete an existing published review article.
12. **Draft List Leak**: Non-admin running a collection query expecting draft documents to be returned.

## 3. Test Runner Design
Any test against these payloads asserts that Firebase Firestore security rules reject the operations with `PERMISSION_DENIED`.
