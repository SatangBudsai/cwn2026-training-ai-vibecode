// แพ็กเกจที่ขาย — แก้ตาม spec ของโปรเจกต์ (ย้ายไปตารางในฐานข้อมูลเมื่อมีหลังบ้านจัดการราคา)
export interface PackageItem {
  id: string;
  description: string;
  amountSatang: number;
}

export const PACKAGES: readonly PackageItem[] = __PACKAGES__;

export async function findPackage(packageId: string): Promise<PackageItem | null> {
  return PACKAGES.find((p) => p.id === packageId) ?? null;
}
