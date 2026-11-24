---
type: C4 System
title: Zerodha Kite
status: stable
groma:
  id: zerodha-kite
description: Provides live FnO margin requirements, lot sizes, and position data via the fno-margin-fetch middleware
---

Zerodha's Kite Connect API. RITA does not call it directly — access is brokered through the fno-margin-fetch middleware service running on port 8001. Provides live F&O margin requirements, NIFTY/BANKNIFTY lot sizes (authoritative source; never use static config), and open position data. Token persistence is managed by kite_login.py.
