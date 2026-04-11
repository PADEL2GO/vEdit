import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const playerReach = [
  { year: "Jahr 1", players: "24.600", bookings: "6.160", rackets: "8.620", balls: "2.150", nutrition: "12.300" },
  { year: "Jahr 2", players: "26.200", bookings: "6.550", rackets: "7.330", balls: "2.300", nutrition: "13.100" },
  { year: "Jahr 3", players: "27.500", bookings: "6.870", rackets: "5.770", balls: "2.400", nutrition: "13.740" },
];
const playerReachTotal = { year: "TOTAL", players: "78.300", bookings: "19.570", rackets: "21.720", balls: "6.850", nutrition: "39.140" };

const revenuePotential = [
  { year: "Jahr 1", impressions: "140.000", ordersQR: "25 Stk.", ordersSocial: "20 Stk.", revenue: "4.420 €" },
  { year: "Jahr 2", impressions: "340.000", ordersQR: "33 Stk.", ordersSocial: "48 Stk.", revenue: "8.080 €" },
  { year: "Jahr 3", impressions: "700.000", ordersQR: "42 Stk.", ordersSocial: "98 Stk.", revenue: "13.960 €" },
];
const revenueTotal = { year: "TOTAL", impressions: "1.180.000", ordersQR: "99 Stk.", ordersSocial: "165 Stk.", revenue: "26.460 €" };

export const PartnerTablesSection = () => (
  <section className="py-24 bg-card/30">
    <div className="container mx-auto px-4 space-y-20">
      {/* Table 1: Spieler-Reichweite */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto"
      >
        <h3 className="text-2xl md:text-3xl font-bold mb-2 text-center">
          Spieler-<span className="text-gradient-lime">Reichweite</span> (3-Jahres-Projektion)
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Basierend auf dem PADEL2GO Netzwerk mit 15+ Standorten
        </p>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Jahr</TableHead>
                <TableHead className="font-semibold text-right">Spieler</TableHead>
                <TableHead className="font-semibold text-right">Buchungen</TableHead>
                <TableHead className="font-semibold text-right">Schlägerbedarf</TableHead>
                <TableHead className="font-semibold text-right">Balldosen</TableHead>
                <TableHead className="font-semibold text-right">Nutrition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playerReach.map((row, i) => (
                <TableRow key={row.year} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <TableCell className="font-medium">{row.year}</TableCell>
                  <TableCell className="text-right">{row.players}</TableCell>
                  <TableCell className="text-right">{row.bookings}</TableCell>
                  <TableCell className="text-right">{row.rackets}</TableCell>
                  <TableCell className="text-right">{row.balls}</TableCell>
                  <TableCell className="text-right">{row.nutrition}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/30">
                <TableCell>{playerReachTotal.year}</TableCell>
                <TableCell className="text-right">{playerReachTotal.players}</TableCell>
                <TableCell className="text-right">{playerReachTotal.bookings}</TableCell>
                <TableCell className="text-right">{playerReachTotal.rackets}</TableCell>
                <TableCell className="text-right">{playerReachTotal.balls}</TableCell>
                <TableCell className="text-right">{playerReachTotal.nutrition}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Table 2: Umsatzpotenzial */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto"
      >
        <h3 className="text-2xl md:text-3xl font-bold mb-2 text-center">
          <span className="text-gradient-lime">Umsatzpotenzial</span> (3-Jahres-Projektion)
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Konservative Schätzung auf Basis aktueller Benchmarks
        </p>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Jahr</TableHead>
                <TableHead className="font-semibold text-right">Online Impressions</TableHead>
                <TableHead className="font-semibold text-right">Bestellungen QR</TableHead>
                <TableHead className="font-semibold text-right">Bestellungen Social</TableHead>
                <TableHead className="font-semibold text-right">Umsatzpotenzial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenuePotential.map((row, i) => (
                <TableRow key={row.year} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <TableCell className="font-medium">{row.year}</TableCell>
                  <TableCell className="text-right">{row.impressions}</TableCell>
                  <TableCell className="text-right">{row.ordersQR}</TableCell>
                  <TableCell className="text-right">{row.ordersSocial}</TableCell>
                  <TableCell className="text-right">{row.revenue}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/30">
                <TableCell>{revenueTotal.year}</TableCell>
                <TableCell className="text-right">{revenueTotal.impressions}</TableCell>
                <TableCell className="text-right">{revenueTotal.ordersQR}</TableCell>
                <TableCell className="text-right">{revenueTotal.ordersSocial}</TableCell>
                <TableCell className="text-right">{revenueTotal.revenue}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  </section>
);
