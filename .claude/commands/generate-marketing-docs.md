---
name: Generate Marketing Docs
description: Generate marketing copy and documentation for current git changes
category: Documentation
tags: [marketing, docs, changelog, release]
---

**Purpose**
Analyze the current git changes and generate marketing-friendly documentation and release notes.

**Steps**

1. **Analyze Current Changes**
   - Run `git status` to see all modified, added, and deleted files
   - Run `git diff --staged` to review staged changes
   - Run `git diff` to review unstaged changes
   - Run `git log -5 --oneline` to see recent commits for context

2. **Categorize Changes**
   - Group changes by type: features, improvements, bug fixes, breaking changes
   - Identify user-facing vs internal changes
   - Note any API changes or new capabilities

3. **Generate Documentation**
   Create the following sections:

   **Release Highlights** (1-2 sentences for marketing)
   - Focus on user benefits, not technical details
   - Use action-oriented language

   **What's New** (bullet points)
   - New features with brief descriptions
   - Improvements to existing functionality

   **Bug Fixes** (if applicable)
   - User-facing issues that were resolved

   **Breaking Changes** (if applicable)
   - Any changes that require user action

   **Technical Notes** (for developers)
   - API changes, new dependencies, migration notes

4 **Marketing Content**
   Generate posts for marketing and save them in /marketing/[datetime] (focus on building in public and transparent stats, ask me for financials, current MRR: $14 and LTD sales: $1000)
   - Generate a reddit post for 3 subreddits each in a separate file (don't self promote)
   - Generate a twitter thread
   - Generate a medium article 
   - Generate a linked in article.

5. **Output Format**
   Present the documentation in markdown format suitable for:
   - GitHub release notes
   - Blog post or announcement
   - Changelog entry

**Guidelines**
- Write for the end user, not developers (unless in Technical Notes)
- Use clear, concise language
- Highlight benefits over features
- Include specific examples where helpful
- Ask clarifying questions if the changes are ambiguous
- ignore documentation and base your writing on code not docs
- OS version repo at https://github.com/dotnetfactory/fluid-calendar
- app at www.fluidcalendar.com
- 
