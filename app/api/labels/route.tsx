import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth/dal";
import { buildLabels, parseLabelOptions } from "@/lib/labels/label-data";
import { LabelDocument } from "@/lib/labels/label-document";
import { getLabelSettings, getLabelSource, parseTarget } from "@/lib/labels/source";

/** PDF de etiquetas (§5.6): ?solicitud=<id> | ?destinatario=<id> + opciones de la pantalla. */
export async function GET(request: Request) {
  await requireUser();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const target = parseTarget(params);
  if (!target) return new Response("Falta la solicitud o el destinatario.", { status: 400 });

  const [source, settings] = await Promise.all([getLabelSource(target), getLabelSettings()]);
  if (!source) return new Response("No encontrado.", { status: 404 });

  const options = parseLabelOptions(params);
  const labels = buildLabels(source, settings.sender, options);
  const qrImages: Record<string, string> = {};
  if (source.qr) {
    qrImages[source.qr] = await QRCode.toDataURL(source.qr, { margin: 0, width: 256, errorCorrectionLevel: "M" });
  }

  const pdf = await renderToBuffer(
    <LabelDocument
      labels={labels}
      format={options.formato}
      start={options.inicio}
      offsets={settings.offsets}
      borders={options.bordes === "1"}
      qrImages={qrImages}
      title={`Etiquetas · ${source.title}`}
    />,
  );

  const name = `etiquetas-${(source.ref ?? source.title).replace(/[^\w-]+/g, "-").toLowerCase()}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${params.descargar === "1" ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
