---
type: C4 System
title: NSE / BSE
status: stable
groma:
  id: nse-bse
description: Provides OHLCV market data, option bhavcopy, and instrument lists for Nifty 50 and F&O
---

National Stock Exchange and BSE data sources. RITA fetches daily OHLCV bars, option chain bhavcopy files, and instrument lists used for model training, backtesting, and live signal generation. Access is via the nse_api core module and periodic data refresh jobs.
