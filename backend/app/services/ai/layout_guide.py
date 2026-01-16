"""Layout CSS classes and HTML patterns for Marp slides."""

LAYOUT_CLASSES = {
    "columns-2": {
        "name": "Two Columns",
        "icon": "columns",
        "description": "Equal width two-column layout",
        "html": '<div class="columns-2">\n<div>\n\n**Left Column**\n- Point 1\n- Point 2\n\n</div>\n<div>\n\n**Right Column**\n- Point 3\n- Point 4\n\n</div>\n</div>',
    },
    "columns-3": {
        "name": "Three Columns",
        "icon": "layout-grid",
        "description": "Equal width three-column layout",
        "html": '<div class="columns-3">\n<div>\n\n**First**\n- Item\n\n</div>\n<div>\n\n**Second**\n- Item\n\n</div>\n<div>\n\n**Third**\n- Item\n\n</div>\n</div>',
    },
    "columns-2-wide-left": {
        "name": "Wide Left",
        "icon": "panel-left",
        "description": "Two columns with wider left (2:1)",
        "html": '<div class="columns-2-wide-left">\n<div>\n\n**Main Content**\nLarger content area for main points.\n\n</div>\n<div>\n\n**Sidebar**\n- Extra info\n\n</div>\n</div>',
    },
    "columns-2-wide-right": {
        "name": "Wide Right",
        "icon": "panel-right",
        "description": "Two columns with wider right (1:2)",
        "html": '<div class="columns-2-wide-right">\n<div>\n\n**Sidebar**\n- Quick notes\n\n</div>\n<div>\n\n**Main Content**\nLarger content area on the right.\n\n</div>\n</div>',
    },
    "split": {
        "name": "Split View",
        "icon": "separator-vertical",
        "description": "50/50 split with vertical divider",
        "html": '<div class="split">\n<div>\n\n**Before**\nContent on left\n\n</div>\n<div>\n\n**After**\nContent on right\n\n</div>\n</div>',
    },
    "center": {
        "name": "Centered",
        "icon": "align-center",
        "description": "Content centered on slide",
        "html": '<div class="center">\n\n# Big Idea\n\nA focused, centered message.\n\n</div>',
    },
    "feature-grid": {
        "name": "Feature Grid",
        "icon": "layout-grid",
        "description": "2x2 grid for features or concepts",
        "html": '<div class="feature-grid">\n<div class="feature">\n<span class="icon">🚀</span>\n\n**Feature 1**\nDescription\n\n</div>\n<div class="feature">\n<span class="icon">💡</span>\n\n**Feature 2**\nDescription\n\n</div>\n<div class="feature">\n<span class="icon">⚡</span>\n\n**Feature 3**\nDescription\n\n</div>\n<div class="feature">\n<span class="icon">🎯</span>\n\n**Feature 4**\nDescription\n\n</div>\n</div>',
    },
    "pros-cons": {
        "name": "Pros & Cons",
        "icon": "scale",
        "description": "Side-by-side comparison",
        "html": '<div class="pros-cons">\n<div class="pros">\n\n### ✓ Pros\n- Advantage 1\n- Advantage 2\n\n</div>\n<div class="cons">\n\n### ✗ Cons\n- Disadvantage 1\n- Disadvantage 2\n\n</div>\n</div>',
    },
    "timeline": {
        "name": "Timeline",
        "icon": "git-branch",
        "description": "Vertical timeline for steps or history",
        "html": '<div class="timeline">\n<div class="timeline-item">\n\n**Step 1**\nFirst milestone\n\n</div>\n<div class="timeline-item">\n\n**Step 2**\nSecond milestone\n\n</div>\n<div class="timeline-item">\n\n**Step 3**\nThird milestone\n\n</div>\n</div>',
    },
    "numbered-list": {
        "name": "Numbered Steps",
        "icon": "list-ordered",
        "description": "Numbered list with styled circles",
        "html": '<ul class="numbered-list">\n<li>First step or item</li>\n<li>Second step or item</li>\n<li>Third step or item</li>\n</ul>',
    },
    "check-list": {
        "name": "Checklist",
        "icon": "list-checks",
        "description": "List with checkmarks",
        "html": '<ul class="check-list">\n<li>Completed item</li>\n<li>Another done item</li>\n<li>Finished task</li>\n</ul>',
    },
    "icon-box": {
        "name": "Icon Boxes",
        "icon": "boxes",
        "description": "Boxes with icons/emoji headers",
        "html": '<div class="columns-2">\n<div class="icon-box">\n<span class="icon">🎯</span>\n<div>\n\n**Goal**\nDescription of the goal\n\n</div>\n</div>\n<div class="icon-box">\n<span class="icon">💡</span>\n<div>\n\n**Insight**\nKey insight here\n\n</div>\n</div>\n</div>',
    },
    "cards": {
        "name": "Cards",
        "icon": "square-stack",
        "description": "Content in card containers",
        "html": '<div class="columns-2">\n<div class="card">\n\n**Card Title**\nCard content here\n\n</div>\n<div class="card-primary">\n\n**Highlighted Card**\nImportant content\n\n</div>\n</div>',
    },
    "quote": {
        "name": "Quote Box",
        "icon": "quote",
        "description": "Styled quotation block",
        "html": '<div class="quote-box">\n\n"The best way to predict the future is to create it."\n\n— Peter Drucker\n\n</div>',
    },
    "comparison": {
        "name": "Comparison",
        "icon": "columns-2",
        "description": "Side-by-side comparison table",
        "html": '<div class="comparison">\n<div class="header">Option A</div>\n<div class="header">Option B</div>\n<div>\n\n- Feature 1\n- Feature 2\n\n</div>\n<div>\n\n- Alternative 1\n- Alternative 2\n\n</div>\n</div>',
    },
    "flow-horizontal": {
        "name": "Flow (Horizontal)",
        "icon": "arrow-right",
        "description": "Horizontal flow diagram with arrows",
        "html": '<div class="flow-horizontal">\n<div class="flow-item">Step 1</div>\n<div class="flow-item">Step 2</div>\n<div class="flow-item">Step 3</div>\n</div>',
    },
    "flow-vertical": {
        "name": "Flow (Vertical)",
        "icon": "arrow-down",
        "description": "Vertical flow diagram with arrows",
        "html": '<div class="flow-vertical">\n<div class="flow-item">Step 1</div>\n<div class="flow-item">Step 2</div>\n<div class="flow-item">Step 3</div>\n</div>',
    },
    "hierarchy": {
        "name": "Hierarchy",
        "icon": "git-branch",
        "description": "Top-down hierarchy tree",
        "html": '<div class="hierarchy">\n<div class="hierarchy-root">Main Topic</div>\n<div class="hierarchy-children">\n<div class="hierarchy-child">Sub-item A</div>\n<div class="hierarchy-child">Sub-item B</div>\n<div class="hierarchy-child">Sub-item C</div>\n</div>\n</div>',
    },
    "cycle": {
        "name": "Cycle",
        "icon": "refresh-cw",
        "description": "Circular cycle diagram",
        "html": '<div class="cycle">\n<div class="cycle-item">Phase 1</div>\n<div class="cycle-item">Phase 2</div>\n<div class="cycle-item">Phase 3</div>\n<div class="cycle-item">Phase 4</div>\n</div>',
    },
    "pyramid": {
        "name": "Pyramid",
        "icon": "triangle",
        "description": "Pyramid hierarchy (wide at base)",
        "html": '<div class="pyramid">\n<div class="pyramid-level pyramid-top">Top Priority</div>\n<div class="pyramid-level pyramid-mid">Medium Priority</div>\n<div class="pyramid-level pyramid-base">Foundation</div>\n</div>',
    },
    "stat-cards": {
        "name": "Stat Cards",
        "icon": "bar-chart",
        "description": "Key metrics in card format",
        "html": '<div class="stat-cards">\n<div class="stat-card">\n<div class="stat-value">95%</div>\n<div class="stat-label">Accuracy</div>\n</div>\n<div class="stat-card">\n<div class="stat-value">2.5x</div>\n<div class="stat-label">Faster</div>\n</div>\n<div class="stat-card">\n<div class="stat-value">$1M</div>\n<div class="stat-label">Saved</div>\n</div>\n</div>',
    },
}

