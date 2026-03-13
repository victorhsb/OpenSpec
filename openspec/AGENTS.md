# OpenSpec Agent Instructions

Quick reference for AI assistants working with this project.

---

## Quick Reference

### Spec IDs

Spec IDs are **forward-slash-separated paths** relative to `openspec/specs/`. Both flat and hierarchical IDs are valid:

| ID | File path |
|----|-----------|
| `auth` | `openspec/specs/auth/spec.md` |
| `cli/show` | `openspec/specs/cli/show/spec.md` |
| `domain/project/feature` | `openspec/specs/domain/project/feature/spec.md` |

IDs always use `/` regardless of operating system.

### CLI Commands

```bash
# List all specs
openspec list --specs

# List specs under a subtree (segment-boundary match)
openspec list --specs cli/
# "cli/" matches "cli/show", "cli/validate" — NOT "client/config"

# Show a spec (flat or hierarchical)
openspec show auth
openspec show cli/show

# Validate a spec
openspec validate cli/show

# Validate all specs
openspec validate --specs
```

### Delta Spec Paths

When writing delta specs for a change, mirror the hierarchical ID under `changes/<name>/specs/`:

```
openspec/changes/my-feature/specs/
├── auth/
│   └── spec.md          # delta for spec ID "auth"
└── cli/
    ├── show/
    │   └── spec.md      # delta for spec ID "cli/show"
    └── validate/
        └── spec.md      # delta for spec ID "cli/validate"
```

---

## Spec Format Templates

### New Spec (`openspec/specs/<id>/spec.md`)

```markdown
## Purpose
One sentence describing what this capability does.

## Requirements

### Requirement: <Descriptive Name>
The system SHALL <behavior>.

#### Scenario: <Scenario Name>
- **GIVEN** <precondition>
- **WHEN** <trigger>
- **THEN** <expected outcome>
- **AND** <additional outcome>
```

**For hierarchical specs**, the file lives at `openspec/specs/<domain>/<feature>/spec.md` but the content format is identical. Example for spec ID `cli/show`:

```markdown
## Purpose
Display a specification's content by its hierarchical ID.

## Requirements

### Requirement: Hierarchical ID Resolution
The show command SHALL accept forward-slash-separated spec IDs.

#### Scenario: Show nested spec
- **GIVEN** a spec exists at openspec/specs/cli/show/spec.md
- **WHEN** the user runs `openspec show cli/show`
- **THEN** the spec content is displayed
```

### Delta Spec (`changes/<name>/specs/<id>/spec.md`)

```markdown
## ADDED Requirements

### Requirement: <New Requirement Name>
The system SHALL <new behavior>.

#### Scenario: <Scenario Name>
- **WHEN** <trigger>
- **THEN** <outcome>

## MODIFIED Requirements

### Requirement: <Existing Requirement Name>
The system SHALL <updated behavior>.  ← (was: <old behavior>)

#### Scenario: <Scenario Name>
- **WHEN** <trigger>
- **THEN** <updated outcome>

## REMOVED Requirements

### Requirement: <Requirement To Remove>
Reason: <why it is being removed>

## RENAMED Requirements
- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

---

## Workflow

1. **Propose** — create `openspec/changes/<name>/` with `proposal.md`, `tasks.md`, and delta specs under `specs/`
2. **Implement** — follow `tasks.md` checklist
3. **Validate** — run `openspec validate --specs` and `openspec validate --changes`
4. **Archive** — run `openspec archive <name>` to apply deltas and move to `changes/archive/`

---

## Pre-Validation Checklist

Before running `openspec validate`:

- [ ] Every `### Requirement:` block has at least one `#### Scenario:`
- [ ] Scenarios use `**GIVEN**`/`**WHEN**`/`**THEN**`/`**AND**` keywords
- [ ] Delta specs use `## ADDED`/`## MODIFIED`/`## REMOVED`/`## RENAMED` section headers
- [ ] `## MODIFIED` and `## REMOVED` headers exactly match the headers in the current spec
- [ ] Spec IDs use forward slashes (`cli/show`), not backslashes or hyphens as separators
- [ ] Each spec file is at `<id>/spec.md` — e.g., `cli/show/spec.md` for ID `cli/show`

---

## Advanced Topics

### Subtree Filtering

`openspec list --specs <prefix>` filters by **segment boundary**:

```bash
openspec list --specs cli/     # ✓ cli/show, cli/validate
                               # ✗ client/config (different segment)
openspec spec list cli/        # same, via deprecated spec subcommand
```

### Cross-Platform Paths

Spec IDs always use `/`. The CLI converts to OS-specific paths internally — you never need to use `\` in spec IDs on Windows.

### Coexistence of Flat and Hierarchical IDs

Flat IDs (`auth`, `cli-show`) and hierarchical IDs (`cli/show`) coexist without conflict. Migration is not required; both are discovered automatically.

### Writing Specs: Behavior vs. Implementation

- **Specs** (`spec.md`): externally observable behavior, interfaces, error conditions, constraints — no library/framework choices
- **Design** (`design.md`): internal architecture, library choices, data structures
- **Tasks** (`tasks.md`): implementation steps and checklist items
