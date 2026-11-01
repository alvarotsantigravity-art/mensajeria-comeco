// Fechas en hora de Madrid para tablas y exportaciones.
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** dd/mm/aaaa de un timestamp ISO; "—" si no hay. */
export const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : "—");
