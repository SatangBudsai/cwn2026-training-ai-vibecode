// อ่านค่า environment ตอนรันเท่านั้น · ห้ามใช้ NEXT_PUBLIC_
export function isTestMode(): boolean {
  return process.env.ALLOW_TEST_RESET === '1';
}

/** FR-76, D-26 */
export function isSkinPreviewEnabled(): boolean {
  return process.env.FEATURE_SKIN_PREVIEW === '1';
}

export function runtimeProfile(): '0' | '1' {
  return process.env.BUG_MODE === '1' ? '1' : '0';
}
