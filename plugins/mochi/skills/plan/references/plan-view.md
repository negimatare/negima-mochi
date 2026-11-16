# The plan view

`.plans/<date>-<slug>.html` shows the plan's data flow as a diagram and, when the
change touches the frontend, its screens before and after. The plan skill's
step 5 renders it with this skill's `scripts/plan-view.mjs`, from two files:

- the plan's `## Data flow` section, whose numbered steps appear under the
  diagram; and
- `.plans/<date>-<slug>.view.json`, which says what the diagram and the screens
  contain.

You decide the content and where each card sits on a grid. The script draws
everything, so every plan's view looks the same. Do not write or edit the
HTML yourself.

## The diagram

```json
{
  "flow": {
    "note": "Optional line above the diagram.",
    "groups": [
      { "id": "web", "label": "Web app", "tone": "blue" },
      { "id": "api", "label": "Orders API", "tone": "green" }
    ],
    "nodes": [
      { "id": "page", "group": "web", "col": 0, "row": 0, "title": "Orders page", "lines": ["Export button · slice 2"] },
      { "id": "csv", "group": "api", "col": 1, "row": 0, "title": "CSV handler", "code": "GET /orders.csv?month=", "lines": ["slice 1"] },
      { "id": "billing", "group": "api", "col": 1, "row": 1, "title": "billableOrders", "lines": ["src/billing/statement.ts:9 · reused"] },
      { "id": "finance", "col": 2, "row": 0, "title": "Finance spreadsheet", "lines": ["Not in this plan"], "outside": true }
    ],
    "edges": [
      { "from": "page", "to": "csv", "label": "download" },
      { "from": "csv", "to": "billing", "label": "month" },
      { "from": "csv", "to": "finance", "label": "CSV file", "outside": true }
    ]
  }
}
```

- **Groups** are systems or deployables: an app, a service, a database
  server. `tone` is `blue`, `green`, `orange`, `red`, or `grey`; give each
  group its own tone. A node with no group stands alone.
- **Nodes** are the components the flow passes through. `title` names the
  component; `code` is an endpoint, a function, or a table, shown in
  monospace; each entry in `lines` is a short fact: what the plan does to it,
  the slice, the existing code it reuses. Keep each line under about 40
  characters.
- **Place nodes on a grid** with `col` and `row`, from 0. Data mostly flows
  left to right and top to bottom. A group's nodes take a block of cells no
  other group uses. An arrow runs between neighbouring cells, or bends once
  through the gap between columns; it cannot pass through another node.
- **Mark what is outside the plan** with `"outside": true`: an existing
  consumer, a separate plan's work. It is drawn dashed and grey.
- **Edges** are labelled with what travels along them, in one or two words.
  For a request and its response, add both edges; they are drawn as a pair.

Draw only what the change touches and what it talks to: usually 3 to 8 nodes.

## The screens

When the change touches the frontend, add one screen per screen it changes,
at most four:

```json
{
  "mocks": {
    "css": "/* source: src/styles/tokens.css */ :host { --color-brand: #0F6CBD; } ...",
    "screens": [
      {
        "title": "Orders page",
        "before": { "caption": "Today: no export", "html": "<div class=\"toolbar\">...</div>" },
        "after": { "caption": "Export button, month picker open", "html": "<div class=\"toolbar\">...</div>" },
        "components": "Toolbar · Button `appearance=\"primary\"` · DatePicker"
      }
    ]
  }
}
```

- **Copy the product's look, do not invent one.** Use the product's real
  class names and design tokens. Copy each token definition you need into
  `mocks.css`, with a `/* source: <path> */` comment naming the file it came
  from. Declare tokens on `:host`: each screen renders in its own shadow root,
  so the page's styles do not reach it and `mocks.css` does not leak out.
- **`before` is the screen today; `after` is the screen with the change.** A
  new screen has only `after`. Show the state the change is about, such as an
  open menu or an error, not a blank default; add a screen for an empty or
  error state the Acceptance scenarios name.
- **Static HTML only**: no `<script>` and no external URLs. The view must
  open with no network and no access to the product repository.
- `components` names the product components the screen uses, so whoever
  builds it knows what to reuse.
