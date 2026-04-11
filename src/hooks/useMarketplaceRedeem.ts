import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShippingAddress {
  address_line1: string;
  postal_code: string;
  city: string;
  country: string;
}

interface RedeemParams {
  itemId: string;
  itemName: string;
  creditCost: number;
  shippingAddress?: ShippingAddress;
}

interface RedeemResponse {
  success: boolean;
  referenceCode: string;
  newBalance: number;
  message: string;
  productType: "rental" | "purchase";
}

export const useMarketplaceRedeem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, shippingAddress }: RedeemParams): Promise<RedeemResponse> => {
      const { data, error } = await supabase.functions.invoke("marketplace-redeem", {
        body: { itemId, shippingAddress },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      const description = data.productType === "purchase"
        ? `Referenz: ${data.referenceCode}. Du wirst per E-Mail benachrichtigt, wenn dein Paket versendet wird.`
        : data.referenceCode 
          ? `Referenz: ${data.referenceCode}` 
          : "Dein Guthaben wurde aktualisiert.";

      toast.success(`${variables.itemName} erfolgreich eingelöst!`, {
        description,
      });
      
      // Invalidate wallet and redemptions queries
      queryClient.invalidateQueries({ queryKey: ["account-data"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-redemptions"] });
    },
    onError: (error: Error) => {
      toast.error("Einlösung fehlgeschlagen", {
        description: error.message || "Bitte versuche es später erneut.",
      });
    },
  });
};
