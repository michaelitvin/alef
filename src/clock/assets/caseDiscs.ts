import type { ClockKind } from '../logic/workday'

/**
 * Where the round cream face disc sits inside each generated case image, as fractions:
 * cx and r of the image width, cy of the image height.
 * Measured from the exported case-*.webp: threshold the warm near-white (#fff8e7-ish) pixels,
 * label connected regions, keep the largest nearly-square, nearly-circular one (fill > 0.7 of its
 * bounding circle; this skips the grandfather case's cream rectangle), then take the centre of its
 * bounding box and r = sqrt(area / pi) / width. aspect = image height / width (the art fills its image,
 * so the image box is the case's full extent; layout reserves it so a case never covers other UI).
 */
export const CASE_DISCS: Partial<Record<ClockKind, { cx: number; cy: number; r: number; aspect: number }>> = {
  alarm: { aspect: 1.0756, cx: 0.5007, cy: 0.5039, r: 0.3883 },
  cuckoo: { aspect: 1.3569, cx: 0.5009, cy: 0.4805, r: 0.2048 },
  grandfather: { aspect: 1.7336, cx: 0.5011, cy: 0.3184, r: 0.3089 },
  pocket: { aspect: 1.2908, cx: 0.5, cy: 0.6146, r: 0.3688 },
  station: { aspect: 1.0039, cx: 0.4176, cy: 0.5755, r: 0.3207 },
  tower: { aspect: 1.024, cx: 0.5, cy: 0.5977, r: 0.2974 },
  wall: { aspect: 0.9362, cx: 0.4655, cy: 0.5, r: 0.3547 },
  wrist: { aspect: 1.6271, cx: 0.5011, cy: 0.5007, r: 0.3652 },
}
