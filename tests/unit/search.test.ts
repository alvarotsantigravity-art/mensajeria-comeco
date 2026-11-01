import { describe, expect, it } from "vitest";
import { normalizeQuery, parseExtraction, type Extraction } from "@/lib/search/schema";
import { hasContactData, verifyExtraction } from "@/lib/search/verify";

const pages = [
  {
    url: "https://www.ejemplo.es/contacto",
    content: "Notaría Ejemplo. Calle Mayor 1, 28013 Madrid. Tel. 912 345 678. info@ejemplo.es",
  },
  { url: "https://directorio.com/notaria-ejemplo", content: "Notaría Ejemplo en Madrid, horario de 9 a 14." },
];

const candidate = (over: Partial<Extraction["candidates"][number]> = {}): Extraction["candidates"][number] => ({
  label: "Sede central",
  address: "Calle Mayor 1",
  postalCode: "28013",
  city: "Madrid",
  province: "Madrid",
  country: "España",
  phone: "+34 912 345 678",
  email: "info@ejemplo.es",
  contactPerson: null,
  website: "https://www.ejemplo.es",
  sources: [{ field: "address", url: "https://www.ejemplo.es/contacto/" }],
  confidence: "alta",
  ...over,
});

describe("normalizeQuery", () => {
  it("ignora tildes, mayúsculas, signos y espacios", () => {
    expect(normalizeQuery("  Clínica  San Rafael, MADRID! ")).toBe("clinica san rafael madrid");
    expect(normalizeQuery("Clinica san rafael madrid")).toBe(normalizeQuery("CLÍNICA SAN RAFAEL — Madrid"));
  });
});

describe("parseExtraction", () => {
  it("acepta JSON envuelto en un bloque de código y limpia vacíos", () => {
    const raw = "```json\n" + JSON.stringify({ companyName: "X", candidates: [{ label: "A", address: "  ", city: "Bilbao", sources: [], confidence: "alta" }], summary: "Hola [1]." }) + "\n```";
    const data = parseExtraction(raw);
    expect(data.candidates[0].address).toBeNull();
    expect(data.candidates[0].phone).toBeNull();
    expect(data.candidates[0].city).toBe("Bilbao");
  });

  it("corrige una confianza desconocida a baja y rechaza JSON sin empresa", () => {
    const data = parseExtraction(JSON.stringify({ companyName: "X", candidates: [{ label: "A", confidence: "segura", sources: [] }], summary: "" }));
    expect(data.candidates[0].confidence).toBe("baja");
    expect(() => parseExtraction(JSON.stringify({ candidates: [] }))).toThrow();
    expect(() => parseExtraction("no es json")).toThrow();
  });
});

describe("verifyExtraction", () => {
  it("conserva los datos que aparecen en los resultados", () => {
    const out = verifyExtraction({ companyName: "Notaría Ejemplo", candidates: [candidate()], summary: "Está en Madrid [1]." }, pages);
    expect(out.candidates[0]).toMatchObject({ phone: "+34 912 345 678", postalCode: "28013", email: "info@ejemplo.es" });
    expect(out.candidates[0].sources).toHaveLength(1);
  });

  it("descarta teléfonos, CP y emails inventados, y fuentes no consultadas", () => {
    const out = verifyExtraction(
      {
        companyName: "Notaría Ejemplo",
        candidates: [candidate({ phone: "915 000 000", postalCode: "28001", email: "otro@ejemplo.es", sources: [{ field: "phone", url: "https://inventada.com" }] })],
        summary: "Ver [1] y [7].",
      },
      pages,
    );
    expect(out.candidates[0]).toMatchObject({ phone: null, postalCode: null, email: null, sources: [] });
    expect(out.summary).toBe("Ver [1] y .");
  });

  it("quita las sedes sin ningún dato útil", () => {
    const empty = candidate({ address: null, postalCode: null, phone: null, city: null });
    expect(verifyExtraction({ companyName: "X", candidates: [empty], summary: "" }, pages).candidates).toHaveLength(0);
  });
});

describe("hasContactData", () => {
  it("detecta CP o teléfono en los fragmentos", () => {
    expect(hasContactData(pages)).toBe(true);
    expect(hasContactData([pages[1]])).toBe(false);
  });
});
