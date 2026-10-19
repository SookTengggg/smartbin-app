// Settings used by the ESG report.
//
// The backend has no company or ESG settings yet, so they are written here for now.
// Only put settings and facts about how SmartBin works in this file, never waste figures:
// every number in the report must come from the backend.
// When the backend gets a settings API, replace this file with a call to it.

// The ESG report is hidden for now: SmartBin can only supply a small part of an ESG disclosure.
// The cost analysis report carries a short ESG note instead. Set to true to show the ESG report again.
export const SHOW_ESG_REPORT = false

export const ESG_CONFIG = {
  company: 'Restoran Contoh Sdn Bhd',

  // Every kitchen the company runs, with or without a SmartBin. Coverage is shown as "1 of N".
  kitchensTotal: 1,
  bins: [{ site: 'Main Kitchen', code: 'BIN-01' }],

  // Month the company's financial year starts (1 = January, 7 = July).
  fyStartMonth: 1,

  // Where this kitchen's food waste goes: 'landfill', 'compost', 'animal_feed', 'donation',
  // or null when it is not recorded (the report then assumes landfill and says so).
  disposalRoute: null,

  // Emission factor used by the backend (routers/disposal.py multiplies kg by 0.7).
  factor: {
    value: 0.7,
    unit: 'kg CO2e per kg',
    version: 'DESNZ 2026',
    source: 'UK Department for Energy Security and Net Zero, Greenhouse gas reporting: conversion factors 2026, food and drink waste sent to landfill',
    country: 'UK',
  },

  // What counts as food waste. These must match what the backend really does.
  metric: {
    excludeNonFood: false, // the backend does not subtract the non_food category yet
    includeInedible: true, // bones, peels
    includeLiquids: true, // soup, curry, sauce
    includePending: false, // records waiting for manual review are left out
  },

  // Scale in the bin. null means not recorded yet: the report shows "To confirm".
  device: {
    model: 'HX711 module with a 5 kg load cell',
    accuracy: null,
    lastCalibrated: null,
  },

  ai: {
    model: 'YOLOv11s-seg (smartbin-yolov11s-seg-v1.2)',
    categories: 13,
    reviewThreshold: 0.55,
    densityTable: 'v1.0, team estimate',
  },

  assurance: 'none', // 'none' until a third party checks the data

  // Bursa Malaysia codes (common sustainability matter C10, waste) next to the metrics and in the
  // disclosure index. Only listed companies report to Bursa, so this is off by default.
  showBursa: false,
}

export const ROUTES = {
  landfill: { label: 'Landfill', diverted: false },
  compost: { label: 'Composting', diverted: true },
  animal_feed: { label: 'Animal feed', diverted: true },
  donation: { label: 'Donation', diverted: true },
}
