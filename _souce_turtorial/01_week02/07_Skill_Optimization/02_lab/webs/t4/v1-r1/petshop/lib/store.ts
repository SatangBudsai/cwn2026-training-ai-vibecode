import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PRODUCTS, seedStock, withStock, type Pet, type Product } from "./products";
import type { ShippingMethod } from "./pricing";

export type UserPet = Pet | "both";

export interface User {
  id: number;
  name: string;
  email: string;
  pet: UserPet;
  passwordHash: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  pet: UserPet;
}

export interface OrderItem {
  slug: string;
  name: string;
  size: string;
  price: number;
  qty: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  userId: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: string | null;
  shippingMethod: ShippingMethod;
  payment: "cod" | "promptpay";
  address: { name: string; phone: string; address: string; province: string; postcode: string };
  status: "received";
  createdAt: string;
}

interface Store {
  users: User[];
  sessions: Map<string, number>;
  orders: Order[];
  stock: Record<string, number>;
  nextUserId: number;
  nextOrderNo: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// The demo password hash is computed once per process and reused on every reset.
let demoHash: string | null = null;

function seed(): Store {
  demoHash ??= hashPassword("Paw12345");
  return {
    users: [
      {
        id: 1,
        name: "สมใจ ใจดี",
        email: "demo@pawpantry.test",
        pet: "cat",
        passwordHash: demoHash,
      },
    ],
    sessions: new Map(),
    orders: [],
    stock: seedStock(),
    nextUserId: 2,
    nextOrderNo: 100001,
  };
}

const g = globalThis as unknown as { __pawpantryStore?: Store };

export function db(): Store {
  g.__pawpantryStore ??= seed();
  return g.__pawpantryStore;
}

export function resetStore(): void {
  g.__pawpantryStore = seed();
}

export function toPublicUser(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email, pet: u.pet };
}

export function findUserByEmail(email: string): User | undefined {
  const e = email.trim().toLowerCase();
  return db().users.find((u) => u.email.toLowerCase() === e);
}

export function createUser(input: { name: string; email: string; password: string; pet: UserPet }): User {
  const store = db();
  const user: User = {
    id: store.nextUserId++,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    pet: input.pet,
    passwordHash: hashPassword(input.password),
  };
  store.users.push(user);
  return user;
}

export function createSession(userId: number): string {
  const token = randomBytes(24).toString("hex");
  db().sessions.set(token, userId);
  return token;
}

export function deleteSession(token: string | undefined): void {
  if (token) db().sessions.delete(token);
}

export function userForSession(token: string | undefined): User | undefined {
  if (!token) return undefined;
  const id = db().sessions.get(token);
  if (id === undefined) return undefined;
  return db().users.find((u) => u.id === id);
}

export function liveProducts(): Product[] {
  const stock = db().stock;
  return PRODUCTS.map((p) => withStock(p, stock));
}

export function liveStock(): Record<string, number> {
  return { ...db().stock };
}

export function nextOrderId(): string {
  return `PP-${db().nextOrderNo++}`;
}
