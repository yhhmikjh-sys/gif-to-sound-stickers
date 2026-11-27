export type Language = { slug: string; name: string; native: string; query: string };

// Indian languages shown on the dashboard; `query` is what we send to GIPHY.
export const LANGUAGES: Language[] = [
  { slug: "hindi", name: "Hindi", native: "हिन्दी", query: "hindi bollywood" },
  { slug: "telugu", name: "Telugu", native: "తెలుగు", query: "telugu tollywood" },
  { slug: "tamil", name: "Tamil", native: "தமிழ்", query: "tamil kollywood" },
  { slug: "bengali", name: "Bengali", native: "বাংলা", query: "bengali" },
  { slug: "marathi", name: "Marathi", native: "मराठी", query: "marathi" },
  { slug: "gujarati", name: "Gujarati", native: "ગુજરાતી", query: "gujarati" },
  { slug: "kannada", name: "Kannada", native: "ಕನ್ನಡ", query: "kannada" },
  { slug: "malayalam", name: "Malayalam", native: "മലയാളം", query: "malayalam" },
  { slug: "punjabi", name: "Punjabi", native: "ਪੰਜਾਬੀ", query: "punjabi" },
  { slug: "bhojpuri", name: "Bhojpuri", native: "भोजपुरी", query: "bhojpuri" },
  { slug: "odia", name: "Odia", native: "ଓଡ଼ିଆ", query: "odia" },
  { slug: "urdu", name: "Urdu", native: "اردو", query: "urdu pakistani" },
];

export const findLanguage = (slug: string) => LANGUAGES.find((l) => l.slug === slug);
