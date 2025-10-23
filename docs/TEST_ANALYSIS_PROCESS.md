# Test Analysis Process

## Overview
This document defines the systematic process for analyzing test logs and updating documentation. Follow this process **every time** test logs are provided for analysis.

---

## Step 1: Parse Test Results (10 minutes)

### 1.1 Extract Summary Statistics
For each test log file, extract:
- **Total tests**: passed / failed / skipped / did not run
- **Test duration**: how long the suite took
- **Test categories**: unit / e2e / visual / performance
- **Shard information**: which shard (if applicable)

### 1.2 Identify All Failures
Create a list of every failing test with:
- Test file and line number
- Test name/description
- Error type (timeout, assertion, precondition, etc.)
- Error message (first 100 characters)
- Whether it's a new failure or regression

### 1.3 Identify Skipped Tests
List any tests that were skipped with:
- Reason for skip (if available)
- Whether skip is conditional or unconditional
- Related preconditions that are missing

### 1.4 Identify "Did Not Run" Tests
List tests that didn't run due to:
- Earlier test failures in suite
- Shard distribution
- Test dependencies

---

## Step 2: Root Cause Analysis (20 minutes)

### 2.1 Categorize Failures
Group failures by root cause:
- **Missing Dependencies**: `@testing-library/jest-dom`, missing packages
- **Selector Issues**: Elements not found, wrong selectors
- **Timing Issues**: Timeouts, race conditions, async problems
- **Precondition Failures**: Missing seed data, missing features
- **Test Data Issues**: Test pollution, cleanup problems
- **Feature Bugs**: Actual application bugs
- **Test Infrastructure**: CI/CD environment issues

### 2.2 Identify Patterns
Look for:
- Multiple tests failing with same error
- Tests failing in specific files/suites
- Tests failing only in certain shards
- Tests failing only in CI vs. local
- New failures after recent changes

### 2.3 Determine Priority
Classify each issue:
- **CRITICAL**: Blocks all tests in suite, prevents deployment
- **HIGH**: Affects multiple tests, indicates real bug
- **MEDIUM**: Single test failure, may be test-specific
- **LOW**: Flaky test, rare occurrence

---

## Step 3: Search for Context (15 minutes)

### 3.1 Check Recent Changes
Search codebase for:
- Files modified in recent commits
- Related test files
- Components referenced in failures
- Database migrations or schema changes

### 3.2 Review Related Documentation
Check existing docs:
- `docs/TEST_FIXES_*.md` - Previous similar issues
- `docs/TESTING_BEST_PRACTICES.md` - Known patterns
- `docs/TEST_SKIP_PHILOSOPHY.md` - Skip policy
- `docs/MASTER_SYSTEM_DOCS.md` - System context

### 3.3 Search Test Files
Use `lov-search-files` to find:
- Other tests with similar patterns
- Tests that might be affected
- Shared test utilities or fixtures

---

## Step 4: Propose Solutions (15 minutes)

### 4.1 For Each Failure, Define Fix
Specify exactly what needs to change:
- **Code changes**: Which files, what modifications
- **Test changes**: Selector updates, timeout adjustments
- **Infrastructure changes**: Dependencies, configuration
- **Data changes**: Seed functions, database setup

### 4.2 Verify Solution Against Policy
Check that proposed fix aligns with:
- **Zero Skips Policy**: No conditional skips allowed
- **Test Independence**: Tests don't depend on each other
- **Precondition First**: Fix root cause, not symptoms
- **Documentation Required**: All fixes must be documented

### 4.3 Prioritize Fixes
Order fixes by:
1. CRITICAL issues blocking multiple tests
2. HIGH issues affecting test reliability
3. MEDIUM issues with single test impact
4. LOW issues with rare/flaky failures

---

## Step 5: Document Findings (10 minutes)

### 5.1 Create Date-Stamped Analysis Document
File: `docs/TEST_ANALYSIS_YYYY_MM_DD.md`

