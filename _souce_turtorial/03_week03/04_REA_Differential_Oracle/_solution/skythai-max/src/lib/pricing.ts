import { seatedPax, type Pax } from "./passengers";

/**
 * The captured fares are for 1 adult. For other passenger mixes this mock multiplies the fare by the
 * number of passengers that need a seat; lap infants are not charged in the mock (real fares differ).
 */
export function totalFor(pricePerSeat: number, pax: Pax): number {
  return pricePerSeat * seatedPax(pax);
}
