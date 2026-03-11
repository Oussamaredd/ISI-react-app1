# Code Annotation Conventions

EcoTrack uses TypeScript-first code annotation rules. The goal is not to comment every function. The goal is to make exported behavior, cross-layer contracts, and non-obvious logic fast to understand without reading the full implementation.

## Scope

Prefer TSDoc for TypeScript files. Use JSDoc only for JavaScript files that are part of the maintained command or tooling surface.

Add annotations when a symbol is:

- exported from a shared module
- used across layer boundaries
- part of a public API, utility, hook, provider, or configuration contract
- implementing non-obvious business or runtime behavior
- likely to be reused outside its current file

Do not add block comments to trivial locals, obvious JSX handlers, or one-line wrappers whose name already explains the behavior.

## Required Shape

For exported functions and methods, default to:

```ts
/**
 * Short summary sentence.
 *
 * @param input - What the caller provides.
 * @returns What the caller gets back.
 */
```

Add tags only when they add real information:

- `@param` for inputs that are not fully obvious from the type alone
- `@returns` when the output shape or meaning is not obvious
- `@throws` when the function intentionally throws in normal control flow
- `@remarks` for important runtime behavior, fallbacks, or constraints
- `@example` only when usage is not obvious from nearby call sites
- `@deprecated` when a public symbol is still supported but scheduled for removal

## Style Rules

- Keep the first sentence short and factual.
- Describe behavior, contracts, and side effects, not line-by-line implementation.
- Prefer repository language already used in docs and APIs.
- Keep comments stable under refactors; avoid duplicating exact variable names unless needed.
- Update annotations in the same change set as behavior changes.

## Priority Targets

When choosing where to annotate first, prioritize:

1. shared helpers and configuration utilities
2. exported hooks and providers
3. controller/service/repository boundary methods with domain rules
4. public DTO helpers or serialization helpers
5. build and runtime scripts that contributors invoke directly

## Repository Examples

Representative examples are maintained in:

- `api/src/common/request-id.ts`
- `app/src/lib/registerMapServiceWorker.ts`
- `mobile/src/lib/env.ts`

Use those files as the baseline style for future comments.

## Review Rule

During review, ask:

- Would a new contributor understand why this exported symbol exists?
- Does the comment explain behavior that is not obvious from types alone?
- Is the annotation short enough to stay accurate after a refactor?

If the answer to the second question is no, skip the comment.
