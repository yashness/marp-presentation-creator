"""Service for managing presentation templates."""

import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.template import Template
from app.schemas.template import TemplateCreate, TemplateResponse, TemplateCategory

# Built-in templates for common presentation types
BUILTIN_TEMPLATES = [
    {
        "id": "tpl-pitch-deck",
        "name": "Pitch Deck",
        "description": "Perfect for startup pitches and investor presentations",
        "category": "Business",
        "theme_id": "corporate",
        "content": """---
marp: true
theme: corporate
paginate: true
---

# Company Name

## Transforming [Industry] with [Solution]

*Pitch Deck 2026*

---

## The Problem

- Pain point 1 that your target market experiences
- Pain point 2 that costs time and money
- Pain point 3 that competitors fail to solve

> "Customer quote highlighting the problem"

---

## Our Solution

### [Product/Service Name]

A brief description of what you offer and how it solves the problem.

**Key Benefits:**
- Benefit 1
- Benefit 2
- Benefit 3

---

## Market Opportunity

### $X Billion TAM

| Segment | Size | Growth |
|---------|------|--------|
| Total Addressable Market | $X B | X% CAGR |
| Serviceable Market | $X B | X% CAGR |
| Target Market | $X M | X% CAGR |

---

## Business Model

### How We Make Money

- **Revenue Stream 1**: Description
- **Revenue Stream 2**: Description
- **Revenue Stream 3**: Description

*Average Customer Value: $X/year*

---

## Traction

### Key Metrics

- **Users**: X,000+ active users
- **Revenue**: $XM ARR
- **Growth**: X% MoM

---

## The Team

| Role | Name | Background |
|------|------|------------|
| CEO | Name | Previous experience |
| CTO | Name | Previous experience |
| COO | Name | Previous experience |

---

## The Ask

### Seeking $X Million

**Use of Funds:**
- Product Development: X%
- Sales & Marketing: X%
- Operations: X%

---

## Thank You

### Let's Connect

📧 email@company.com
🌐 company.com
📱 (555) 123-4567
""",
    },
    {
        "id": "tpl-lecture",
        "name": "Academic Lecture",
        "description": "Structured format for educational presentations",
        "category": "Education",
        "theme_id": "academic",
        "content": """---
marp: true
theme: academic
paginate: true
math: mathjax
---

# Lecture Title

## Course Name - Week X

**Instructor:** Dr. Name
**Date:** [Date]

---

## Learning Objectives

By the end of this lecture, you will be able to:

1. Objective 1
2. Objective 2
3. Objective 3
4. Objective 4

---

## Outline

1. Topic 1: Introduction
2. Topic 2: Core Concepts
3. Topic 3: Applications
4. Topic 4: Summary & Questions

---

## Topic 1: Introduction

### Background

- Key point about the subject
- Historical context or motivation
- Why this matters

---

## Key Concept

### Definition

> A formal definition of the key concept being taught.

**Important:** Emphasize critical aspects here.

---

## Mathematical Foundation

The fundamental equation:

$$
E = mc^2
$$

Where:
- $E$ = energy
- $m$ = mass
- $c$ = speed of light

---

## Example Problem

### Problem Statement

Given [conditions], find [unknown].

**Solution:**

1. Step 1: Apply formula
2. Step 2: Substitute values
3. Step 3: Calculate result

---

## Visual Representation

```
┌─────────────────────────────────────┐
│                                     │
│        Diagram or Figure            │
│                                     │
│    [Replace with actual visual]     │
│                                     │
└─────────────────────────────────────┘
```

---

## Key Takeaways

1. **Main Point 1**: Brief explanation
2. **Main Point 2**: Brief explanation
3. **Main Point 3**: Brief explanation

---

## Next Week

- Topic preview
- Reading assignment
- Homework due

---

## Questions?

### Office Hours
- Day/Time
- Location

### Contact
- email@university.edu
""",
    },
    {
        "id": "tpl-project-update",
        "name": "Project Status Update",
        "description": "Weekly or monthly project progress reports",
        "category": "Business",
        "theme_id": "corporate",
        "content": """---
marp: true
theme: corporate
paginate: true
---

# Project Status Update

## [Project Name]

**Report Date:** [Date]
**Project Manager:** [Name]

---

## Executive Summary

| Metric | Status |
|--------|--------|
| Schedule | 🟢 On Track |
| Budget | 🟡 At Risk |
| Scope | 🟢 On Track |
| Quality | 🟢 On Track |

**Overall Status:** On Track

---

## Accomplishments This Period

### Completed Items

- ✅ Task 1 completed
- ✅ Task 2 completed
- ✅ Milestone X achieved

---

## In Progress

### Current Work

| Task | Owner | Progress | Due Date |
|------|-------|----------|----------|
| Task A | Name | 75% | MM/DD |
| Task B | Name | 50% | MM/DD |
| Task C | Name | 25% | MM/DD |

---

## Risks & Issues

### Active Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Risk 1 | High | Medium | Mitigation plan |
| Risk 2 | Medium | Low | Monitoring |

### Open Issues

- Issue 1: Description and status
- Issue 2: Description and status

---

## Budget Status

### Financial Summary

| Category | Budget | Actual | Variance |
|----------|--------|--------|----------|
| Development | $X | $X | $X |
| Infrastructure | $X | $X | $X |
| **Total** | **$X** | **$X** | **$X** |

---

## Timeline

### Key Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 1 Complete | MM/DD | ✅ Done |
| Phase 2 Complete | MM/DD | 🔄 In Progress |
| Phase 3 Complete | MM/DD | ⏳ Upcoming |

---

## Next Steps

### Priorities for Next Period

1. Priority task 1
2. Priority task 2
3. Priority task 3

### Key Decisions Needed

- Decision 1: Description
- Decision 2: Description

---

## Questions & Discussion
""",
    },
    {
        "id": "tpl-workshop",
        "name": "Interactive Workshop",
        "description": "Hands-on training session with exercises",
        "category": "Education",
        "theme_id": "default",
        "content": """---
marp: true
theme: default
paginate: true
---

# Workshop Title

## Hands-On Learning Session

**Facilitator:** [Name]
**Duration:** X hours

---

## Welcome! 👋

### Before We Begin

- Introduce yourself (name, role, what you hope to learn)
- Make sure you have the required tools installed
- Ask questions anytime!

---

## Agenda

| Time | Topic |
|------|-------|
| 0:00 | Introduction & Setup |
| 0:15 | Concept Overview |
| 0:30 | Demo |
| 0:45 | Exercise 1 |
| 1:15 | Break |
| 1:30 | Exercise 2 |
| 2:00 | Wrap-up |

---

## Learning Objectives

By the end of this workshop, you will:

1. ✅ Understand [concept]
2. ✅ Be able to [skill]
3. ✅ Create [deliverable]

---

## Prerequisites

### Required

- [ ] Tool 1 installed
- [ ] Account created on Platform X
- [ ] Basic knowledge of Y

### Nice to Have

- Familiarity with Z

---

## Concept Overview

### What is [Topic]?

A brief explanation of the core concept we'll be learning.

**Key Points:**
- Point 1
- Point 2
- Point 3

---

## Demo Time! 🎬

### Watch First, Then Do

I'll demonstrate:
1. Step 1
2. Step 2
3. Step 3

*Follow along on your own machine*

---

## 🏋️ Exercise 1

### Getting Started

**Goal:** [What participants will accomplish]

**Instructions:**
1. Step 1
2. Step 2
3. Step 3

**Time:** 15 minutes

---

## Exercise 1 Solution

```
# Example solution code or steps
example_solution = "here"
```

*Don't peek until you've tried!*

---

## ☕ Break Time

### 15 Minutes

- Stretch
- Grab a coffee
- Ask questions

---

## 🏋️ Exercise 2

### Building On What We Learned

**Goal:** [More advanced accomplishment]

**Instructions:**
1. Step 1
2. Step 2
3. Step 3

**Time:** 20 minutes

---

## Key Takeaways

1. 📌 Takeaway 1
2. 📌 Takeaway 2
3. 📌 Takeaway 3

---

## Resources

### Keep Learning

- 📚 [Documentation Link]
- 🎥 [Video Tutorial]
- 💬 [Community Forum]

---

## Feedback

### Help Us Improve

Please take 2 minutes to complete our feedback form:

🔗 [Feedback Link]

---

## Thank You! 🎉

### Stay Connected

- Email: instructor@email.com
- Twitter: @handle
- LinkedIn: /in/profile
""",
    },
    {
        "id": "tpl-tech-overview",
        "name": "Technical Overview",
        "description": "Architecture and system design presentations",
        "category": "Technical",
        "theme_id": "default",
        "content": """---
marp: true
theme: default
paginate: true
---

# System Architecture

## [System Name] Technical Overview

**Author:** [Name]
**Version:** 1.0
**Last Updated:** [Date]

---

## Agenda

1. System Overview
2. Architecture Diagram
3. Component Deep Dive
4. Data Flow
5. Security
6. Deployment
7. Q&A

---

## System Overview

### Purpose

Brief description of what the system does and who uses it.

### Key Characteristics

- **Scalability**: Handles X requests/second
- **Availability**: 99.9% uptime SLA
- **Performance**: <100ms p99 latency

---

## High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API GW    │────▶│  Services   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────┐     ┌─────▼───────┐
                    │    Cache    │◀────│  Database   │
                    └─────────────┘     └─────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript |
| API | FastAPI, Python |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | RabbitMQ |
| Infrastructure | Kubernetes, AWS |

---

## Component: API Service

### Responsibilities

- Request validation
- Authentication/Authorization
- Business logic orchestration

### Key Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/items | List items |
| POST | /api/items | Create item |
| PUT | /api/items/:id | Update item |

---

## Component: Database

### Schema Overview

```sql
CREATE TABLE items (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

- Primary key on `id`
- Index on `created_at` for queries

---

## Data Flow

### Create Item Flow

1. Client sends POST request
2. API validates input
3. Service creates record
4. Cache invalidated
5. Response returned

---

## Security

### Authentication

- JWT tokens with 1-hour expiry
- Refresh token rotation

### Authorization

- Role-based access control
- Resource-level permissions

### Data Protection

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)

---

## Deployment

### Infrastructure

- Kubernetes cluster on AWS EKS
- Multi-AZ deployment
- Auto-scaling based on CPU/memory

### CI/CD

- GitHub Actions for builds
- ArgoCD for deployments
- Automated rollbacks

---

## Monitoring

### Observability Stack

- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack
- **Traces**: Jaeger

### Key Dashboards

- Request latency
- Error rates
- Resource utilization

---

## Future Considerations

### Roadmap

1. **Q1**: Feature X
2. **Q2**: Performance optimization
3. **Q3**: Multi-region deployment

### Technical Debt

- Item 1 to address
- Item 2 to refactor

---

## Questions?

### Contact

- Slack: #team-channel
- Email: team@company.com
""",
    },
    {
        "id": "tpl-team-intro",
        "name": "Team Introduction",
        "description": "Introduce your team to stakeholders",
        "category": "Business",
        "theme_id": "corporate",
        "content": """---
marp: true
theme: corporate
paginate: true
---

# Meet the Team

## [Team/Department Name]

*Building great things together*

---

## Our Mission

> To deliver exceptional [value proposition] that [impact statement].

---

## Team Structure

```
                 ┌─────────────┐
                 │   Leader    │
                 └──────┬──────┘
         ┌───────────┬──┴──┬───────────┐
    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
    │ Squad 1 │ │ Squad 2 │ │ Squad 3 │
    └─────────┘ └─────────┘ └─────────┘
```

---

## Leadership

### [Name] - [Title]

- X years of experience in [field]
- Previously at [Company]
- Passionate about [interest]

📧 email@company.com

---

## Team Member 1

### [Name] - [Role]

**Focus Areas:**
- Area 1
- Area 2
- Area 3

**Fun Fact:** [Something personal and interesting]

---

## Team Member 2

### [Name] - [Role]

**Focus Areas:**
- Area 1
- Area 2
- Area 3

**Fun Fact:** [Something personal and interesting]

---

## Team Member 3

### [Name] - [Role]

**Focus Areas:**
- Area 1
- Area 2
- Area 3

**Fun Fact:** [Something personal and interesting]

---

## What We Do

### Core Responsibilities

- 🎯 Responsibility 1
- 🎯 Responsibility 2
- 🎯 Responsibility 3
- 🎯 Responsibility 4

---

## Our Values

| Value | What It Means |
|-------|---------------|
| 🤝 Collaboration | We work together across boundaries |
| 🚀 Innovation | We embrace new ideas and approaches |
| 💯 Excellence | We strive for quality in everything |
| 🌱 Growth | We learn and improve continuously |

---

## How to Work With Us

### Communication

- **Slack**: #team-channel
- **Email**: team@company.com
- **Office Hours**: Tuesdays 2-3pm

### Requests

- Submit via [system/form]
- SLA: X business days

---

## Current Projects

### What We're Building

1. **Project A**: Brief description
2. **Project B**: Brief description
3. **Project C**: Brief description

---

## Questions?

### We're Here to Help!

Don't hesitate to reach out.

📧 team@company.com
💬 #team-channel
""",
    },
    {
        "id": "tpl-product-launch",
        "name": "Product Launch",
        "description": "Announce new products or features",
        "category": "Marketing",
        "theme_id": "default",
        "content": """---
marp: true
theme: default
paginate: true
---

# Introducing [Product Name]

## The Future of [Category]

*Launch Date: [Date]*

---

## The Big Announcement 🎉

### [Product Name] is Here!

A revolutionary [product type] that [key benefit].

---

## The Problem We Solved

### Before [Product Name]

- ❌ Pain point 1
- ❌ Pain point 2
- ❌ Pain point 3

*Users spent X hours/$ on workarounds*

---

## The Solution

### After [Product Name]

- ✅ Benefit 1
- ✅ Benefit 2
- ✅ Benefit 3

*Save X hours and $X per month*

---

## Key Features

### What's Included

| Feature | Benefit |
|---------|---------|
| Feature 1 | Enables X |
| Feature 2 | Reduces Y |
| Feature 3 | Improves Z |

---

## Feature Spotlight: [Feature 1]

### [Feature Name]

Description of the feature and how it works.

**Why It Matters:**
- Point 1
- Point 2
- Point 3

---

## Feature Spotlight: [Feature 2]

### [Feature Name]

Description of the feature and how it works.

**Why It Matters:**
- Point 1
- Point 2
- Point 3

---

## How It Works

### Simple 3-Step Process

1. **Step 1**: Do this first thing
2. **Step 2**: Then do this
3. **Step 3**: Enjoy the result!

---

## Pricing

### Plans for Everyone

| Plan | Price | Best For |
|------|-------|----------|
| Starter | Free | Individuals |
| Pro | $X/mo | Teams |
| Enterprise | Custom | Large orgs |

---

## Early Adopter Testimonial

> "[Product Name] changed how we work. We're X% more productive."

**- Name, Title at Company**

---

## Launch Offer 🎁

### Limited Time Only

- **X% off** first year
- **Free** premium feature
- **Priority** support

*Offer ends [Date]*

---

## Getting Started

### Start in Minutes

1. Visit [website]
2. Create account
3. Follow setup wizard

🔗 **[product.com/get-started]**

---

## Q&A

### We're Here to Help

- 📧 support@product.com
- 💬 Live chat on website
- 📚 docs.product.com

---

## Thank You!

### Let's Build the Future Together

🚀 **[product.com]**

Social: @producthandle
""",
    },
    {
        "id": "tpl-retrospective",
        "name": "Sprint Retrospective",
        "description": "Agile team retrospective format",
        "category": "Agile",
        "theme_id": "default",
        "content": """---
marp: true
theme: default
paginate: true
---

# Sprint Retrospective

## Sprint [Number]

**Date:** [Date]
**Facilitator:** [Name]

---

## Agenda

1. Sprint Summary (5 min)
2. What Went Well (10 min)
3. What Could Improve (10 min)
4. Action Items (10 min)
5. Kudos (5 min)

---

## Sprint Summary

### By the Numbers

| Metric | Target | Actual |
|--------|--------|--------|
| Story Points | X | Y |
| Velocity | X | Y |
| Bugs Fixed | X | Y |
| Cycle Time | X days | Y days |

---

## What Went Well 🌟

### Keep Doing These Things

- ✅ Thing 1 that worked well
- ✅ Thing 2 that worked well
- ✅ Thing 3 that worked well
- ✅ Thing 4 that worked well

---

## What Could Improve 🔧

### Opportunities for Growth

- ⚠️ Challenge 1 we faced
- ⚠️ Challenge 2 we faced
- ⚠️ Challenge 3 we faced
- ⚠️ Challenge 4 we faced

---

## Deep Dive: [Issue 1]

### Root Cause Analysis

**What happened:**
Brief description

**Why it happened:**
1. Contributing factor 1
2. Contributing factor 2

**Proposed solution:**
Specific action to address

---

## Deep Dive: [Issue 2]

### Root Cause Analysis

**What happened:**
Brief description

**Why it happened:**
1. Contributing factor 1
2. Contributing factor 2

**Proposed solution:**
Specific action to address

---

## Action Items

### Commitments for Next Sprint

| Action | Owner | Due Date |
|--------|-------|----------|
| Action 1 | Name | Date |
| Action 2 | Name | Date |
| Action 3 | Name | Date |

---

## Previous Action Items Review

### From Last Retro

| Action | Status |
|--------|--------|
| Previous action 1 | ✅ Done |
| Previous action 2 | 🔄 In Progress |
| Previous action 3 | ❌ Not Started |

---

## Kudos Corner 🙌

### Shoutouts

- **[Name]** - For [accomplishment]
- **[Name]** - For [accomplishment]
- **[Name]** - For [accomplishment]

---

## Team Health Check

### How Are We Feeling?

| Dimension | Score |
|-----------|-------|
| Collaboration | ⭐⭐⭐⭐☆ |
| Communication | ⭐⭐⭐⭐⭐ |
| Work-Life Balance | ⭐⭐⭐☆☆ |
| Technical Excellence | ⭐⭐⭐⭐☆ |

---

## Next Sprint Preview

### Coming Up

- Priority 1: [Description]
- Priority 2: [Description]
- Priority 3: [Description]

---

## Thank You!

### See You Next Sprint! 🚀
""",
    },
]