Template:
```markdown
# Test Analysis - [Date]

## Summary
- Total test runs: [number]
- Total failures: [number]
- Total passes: [number]
- Overall status: [PASS/FAIL]

## Critical Issues
[List CRITICAL priority issues]

## High Priority Issues
[List HIGH priority issues]

## Medium Priority Issues
[List MEDIUM priority issues]

## Low Priority Issues
[List LOW priority issues]

## Test Statistics
- Unit Tests: [passed/failed/skipped]
- E2E Tests: [passed/failed/skipped]
- Visual Tests: [passed/failed/skipped]

## Detailed Failures
[For each failure, include test name, file, error, and proposed fix]

## Patterns Observed
[Any patterns found across multiple failures]

## Recommended Actions
1. [Action 1 with priority]
2. [Action 2 with priority]
...

## Files to Fix
- [file 1] - [reason]
- [file 2] - [reason]
...
```

### 5.2 Update Tracking Documents
Update these files if needed:
- `docs/MASTER_SYSTEM_DOCS.md` - Add new patterns to TEST_PHILOSOPHY section
- `docs/TESTING_BEST_PRACTICES.md` - Add learnings to best practices
- `docs/TEST_SKIP_PHILOSOPHY.md` - Document any skip-related issues

### 5.3 Create Issue-Specific Docs
For major issues, create dedicated docs:
- `docs/TEST_ISSUE_[DESCRIPTION].md` - Detailed investigation
- Include: symptoms, root cause, fix, prevention

---

## Step 6: Implement Fixes (variable time)

### 6.1 Follow Priority Order
Fix in this order:
1. CRITICAL - blocks everything
2. HIGH - affects multiple tests
3. MEDIUM - single test issues
4. LOW - minor/flaky issues

### 6.2 Make Minimal Changes
For each fix:
- Change ONLY what's needed
- Don't refactor unrelated code
- Don't add features not requested
- Test locally before committing

### 6.3 Verify Each Fix
After each change:
- Run affected tests locally
- Verify fix doesn't break other tests
- Check that error messages are clear
- Document the change

---

## Step 7: Update Documentation (10 minutes)

### 7.1 Document Each Fix
In the analysis document, update status:
- Mark issue as FIXED
- Add commit hash or PR number
- Note any side effects or learnings
- Update recommended actions

### 7.2 Add to Knowledge Base
Update relevant docs:
- Add pattern to TESTING_BEST_PRACTICES if reusable
- Add to TEST_FIXES with date
- Update MASTER_SYSTEM_DOCS if architectural

### 7.3 Close the Loop
Ensure:
- All fixes are documented
- All learnings are captured
- All patterns are generalized
- Future prevention is addressed

---

## Process Checklist

When analyzing test logs, verify you've completed:

- [ ] Parsed all test log files
- [ ] Extracted summary statistics
- [ ] Listed all failures with details
- [ ] Categorized failures by root cause
- [ ] Identified patterns across failures
- [ ] Prioritized issues (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] Searched codebase for context
- [ ] Reviewed related documentation
- [ ] Proposed specific fixes for each issue
- [ ] Verified fixes align with testing philosophy
- [ ] Created date-stamped analysis document
- [ ] Updated tracking documents
- [ ] Documented recommended actions
- [ ] Implemented fixes in priority order
- [ ] Verified fixes work correctly
- [ ] Updated documentation with results

---

## Key Principles

### Always Remember:
1. **Tests are the safety net** - Every failure matters
2. **Fix root causes** - Don't mask problems
3. **Document everything** - Future you will thank you
4. **Zero skips policy** - Fix preconditions, don't skip
5. **Test independence** - Tests shouldn't depend on each other
6. **Clear errors** - Error messages should guide fixes
7. **Patterns matter** - Similar failures indicate systemic issues

### Never Do:
1. Skip tests without fixing preconditions
2. Add random timeouts without understanding why
3. Modify tests just to make them pass
4. Ignore patterns across multiple failures
5. Fix without documenting
6. Make changes without verifying locally

---

## Related Documentation

- `docs/TEST_SKIP_PHILOSOPHY.md` - When skipping is never acceptable
- `docs/TESTING_BEST_PRACTICES.md` - Comprehensive testing guidelines
- `docs/TEST_FIXES_2025_10_23.md` - Recent test fixes and learnings
- `docs/TEST_SKIP_ELIMINATION_2025_10_23.md` - Skip elimination initiative
- `docs/AUTOMATED_TESTING_SYSTEM.md` - Testing infrastructure overview
