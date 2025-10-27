# Concept Server Backup

**Created:** 2025-10-27
**Purpose:** Backup of both versions of concept_server.ts (original POST-only and modified GET/POST)

## Files

- `concept_server_original.ts` - Original version with POST-only endpoints
- `concept_server_modified.ts` - Modified version with GET/POST differentiation
- `CHANGES.md` - Detailed documentation of changes made
- `README.md` - This file

## Available Versions

### 1. Original Version (POST-only)
**File:** `concept_server_original.ts`

All concept methods are registered as POST endpoints regardless of naming convention.

**Use this if you want:**
- Simpler implementation with all methods as POST
- Consistency with older API clients expecting POST
- To avoid query string parameter handling

### 2. Modified Version (GET/POST)
**File:** `concept_server_modified.ts`

Methods are differentiated by naming convention:
- Methods starting with `_` → GET endpoints (queries)
- Methods without `_` → POST endpoints (actions)

**Use this if you want:**
- RESTful HTTP semantics (GET for queries, POST for actions)
- Adherence to the documented convention
- Proper separation of read vs write operations

## Switching Between Versions

### Use Original (POST-only):
```bash
cp backups/concept_server/concept_server_original.ts src/concept_server.ts
```

### Use Modified (GET/POST):
```bash
cp backups/concept_server/concept_server_modified.ts src/concept_server.ts
```

## Key Differences

| Feature | Original | Modified |
|---------|----------|----------|
| All methods | POST | POST or GET |
| Query methods (`_` prefix) | POST | GET |
| Action methods (no `_`) | POST | POST |
| Parameters source | Request body | Query string (GET) or body (POST) |
| RESTful compliance | Partial | Full |

## Example Endpoints

### UserAuthentication Concept

**Original Version:**
- `POST /api/UserAuthentication/register`
- `POST /api/UserAuthentication/authenticate`
- `POST /api/UserAuthentication/_getUserByUsername` ← POST for query
- `POST /api/UserAuthentication/_getAllUsers` ← POST for query

**Modified Version:**
- `POST /api/UserAuthentication/register`
- `POST /api/UserAuthentication/authenticate`
- `GET /api/UserAuthentication/_getUserByUsername?username=alice` ← GET for query
- `GET /api/UserAuthentication/_getAllUsers` ← GET for query

## See Also

- [CHANGES.md](./CHANGES.md) - Full documentation of changes
- [src/concept_server.ts](../../src/concept_server.ts) - Current active version
- [design/background/implementing-concepts.md](../../design/background/implementing-concepts.md) - Convention documentation
