import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { noteFromParams } from "@/lib/delivery-notes/note";
import { DeliveryNoteDocument } from "@/lib/delivery-notes/note-document";
import { getDeliveryNote } from "@/lib/delivery-notes/source";

/**
 * PDF del albarán: ?solicitud=<id>. Los campos de la pantalla pueden venir en la URL
 * (así se imprime lo que se ve, aunque no se haya guardado); si no, el guardado.
 */
export async function GET(request: Request) {
  await requireUser();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const id = z.uuid().safeParse(params.solicitud);
  if (!id.success) return new Response("Falta la solicitud.", { status: 400 });

  const note = await getDeliveryNote(id.data);
  if (!note) return new Response("No encontrado.", { status: 404 });

  const values = noteFromParams(note.values, params);
  const pdf = await renderToBuffer(<DeliveryNoteDocument header={note.header} values={values} />);

  const name = `albaran-${note.header.ref.toLowerCase()}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${params.descargar === "1" ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