CALLOUT_CLASSES = {
    "highlight": {
        "name": "Highlight",
        "icon": "highlighter",
        "description": "Yellow highlight box",
        "html": '<div class="highlight">\n\n**Key Point:** Important information here.\n\n</div>',
    },
    "info-box": {
        "name": "Info Box",
        "icon": "info",
        "description": "Blue information callout",
        "html": '<div class="info-box">\n\n**ℹ️ Note:** Additional context or tips.\n\n</div>',
    },
    "warning-box": {
        "name": "Warning",
        "icon": "alert-triangle",
        "description": "Amber warning callout",
        "html": '<div class="warning-box">\n\n**⚠️ Warning:** Be careful about this.\n\n</div>',
    },
    "success-box": {
        "name": "Success",
        "icon": "check-circle",
        "description": "Green success callout",
        "html": '<div class="success-box">\n\n**✓ Success:** This is the right approach.\n\n</div>',
    },
    "error-box": {
        "name": "Error",
        "icon": "x-circle",
        "description": "Red error/danger callout",
        "html": '<div class="error-box">\n\n**✗ Avoid:** Don\'t do this.\n\n</div>',
    },
}


def get_layout_prompt() -> str:
    """Generate layout guidance for AI content generation."""
    layouts = "\n".join([
        f"- `{k}`: {v['description']}"
        for k, v in LAYOUT_CLASSES.items()
    ])
    callouts = "\n".join([
        f"- `{k}`: {v['description']}"
        for k, v in CALLOUT_CLASSES.items()
    ])
    return f"""Available CSS layout classes (wrap content in <div class="...">):

LAYOUTS:
{layouts}

CALLOUTS:
{callouts}

Use HTML divs with these classes to create visually structured slides.
Example: <div class="columns-2"><div>Left</div><div>Right</div></div>"""


DIAGRAM_CLASSES = {
    "flow-horizontal": LAYOUT_CLASSES["flow-horizontal"],
    "flow-vertical": LAYOUT_CLASSES["flow-vertical"],
    "hierarchy": LAYOUT_CLASSES["hierarchy"],
    "cycle": LAYOUT_CLASSES["cycle"],
    "pyramid": LAYOUT_CLASSES["pyramid"],
    "stat-cards": LAYOUT_CLASSES["stat-cards"],
}


def get_all_layouts() -> dict:
    """Return all layouts, diagrams, and callouts for frontend."""
    return {
        "layouts": {k: v for k, v in LAYOUT_CLASSES.items() if k not in DIAGRAM_CLASSES},
        "diagrams": DIAGRAM_CLASSES,
        "callouts": CALLOUT_CLASSES,
    }
