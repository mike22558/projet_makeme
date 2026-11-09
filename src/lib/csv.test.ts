import { describe, expect, it } from "vitest";

import { versCsv } from "@/lib/csv";

describe("Export CSV", () => {
  it("commence par un BOM et sépare par des points-virgules", () => {
    expect(versCsv(["A", "B"], [["x", 1]])).toBe("﻿A;B\r\nx;1\r\n");
  });

  it("encadre les valeurs contenant un séparateur ou un guillemet", () => {
    expect(versCsv(["A"], [['Dit "oui"; ok']])).toContain('"Dit ""oui""; ok"');
  });

  it("neutralise une formule saisie dans un champ texte", () => {
    expect(versCsv(["A"], [["=HYPERLINK(1)"]])).toContain("'=HYPERLINK(1)");
  });

  it("conserve les montants négatifs numériques", () => {
    expect(versCsv(["A"], [[-500]])).toContain("-500");
  });
});
