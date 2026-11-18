// แพ็กเกจที่ขาย — แก้ตาม spec ของโปรเจกต์ (ย้ายไปตารางในฐานข้อมูลเมื่อมีหลังบ้านจัดการราคา)
export interface PackageItem {
  id: string;
  description: string;
  amountSatang: number;
}

export const PACKAGES: readonly PackageItem[] = [
  {
    "id": "annual-member",
    "description": "สมาชิกรายปี (ส่วนลด 10% ทุกบริการ)",
    "amountSatang": 150000
  },
  {
    "id": "massage-10",
    "description": "คอร์สนวดไทย 10 ครั้ง",
    "amountSatang": 390000
  },
  {
    "id": "deposit-booking",
    "description": "มัดจำจองคิว",
    "amountSatang": 30000
  }
];

export async function findPackage(packageId: string): Promise<PackageItem | null> {
  return PACKAGES.find((p) => p.id === packageId) ?? null;
}
