// Latin learning text (the English path's letters and words, in Andika) shows each letter on its own: Andika's `liga`
// joins ff, fi, fl, ffi and ffl into one glyph, and a child who learns the letters must see two f's in "off".
// Only for Latin text: Hebrew's marks are placed by the font's other features, which stay on.

/** the style that turns ligatures off (for React's `style`; CSS: font-variant-ligatures none, and the features off) */
export const LATIN_TEXT = { fontVariantLigatures: 'none', fontFeatureSettings: '"liga" 0, "clig" 0' } as const