def init_builtin_templates(db: Session) -> None:
    """Initialize built-in templates if they don't exist."""
    for tpl_data in BUILTIN_TEMPLATES:
        existing = db.query(Template).filter_by(id=tpl_data["id"]).first()
        if not existing:
            template = Template(
                id=tpl_data["id"],
                name=tpl_data["name"],
                description=tpl_data["description"],
                category=tpl_data["category"],
                content=tpl_data["content"],
                theme_id=tpl_data.get("theme_id"),
                is_builtin=True,
            )
            db.add(template)
    db.commit()


def list_templates(db: Session, category: str | None = None) -> list[TemplateResponse]:
    """List all templates, optionally filtered by category."""
    query = db.query(Template)
    if category:
        query = query.filter(Template.category == category)
    templates = query.order_by(Template.category, Template.name).all()
    return [TemplateResponse.model_validate(t) for t in templates]


def get_template(db: Session, template_id: str) -> TemplateResponse | None:
    """Get a template by ID."""
    template = db.query(Template).filter_by(id=template_id).first()
    if template:
        return TemplateResponse.model_validate(template)
    return None


def list_categories(db: Session) -> list[TemplateCategory]:
    """List all template categories with counts."""
    from sqlalchemy import func

    results = (
        db.query(Template.category, func.count(Template.id))
        .group_by(Template.category)
        .all()
    )

    category_descriptions = {
        "Business": "Professional templates for business presentations",
        "Education": "Templates for lectures, workshops, and training",
        "Technical": "Architecture, system design, and technical docs",
        "Marketing": "Product launches, campaigns, and announcements",
        "Agile": "Sprint planning, retrospectives, and demos",
    }

    return [
        TemplateCategory(
            name=cat,
            description=category_descriptions.get(cat, f"Templates for {cat}"),
            count=count,
        )
        for cat, count in results
    ]


def create_template(db: Session, data: TemplateCreate) -> TemplateResponse:
    """Create a custom template."""
    template = Template(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        category=data.category,
        content=data.content,
        theme_id=data.theme_id,
        thumbnail_url=data.thumbnail_url,
        is_builtin=False,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return TemplateResponse.model_validate(template)


def delete_template(db: Session, template_id: str) -> bool:
    """Delete a custom template (cannot delete built-in)."""
    template = db.query(Template).filter_by(id=template_id).first()
    if not template or template.is_builtin:
        return False
    db.delete(template)
    db.commit()
    return True
