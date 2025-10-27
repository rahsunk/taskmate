# concept_server.ts Changes Documentation

**Date:** 2025-10-27
**Modified File:** `src/concept_server.ts`
**Original Version:** `backups/concept_server/concept_server_original.ts`

## Summary

Updated the concept server to properly differentiate between GET and POST HTTP methods based on the naming convention for concept methods.

## Problem

The original implementation registered **all** concept methods as POST endpoints, regardless of whether they were actions or queries. This violated the established convention where:
- Query methods (starting with `_`) should be GET requests
- Action methods (no `_` prefix) should be POST requests

This convention is documented in `design/background/implementing-concepts.md`:
> All methods are either actions or queries from the spec: query methods are named beginning with a `_` character.

## Solution

Modified the route registration logic in `src/concept_server.ts` (lines 72-107) to:

1. **Detect query methods** by checking if method name starts with `_`
2. **Register GET endpoints** for query methods (methods with `_` prefix)
3. **Register POST endpoints** for action methods (methods without `_` prefix)
4. **Handle parameters differently**:
   - GET requests: read parameters from query string using `c.req.query()`
   - POST requests: read parameters from request body using `c.req.json()`

## Code Changes

### Before (Lines 72-87)

```typescript
for (const methodName of methodNames) {
  const actionName = methodName;
  const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

  app.post(route, async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})); // Handle empty body
      const result = await instance[methodName](body);
      return c.json(result);
    } catch (e) {
      console.error(`Error in ${conceptName}.${methodName}:`, e);
      return c.json({ error: "An internal server error occurred." }, 500);
    }
  });
  console.log(`  - Endpoint: POST ${route}`);
}
```

### After (Lines 72-107)

```typescript
for (const methodName of methodNames) {
  const actionName = methodName;
  const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

  // Query methods (starting with _) are GET requests, actions are POST
  const isQuery = methodName.startsWith("_");

  if (isQuery) {
    // GET endpoint for query methods
    app.get(route, async (c) => {
      try {
        // For GET requests, read parameters from query string
        const params = Object.fromEntries(c.req.query());
        const result = await instance[methodName](params);
        return c.json(result);
      } catch (e) {
        console.error(`Error in ${conceptName}.${methodName}:`, e);
        return c.json({ error: "An internal server error occurred." }, 500);
      }
    });
    console.log(`  - Endpoint: GET ${route}`);
  } else {
    // POST endpoint for action methods
    app.post(route, async (c) => {
      try {
        const body = await c.req.json().catch(() => ({})); // Handle empty body
        const result = await instance[methodName](body);
        return c.json(result);
      } catch (e) {
        console.error(`Error in ${conceptName}.${methodName}:`, e);
        return c.json({ error: "An internal server error occurred." }, 500);
      }
    });
    console.log(`  - Endpoint: POST ${route}`);
  }
}
```

## Impact

### UserAuthentication Concept Example

With the UserAuthenticationConcept implementation, the endpoints are now correctly registered as:

**POST Endpoints (Actions):**
- `POST /api/UserAuthentication/register`
- `POST /api/UserAuthentication/authenticate`
- `POST /api/UserAuthentication/changePassword`
- `POST /api/UserAuthentication/deleteAccount`

**GET Endpoints (Queries):**
- `GET /api/UserAuthentication/_getUserByUsername?username=<value>`
- `GET /api/UserAuthentication/_checkUserExists?user=<id>`
- `GET /api/UserAuthentication/_getAllUsers`
- `GET /api/UserAuthentication/_getUserById?user=<id>`

## Usage Examples

### POST Request (Action)
```bash
curl -X POST http://localhost:8000/api/UserAuthentication/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secret123"}'
```

### GET Request (Query)
```bash
curl -X GET "http://localhost:8000/api/UserAuthentication/_getUserByUsername?username=alice"
```

## Benefits

1. **RESTful Compliance:** Aligns with HTTP semantics where GET is for queries and POST is for actions
2. **Convention Adherence:** Implements the documented convention from `implementing-concepts.md`
3. **Better Semantics:** Queries can be bookmarked, cached, and don't have side effects
4. **API Clarity:** Clear distinction between read operations (GET) and write operations (POST)

## Testing

After making these changes, run:
```bash
deno task concepts
```

The server output should now show the correct HTTP methods for each endpoint:
- Actions without `_` prefix: `POST`
- Queries with `_` prefix: `GET`

## Related Files

- `src/concepts/UserAuthentication/UserAuthenticationConcept.ts` - Implements methods with proper naming convention
- `design/background/implementing-concepts.md` - Documents the convention
- `design/tools/apiGeneration/UserAuthenticationAPISpec.md` - API specification with correct HTTP methods

## Switching Between Versions

### To use the original POST-only version:
```bash
cp backups/concept_server/concept_server_original.ts src/concept_server.ts
```

### To use the modified GET/POST version:
```bash
cp backups/concept_server/concept_server_modified.ts src/concept_server.ts
```

## Available Backup Files

- **concept_server_original.ts** - Original version (POST-only for all methods)
- **concept_server_modified.ts** - Modified version (GET for queries, POST for actions)
