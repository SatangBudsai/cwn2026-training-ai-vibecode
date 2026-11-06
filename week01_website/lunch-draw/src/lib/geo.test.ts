import { describe, expect, it } from "vitest";
import { parseLatLon } from "./geo";

describe("parseLatLon", () => {
  it("reads plain coordinates", () => {
    expect(parseLatLon("13.7243, 100.5251")).toEqual({ lat: 13.7243, lon: 100.5251 });
    expect(parseLatLon(" 13.7243 100.5251 ")).toEqual({ lat: 13.7243, lon: 100.5251 });
  });

  it("reads Google Maps links", () => {
    expect(parseLatLon("https://www.google.com/maps/@13.7243,100.5251,17z")).toEqual({ lat: 13.7243, lon: 100.5251 });
    expect(parseLatLon("https://maps.google.com/?q=13.7243,100.5251")).toEqual({ lat: 13.7243, lon: 100.5251 });
    expect(
      parseLatLon("https://www.google.com/maps/place/X/@13.70,100.50,17z/data=!3m1!4b1!4m6!3m5!3d13.7243!4d100.5251"),
    ).toEqual({ lat: 13.7243, lon: 100.5251 }); // the pin wins over the camera position
  });

  it("returns null when there is no location", () => {
    expect(parseLatLon("ร้านข้าวมันไก่")).toBeNull();
    expect(parseLatLon("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(parseLatLon("123.4, 500")).toBeNull();
  });
});
