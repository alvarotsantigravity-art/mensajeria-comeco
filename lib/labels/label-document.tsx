import "server-only";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { cellSize, fontScale, planSheets, type LabelFormat, type LabelOffsets } from "./layouts";
import { recipientLines, senderLine, type LabelData } from "./label-data";

const INK = "#111114";
const MUTED = "#6B6B72";
const URGENT = "#D92D20";

const s = StyleSheet.create({
  page: { position: "relative", fontFamily: "Helvetica", color: INK },
  cell: { position: "absolute", overflow: "hidden" },
  outline: { borderWidth: 0.5, borderStyle: "dashed", borderColor: "#B8B8C0" },
});

/** PDF A4 con las etiquetas colocadas (§5.6). Los QR llegan ya como data URL. */
export function LabelDocument({
  labels,
  format,
  start,
  offsets,
  borders,
  qrImages,
  title,
}: {
  labels: LabelData[];
  format: LabelFormat;
  start: number;
  offsets: LabelOffsets;
  borders: boolean;
  qrImages: Record<string, string>;
  title: string;
}) {
  const size = cellSize(format);
  const cols = { "1": 1, "2": 1, "4": 2, "8": 2 }[format];
  const pages = planSheets(labels, format, start);

  return (
    <Document title={title} author="Mensajería · Comeco Gráfico" creator="Mensajería · Comeco Gráfico">
      {pages.map((slots, p) => (
        <Page key={p} size="A4" style={s.page}>
          {slots.map((label, i) => {
            const style = {
              top: `${(Math.floor(i / cols) * size.height + offsets.top).toFixed(2)}mm`,
              left: `${((i % cols) * size.width + offsets.left).toFixed(2)}mm`,
              width: `${size.width.toFixed(2)}mm`,
              height: `${size.height.toFixed(2)}mm`,
            };
            return (
              <View key={i} style={[s.cell, style, ...(borders ? [s.outline] : [])]}>
                {label ? <Label label={label} format={format} qr={label.qr ? qrImages[label.qr] : undefined} /> : null}
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}

function Label({ label, format, qr }: { label: LabelData; format: LabelFormat; qr?: string }) {
  const k = fontScale(format);
  const pt = (n: number) => n * k;
  const mm = (n: number) => `${(n * k).toFixed(2)}mm`;
  const r = label.recipient;

  return (
    <View style={{ flex: 1, padding: mm(5), flexDirection: "column" }}>
      {/* Remitente y distintivos */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: mm(2) }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: pt(5), color: MUTED, letterSpacing: 0.6 }}>REMITENTE</Text>
          <Text style={{ fontSize: pt(6), color: MUTED, marginTop: pt(1) }}>{senderLine(label.sender)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: mm(1.2) }}>
          <Check on={label.urgent} text="URGENTE" k={k} urgent />
          <Check on={label.fragile} text="FRÁGIL" k={k} />
          <Check on={label.documentation} text="DOCUMENTACIÓN" k={k} />
        </View>
      </View>

      {/* Destinatario, en grande */}
      <View style={{ marginTop: mm(3), flex: 1 }}>
        <Text style={{ fontSize: pt(5), color: MUTED, letterSpacing: 0.6 }}>DESTINATARIO</Text>
        <Text style={{ fontSize: pt(14), fontFamily: "Helvetica-Bold", marginTop: pt(1.5), lineHeight: 1.1, maxLines: 2, textOverflow: "ellipsis" }}>
          {r.company}
        </Text>
        {r.contact ? (
          <Text style={{ fontSize: pt(8.5), marginTop: pt(2), maxLines: 1, textOverflow: "ellipsis" }}>
            A la atención de: {r.contact}
          </Text>
        ) : null}
        {recipientLines(r).map((line, i) => (
          <Text key={i} style={{ fontSize: pt(10), marginTop: pt(i === 0 ? 2.5 : 1), fontFamily: i === 1 ? "Helvetica-Bold" : "Helvetica", maxLines: 2 }}>
            {line}
          </Text>
        ))}
        {r.phone ? <Text style={{ fontSize: pt(8.5), marginTop: pt(2) }}>Tel. {r.phone}</Text> : null}
      </View>

      {/* Referencia, bulto, observaciones y QR */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: mm(2) }}>
        <View style={{ flex: 1 }}>
          {label.notes ? (
            <Text style={{ fontSize: pt(7), marginBottom: pt(2), maxLines: 2, textOverflow: "ellipsis" }}>
              Obs.: {label.notes}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: mm(2) }}>
            {label.ref ? <Text style={{ fontSize: pt(7.5), fontFamily: "Courier-Bold" }}>{label.ref}</Text> : null}
            {label.date ? <Text style={{ fontSize: pt(7), fontFamily: "Courier", color: MUTED }}>{label.date}</Text> : null}
          </View>
        </View>
        {label.parcel ? (
          <Text style={{ fontSize: pt(11), fontFamily: "Helvetica-Bold" }}>
            Bulto {label.parcel.index}/{label.parcel.total}
          </Text>
        ) : null}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no admite alt */}
        {qr ? <Image src={qr} style={{ width: mm(15), height: mm(15) }} /> : null}
      </View>
    </View>
  );
}

function Check({ on, text, k, urgent = false }: { on: boolean; text: string; k: number; urgent?: boolean }) {
  const color = on && urgent ? URGENT : on ? INK : "#B8B8C0";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 1.5 * k }}>
      <View
        style={{
          width: 5.5 * k,
          height: 5.5 * k,
          borderWidth: 0.7,
          borderColor: color,
          backgroundColor: on ? color : undefined,
        }}
      />
      <Text style={{ fontSize: 5.5 * k, fontFamily: on ? "Helvetica-Bold" : "Helvetica", color }}>{text}</Text>
    </View>
  );
}
