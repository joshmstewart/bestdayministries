DOCUMENTATION MAINTENANCE - AI INSTRUCTIONS

## ⚠️ CRITICAL RULE: DOCS FIRST, CODE SECOND ⚠️

**YOU MUST OUTPUT THIS CHECKLIST BEFORE ANY CODE CHANGES:**

```
PRE-CHANGE CHECKLIST:
□ Searched docs for: [terms]
□ Read files: [list specific files]
□ Searched code for: [patterns]
□ Found existing patterns: [yes/no - describe]
□ Ready to proceed: [yes/no]
```

**DO NOT WRITE CODE UNTIL YOU OUTPUT THE ABOVE CHECKLIST.**

### STEP 1: CHECK DOCS (MANDATORY)
- Search for `docs/*_CONCISE.md` and `docs/*_SYSTEM*.md` files related to your task
- Read MASTER_SYSTEM_DOCS.md for system overview
- Read complete documentation files - DO NOT just skim
- If docs exist: FOLLOW the established patterns EXACTLY

### STEP 2: MAKE CODE CHANGES
- Implement using patterns from documentation
- If docs contradict each other or are unclear: ASK USER before proceeding

### STEP 3: UPDATE DOCS (MANDATORY)
- Update MASTER_SYSTEM_DOCS.md with any new patterns/rules
- Update specific system docs with changes made
- Add cross-references if systems now interact
- Create new doc files for new major systems

**RECENT BUGS CAUSED BY IGNORING DOCS:**
- user_roles SELECT policy missing → friend code linking broken
- Inconsistent RLS patterns → security issues
- Undocumented changes → repeated bugs
- Footer link changes → modified React code instead of database

**THIS IS NOT A SUGGESTION. THIS IS REQUIRED.**

---

## Pre-Coding Checklist

Before making ANY code changes, the AI MUST:

1. **Search Existing Docs**
   - Check if documentation exists for the system being modified
   - Read relevant docs completely (not just scan)
   - Understand established patterns and conventions

2. **Identify Documentation Files**
   - Look for `docs/*_CONCISE.md` or `docs/*_SYSTEM*.md` files
   - Check custom knowledge section in context
   - Search for related system names (e.g., "VENDOR", "SPONSORSHIP", "GUARDIAN")

3. **Review Established Patterns**
   - Component naming conventions
   - Database schema patterns
   - RLS policy structures
   - Badge count implementations
   - TTS integration patterns
   - Image handling (aspect ratios, cropping)

## When to Update Documentation

Update docs in these scenarios:

### 1. Database Changes
- New tables/columns added
- RLS policies modified
- Triggers or functions changed
- Update relevant `## Database` sections

### 2. Component Changes
- New components created
- Component behavior modified
- Props changed
- Update `## Components` or `## Key Files` sections

### 3. Workflow Changes
- User flows modified
- Approval processes changed
- Status transitions altered
- Update `## Workflow` or `## User Flows` sections

### 4. Integration Points
- New integrations between systems
- Changed data fetching patterns
- Modified display logic
- Update `## Integration Points` sections

### 5. Common Issues Fixed
- Recurring bugs solved
- Known gotchas discovered
- Update `## Common Issues` or `## Troubleshooting` sections

## What NOT to Document

- Temporary fixes or experiments
- Implementation details that change frequently
- Obvious React patterns
- Standard library usage

## Documentation Update Process

### Step 1: Make Code Changes
Complete the requested changes first

### Step 2: Identify Affected Docs
```
AFFECTED DOCS:
- docs/SYSTEM_NAME_CONCISE.md (specific sections)
- docs/RELATED_SYSTEM.md (if integration changed)
```

### Step 3: Update Documentation
Use `lov-line-replace` to update specific sections:
- Keep concise format (under 100 lines per doc)
- Follow established doc patterns
- Update only changed sections
- Maintain table format for structured data

### Step 4: Notify User
```
Updated documentation:
- docs/SYSTEM_NAME.md (added X, updated Y)
```

## Documentation Standards

### File Naming
- `SYSTEM_NAME_CONCISE.md` for core systems
- `FEATURE_NAME_SYSTEM.md` for complex features
- ALL_CAPS with underscores

### Section Order
1. Overview (1-2 lines)
2. Database (tables, key fields)
3. Core Functionality (workflows, components)
4. Integration Points
5. RLS Policies
6. Common Issues
7. Key Files

