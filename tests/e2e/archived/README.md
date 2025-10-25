# Archived E2E Tests

## Purpose

This directory contains E2E tests that have been **archived** (not deleted) as part of the Test Pyramid conversion strategy. These tests have been replaced by faster, more reliable unit and integration tests.

---

## Why Archive Instead of Delete?

1. **Historical Reference**: Maintain test scenarios for future reference
2. **Rollback Safety**: Can be resurrected if needed
3. **Knowledge Preservation**: Document what was tested before conversion
4. **Audit Trail**: Track conversion decisions and progress

---

## What Replaced These Tests?

| Test Type | Original Location | Replacement | Speed Improvement |
|-----------|------------------|-------------|------------------|
| **Pure Logic** | E2E tests | Unit tests in `tests/unit/` | 100x faster |
| **Component Behavior** | E2E tests | Integration tests in `tests/integration/` | 20x faster |
| **Critical Paths** | E2E tests | Streamlined E2E in `tests/e2e/critical-paths.spec.ts` | Focused coverage |

---

## Archive Categories

### Week 1: Unit Test Conversions (Pure Logic)
**Archived Tests**: Logic that was embedded in E2E flows  
**Replaced By**: Unit tests for calculations, validations, utilities  
**Location**: `tests/e2e/archived/week1-unit-conversions/`

**Note**: Week 1 archived very few E2E tests because unit tests extract *logic* from within components, not entire test files. Most E2E tests are user flows that remain until Week 2+ integration tests replace them.

### Week 2-4: Integration Test Conversions (Component Behavior)
**Archived Tests**: Component rendering, interactions, state management  
**Replaced By**: Integration tests with MSW mocked APIs  
**Location**: `tests/e2e/archived/week2-4-integration-conversions/`

**Expected Impact**: This phase will archive the most E2E tests (150-200 tests) as integration tests replace entire E2E test files.

### Week 5: Remaining E2E Tests
**Archived Tests**: E2E tests not critical enough for ongoing maintenance  
**Replaced By**: 18 comprehensive critical path E2E tests  
**Location**: `tests/e2e/archived/week5-non-critical/`

---

## How to Resurrect an Archived Test

If you need to bring back an archived test:

1. **Review the replacement test** in `tests/unit/` or `tests/integration/`
2. **Check if the replacement covers your scenario**
3. If not, **copy the archived test** back to `tests/e2e/`
4. **Update selectors and assertions** if the UI changed
5. **Document why resurrection was needed** in `docs/OPTION_1_PLUS_IMPLEMENTATION.md`

---

## Cross-Reference

For detailed conversion plans and progress, see:
- **Master Plan**: `docs/OPTION_1_PLUS_IMPLEMENTATION.md`
- **Testing Strategy**: `docs/TESTING_STRATEGY.md`
- **Builder Patterns**: `docs/TESTING_BUILDERS.md`
- **Integration Testing**: `docs/TESTING_INTEGRATION.md`

---

## Conversion Progress

| Week | Archived Count | Replacement Type | Status |
|------|---------------|------------------|--------|
| Week 1 | ~5 | Unit tests (93 tests) | ✅ Complete |
| Week 2 | ~74 | Integration tests | ⏳ Pending |
| Week 3 | ~52 | Integration tests | ⏳ Pending |
| Week 4 | ~28 | Integration tests | ⏳ Pending |
| Week 5 | ~190 | Critical paths (18 E2E) | ⏳ Pending |

**Total to Archive**: ~349 E2E tests (from 414 original)  
**Keeping**: 18 critical path E2E + 24 Percy visual tests

---

## Key Principles

✅ **Archive, Don't Delete**: Preserve knowledge  
✅ **Document Replacements**: Link to new tests  
✅ **Test Coverage**: Replacement tests must equal or exceed original coverage  
✅ **Progressive Archiving**: Archive as we convert, show progress  
✅ **CI Cleanup**: Archived tests are excluded from CI runs

---

Last Updated: 2025 - Week 1 Complete
