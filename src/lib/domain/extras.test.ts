import { describe, expect, it } from "vitest";
import { neighbourProvinces, videoEmbedUrl } from "./extras";

describe("neighbourProvinces", () => {
  it("dà le province venete confinanti", () => {
    expect(neighbourProvinces("VE").sort()).toEqual(["PD", "RO", "TV"]);
    expect(neighbourProvinces("BL").sort()).toEqual(["TV", "VI"]);
  });

  it("è simmetrica: se A confina con B, B confina con A", () => {
    for (const code of ["VE", "PD", "TV", "VI", "VR", "BL", "RO"]) {
      for (const n of neighbourProvinces(code)) expect(neighbourProvinces(n)).toContain(code);
    }
  });

  it("nessuna provincia per una sigla sconosciuta", () => {
    expect(neighbourProvinces("XX")).toEqual([]);
  });
});

describe("videoEmbedUrl", () => {
  it("YouTube, anche con link corti, nella versione senza cookie", () => {
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("Vimeo", () => {
    expect(videoEmbedUrl("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
  });

  it("rifiuta tutto il resto", () => {
    expect(videoEmbedUrl("https://example.com/video.mp4")).toBeNull();
    expect(videoEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(videoEmbedUrl("non un link")).toBeNull();
  });
});