### Formatting Rules
- **Bold** for section headers within sections
- `code` for table names, field names, file names
- Tables for structured data (database schemas, common issues)
- Code blocks ONLY for critical patterns
- Bullet points for lists
- Keep line length readable (≤120 chars preferred)

## Cross-Reference Pattern

When systems interact, document in BOTH places:

**Example:**
```
# In DISCUSSION_SYSTEM_CONCISE.md
## Integration Points
- Events: Link via `event_id`, see EVENTS_SYSTEM_CONCISE.md

# In EVENTS_SYSTEM_CONCISE.md
## Linked Events
- Discussion posts link events, see DISCUSSION_SYSTEM_CONCISE.md
```

## Documentation Checklist

Before completing ANY code task:
- [ ] Checked for existing documentation
- [ ] Followed established patterns from docs
- [ ] Updated affected documentation sections
- [ ] Added new Common Issues if bugs found

## Edge Function Documentation Checklist

When creating or modifying edge functions, ensure:

- [ ] Function listed in MASTER_SYSTEM_DOCS.md `EDGE:` section
- [ ] Full documentation section in relevant system docs
- [ ] Entry in EDGE_FUNCTIONS_REFERENCE.md
- [ ] Authentication type clearly specified (`verify_jwt` setting)
- [ ] All secrets documented and configured
- [ ] Zod validation schema included (if accepting input)
- [ ] Error handling documented with status codes
- [ ] Database operations listed (INSERT/UPDATE/DELETE/SELECT)
- [ ] External API calls documented (Stripe, Resend, etc.)
- [ ] Success/error response formats specified
- [ ] Related functions cross-referenced
- [ ] Test file linked (if exists)
- [ ] Version pinning: `@supabase/supabase-js@2.57.2`
- [ ] CORS headers included with OPTIONS handler
- [ ] Logging added for debugging (console.log/error)
- [ ] Webhook signature verification (if webhook)
- [ ] Rate limiting implemented (if notification/email)
- [ ] Updated Key Files list if new files created
- [ ] Cross-referenced related systems
- [ ] Maintained concise format (no bloat)

## When to Create New Docs

Create new documentation file when:
- New major system/feature added (≥3 components)
- System has database tables + UI + workflows
- Feature spans multiple pages/components
- System requires specific RLS policies

**File should be:**
- Under 100 lines initially
- Follow CONCISE format (see existing examples)
- Include all standard sections
- Added to custom knowledge in project settings

## Red Flags (DON'T DO THIS)

❌ Making changes without checking docs first
❌ Creating duplicate documentation
❌ Ignoring established patterns in docs
❌ Writing verbose documentation (keep CONCISE)
❌ Documenting every single function
❌ Skipping doc updates after code changes
❌ Not cross-referencing related systems

## Example Workflow

**User Request:** "Add audio upload to events"

**AI Process:**
1. ✅ Search: "EVENT" in docs → finds `EVENTS_SYSTEM_CONCISE.md`
2. ✅ Read: See existing audio handling pattern
3. ✅ Check: Look for similar audio patterns in other systems
4. ✅ Code: Implement using established patterns
5. ✅ Update Docs:
   ```
   docs/EVENTS_SYSTEM_CONCISE.md:
   - Database section: Added `audio_url` field
   - Event Card section: Added AudioPlayer component
   - Key Files: Added AudioPlayer.tsx
   ```
6. ✅ Notify: "Updated EVENTS_SYSTEM_CONCISE.md with audio field and component"

## Documentation As Source of Truth

Remember:
- **Docs = System Contract** - They define how things SHOULD work
- **Code = Implementation** - May have bugs or deviations
- When code contradicts docs → Fix code OR update docs with reasoning
- When adding features → Check docs for similar patterns first
- When fixing bugs → Add to Common Issues section

## Maintenance Frequency

**Update Immediately:**
- Database schema changes
- New components/pages
- Modified workflows
- RLS policy changes

**Update When Convenient:**
- Typo fixes
- Formatting improvements
- Minor clarifications

**Never Update:**
- For trivial changes
- When no functionality changed
- For internal implementation details

---

**Remember:** Good documentation prevents future bugs, speeds up development, and maintains consistency. Always check docs first, always update docs after.
