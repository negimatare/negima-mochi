---
type: regex
pattern: 'HTTPException|JSONResponse'
match: not_contains
target:
  source: file
  path: app/shipping/dispatch_shipment/handler.py
---
