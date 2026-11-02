import "server-only";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatQuantity, noteDate, NOTE_COPIES, plural, type NoteHeader, type NoteValues } from "./note";

// PDF A4 del albarán, calcado de docs/ALBARAN COMECO.pdf (sin logotipo).
// Una página por copia, cada una con su casilla marcada.

const INK = "#111114";
const LINE = "#3a3a40";
const GREY = "#d4d4d8";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: INK, paddingTop: "12mm", paddingHorizontal: "12mm", paddingBottom: "12mm" },
  box: { borderWidth: 0.8, borderColor: LINE },
  row: { flexDirection: "row" },
  cell: { padding: "2.5mm" },
  divider: { borderRightWidth: 0.8, borderRightColor: LINE },
  topLine: { borderTopWidth: 0.8, borderTopColor: LINE },
  bold: { fontFamily: "Helvetica-Bold" },
  small: { fontSize: 7.5 },
  check: { width: 9, height: 9, borderWidth: 0.8, borderColor: INK, marginRight: 5, alignItems: "center", justifyContent: "center" },
});

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <View style={[s.row, { alignItems: "center", marginBottom: 6 }]}>
      {/* Casilla marcada: cuadro relleno (más fiable en PDF que una X de texto). */}
      <View style={s.check}>{on ? <View style={{ width: 5.5, height: 5.5, backgroundColor: INK }} /> : null}</View>
      <Text style={{ fontSize: 10.5 }}>{label}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ fontSize: 10.5, marginBottom: 2 }}>
      <Text style={s.bold}>{label} </Text>
      {value}
    </Text>
  );
}

function NotePage({ copy, header, v }: { copy: number; header: NoteHeader; v: NoteValues }) {
  const legal = header.legal;
  const perPackageLabel = v.unit === "ej." ? "Ejemplares x paquete:" : v.unit === "kg" ? "Kg x paquete:" : "Cajas x paquete:";
  const perPackage = v.unit === "ej." ? plural(v.units_per_package, "ejemplar") : v.units_per_package ? `${v.units_per_package} ${v.unit}` : "";

  return (
    <Page size="A4" style={s.page}>
      {/* Cabecera: empresa · copias · título */}
      <View style={[s.box, s.row, { height: "40mm" }]}>
        <View style={[s.cell, s.divider, { width: "42%", justifyContent: "flex-end" }]}>
          <Text style={[s.bold, { fontSize: 12, marginBottom: 4 }]}>{legal.name}</Text>
          <Text style={s.small}>{legal.address}</Text>
          <Text style={s.small}>N.I.F. {legal.taxId}</Text>
        </View>
        <View style={[s.cell, s.divider, { width: "30%", justifyContent: "center" }]}>
          {NOTE_COPIES.map((label, i) => (
            <Check key={label} on={i === copy} label={label} />
          ))}
        </View>
        <View style={[s.cell, { width: "28%", justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ fontSize: 22 }}>ALBARÁN</Text>
          <Text style={{ fontSize: 22 }}>ENTREGA</Text>
        </View>
      </View>

      {/* Orden, número y fecha */}
      <View style={[s.box, s.row, { borderTopWidth: 0 }]}>
        <View style={[s.cell, s.divider, { width: "42%" }]}>
          <Text style={{ fontSize: 10 }}>Nº Orden: {v.order_number}</Text>
        </View>
        <View style={[s.cell, { width: "58%" }]}>
          <Text style={{ fontSize: 9.5 }}>
            Nº Albarán: {header.ref} - <Text style={s.bold}>Fecha de Entrega:</Text> {v.delivery_date ? noteDate(v.delivery_date) : ""}
          </Text>
        </View>
      </View>

      {/* Origen y dirección de entrega */}
      <View style={[s.box, s.row, { borderTopWidth: 0, height: "56mm" }]}>
        <View style={[s.cell, s.divider, { width: "50%" }]}>
          <Text style={{ fontSize: 10 }}>ORIGEN: {v.origin}</Text>
          <Text style={{ fontSize: 10 }}>Modo Transporte: {v.transport_mode}</Text>
          <Text style={{ fontSize: 10 }}>Comentario: {v.comment}</Text>
        </View>
        <View style={[s.cell, { width: "50%", justifyContent: "space-between" }]}>
          <View>
            <Text style={{ fontSize: 10, marginBottom: 6 }}>Dirección de entrega:</Text>
            <Text style={{ fontSize: 11 }}>{header.address.company}</Text>
          </View>
          <Text style={{ fontSize: 11 }}>{header.address.address}</Text>
          <Text style={{ fontSize: 11 }}>{header.address.place}</Text>
        </View>
      </View>

      {/* Cantidad y concepto */}
      <View style={[s.box, s.row, { marginTop: "14mm", backgroundColor: GREY }]}>
        <View style={[s.cell, s.divider, { width: "18%", alignItems: "center" }]}>
          <Text style={[s.bold, { fontSize: 8.5, textAlign: "center" }]}>CANTIDAD{"\n"}ENTREGADA</Text>
        </View>
        <View style={[s.cell, { width: "82%", alignItems: "center", justifyContent: "center" }]}>
          <Text style={[s.bold, { fontSize: 9.5 }]}>CONCEPTO</Text>
        </View>
      </View>
      <View style={[s.row, { alignItems: "baseline", paddingHorizontal: "8mm", paddingVertical: "4mm" }]}>
        <Text style={{ fontSize: 16 }}>{formatQuantity(v.quantity)}</Text>
        <Text style={{ fontSize: 9, marginLeft: 3, marginRight: 12 }}>{v.quantity ? v.unit : ""}</Text>
        <Text style={{ fontSize: 12 }}>{v.concept}</Text>
      </View>
      <View style={[s.topLine, { marginTop: "6mm", paddingTop: "6mm", paddingHorizontal: "12mm" }]}>
        <Detail label={perPackageLabel} value={perPackage} />
        <Detail label="Cantidad de paquetes:" value={plural(v.packages, "paquete")} />
        <Detail label="Paquetes x palé:" value={plural(v.packages_per_pallet, "paquete")} />
        <View style={{ height: 8 }} />
        <Detail label="Nº palés:" value={plural(v.pallets, "palé")} />
      </View>

      {/* Recibí + residuos */}
      <View style={[s.box, s.row, { marginTop: "8mm", minHeight: "38mm" }]}>
        <View style={[s.cell, s.divider, { width: "50%", justifyContent: "space-between" }]}>
          <View style={s.row}>
            <Text style={[s.bold, { fontSize: 10, width: "30%" }]}>Recibí:</Text>
            <Text style={[s.bold, { fontSize: 10 }]}>Firma y sello:</Text>
          </View>
          <Text style={s.small}>Generado: {header.generated}</Text>
        </View>
        <View style={[s.cell, { width: "50%" }]}>
          <Text style={{ fontSize: 7, textAlign: "justify", lineHeight: 1.3 }}>{legal.waste}</Text>
        </View>
      </View>
      <View style={{ marginTop: 3 }}>
        {legal.footer
          .split("\n")
          .filter(Boolean)
          .map((line, i) => (
            <Text key={i} style={{ fontSize: 7 }}>
              {line}
            </Text>
          ))}
      </View>
    </Page>
  );
}

export function DeliveryNoteDocument({ header, values }: { header: NoteHeader; values: NoteValues }) {
  return (
    <Document title={`Albarán ${header.ref}`} author={header.legal.name} creator="Mensajería · Comeco Gráfico">
      {NOTE_COPIES.map((label, i) => (
        <NotePage key={label} copy={i} header={header} v={values} />
      ))}
    </Document>
  );
}
