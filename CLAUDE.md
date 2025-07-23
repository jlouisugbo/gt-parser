# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

This is a Next.js application that parses Georgia Tech degree program requirements from catalog text and stores structured data in Supabase. The application operates in a multi-step workflow.

### Core Components

**GTParser** (`src/components/GTParser.tsx`) - Main orchestrator component with a tabbed interface:
- Input: Raw catalog text entry
- Parsed: Quick program info editing and preview
- Edit: Visual/JSON editing modes
- Preview: Final review before database update
- Confirm: Database operation results

**VisualFormEditor** (`src/components/VisualFormEditor.tsx`) - Visual editing interface for program structure including drag-and-drop reordering of requirements.

**RequirementEditor** (`src/components/RequirementEditor.tsx`) - Complex editor for individual requirement categories supporting:
- Regular courses with codes and titles
- OR/AND logic groups with nested courses
- Selection groups ("Select X of the following")
- Footnote management and reference system
- Insert buttons for adding content between items

### Data Processing Pipeline

**Parser** (`src/lib/gtParser.ts`) - Comprehensive text parser that:
- Detects table vs. narrative formats
- Extracts course codes, titles, and footnote references
- Creates logic groups (OR/AND patterns like "BIOS 1603 & BIOS 1603L")
- Handles selection groups ("Select 2 of the following")
- Supports flexible requirements (electives, "Any HUM", etc.)
- Post-processes to consolidate duplicate patterns

**API Endpoint** (`src/app/api/create-degree/route.ts`) - Handles database operations:
- Searches for existing programs by exact name match
- Updates existing programs or creates new ones
- Manages concentrations and threads in program names

### Data Models

The application works with hierarchical course structures:

```typescript
Course {
  code: string           // "CS 1371", "OR_GROUP", "SELECT_GROUP"
  title: string         // Course title or group description
  courseType: string    // 'regular' | 'or_option' | 'or_group' | 'and_group' | 'selection'
  footnoteRefs: number[] // References to footnotes
  groupCourses?: Course[]      // For OR/AND groups
  selectionOptions?: Course[]  // For selection groups
  selectionCount?: number      // Number to select
}

Requirement {
  name: string         // "Major Requirements", "Core IMPACTS"
  courses: Course[]    // Array of courses/groups
  footnotes?: Footnote[] // Category-specific footnotes
}
```

### Database Integration

Uses Supabase with admin client (`src/lib/supabaseAdmin.ts`) for:
- Creating/updating degree programs
- Storing requirements as JSON in `requirements` column
- Managing footnotes in separate `footnotes` column
- Supporting concentrations and threads

### Key Parsing Features

- **Logic Group Detection**: Automatically creates OR/AND groups from patterns like "BIOS 1601 OR MATH 1553"
- **Selection Parsing**: Converts "Select 2 of the following:" into structured selection groups
- **Footnote Handling**: Extracts numeric footnote references and maintains relationships
- **Flexible Requirements**: Recognizes patterns like "Any HUM6", "Free Electives", "CS Electives"
- **Duplicate Consolidation**: Groups consecutive duplicate course titles into AND groups

The parser is designed specifically for Georgia Tech catalog formats and includes extensive logging for debugging parsing issues.