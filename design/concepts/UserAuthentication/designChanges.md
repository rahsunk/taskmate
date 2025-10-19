## Spec changes:
- Removed `verify` action, as it felt like a redundant check
- Added `changePassword` and `deleteAccount` actions for the sake of completeness

## Frequent issues:
- Initial LLM-generated tests enforce a strict type check for the actions, forcing them to include an error attribute, which made the tests unable to compile. I asked the LLM to loosen this restraint.