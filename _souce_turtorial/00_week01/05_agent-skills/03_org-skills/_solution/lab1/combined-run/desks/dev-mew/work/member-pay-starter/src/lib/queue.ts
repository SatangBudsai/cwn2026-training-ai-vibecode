/**
 * คิวงานเบื้องหลัง: interface เดียวกับที่ adapter BullMQ ต้อง implement
 * โครงเริ่มต้นใช้ InMemoryJobQueue (dev/test) — production เปลี่ยนเป็น BullMQ ที่เชื่อมผ่าน src/lib/redis.ts
 */
export interface QueuedJob<TData> {
  name: string;
  data: TData;
  enqueuedAt: Date;
}

export interface JobQueue<TData> {
  add(name: string, data: TData): Promise<void>;
}

export class InMemoryJobQueue<TData> implements JobQueue<TData> {
  readonly jobs: QueuedJob<TData>[] = [];

  async add(name: string, data: TData): Promise<void> {
    this.jobs.push({ name, data, enqueuedAt: new Date() });
  }
}
