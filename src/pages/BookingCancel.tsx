import { useSearchParams, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

const BookingCancel = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <>
      <Helmet>
        <title>Zahlung abgebrochen | PADEL2GO</title>
        <meta name="description" content="Die Zahlung wurde abgebrochen." />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                    <XCircle className="w-10 h-10 text-amber-500" />
                  </div>

                  <h1 className="text-2xl font-bold mb-2">Zahlung abgebrochen</h1>
                  <p className="text-muted-foreground mb-8">
                    Die Zahlung wurde abgebrochen. Deine Reservierung wird noch kurze Zeit gehalten – 
                    du kannst es erneut versuchen.
                  </p>

                  <div className="space-y-3">
                    {bookingId && (
                      <Button variant="lime" size="lg" className="w-full" asChild>
                        <NavLink to={`/booking/checkout?booking_id=${bookingId}`}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Erneut versuchen
                        </NavLink>
                      </Button>
                    )}

                    <Button variant="outline" className="w-full" asChild>
                      <NavLink to="/booking">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück zur Buchungsseite
                      </NavLink>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BookingCancel;
