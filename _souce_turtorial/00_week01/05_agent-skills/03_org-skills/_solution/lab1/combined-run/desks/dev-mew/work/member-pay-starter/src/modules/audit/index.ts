export { createAuditService, type AuditService } from "./service";
export { createInMemoryAuditRepository, type AuditEntryRecord } from "./repository";
export type { RecordActionInput } from "./schema";
export { InvalidAuditEntryError } from "./errors";

/** สิ่งที่โมดูลอื่นต้องใช้จาก audit (ส่งเข้าไปเป็น dependency) */
export type AuditRecorder = Pick<import("./service").AuditService, "recordAction">;
