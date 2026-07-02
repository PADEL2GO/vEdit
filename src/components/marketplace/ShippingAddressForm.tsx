import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ShippingAddress } from "@/hooks/useMarketplaceCheckout";

interface ShippingAddressFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

const COUNTRY_CODES = ["DE", "AT", "CH"];

export const ShippingAddressForm = ({ address, onChange, errors }: ShippingAddressFormProps) => {
  const { t } = useTranslation("p2g");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address_line1">{t("shippingAddressForm.street")}</Label>
        <Input
          id="address_line1"
          value={address.address_line1}
          onChange={(e) => onChange({ ...address, address_line1: e.target.value })}
          placeholder={t("shippingAddressForm.streetPlaceholder")}
          className={errors?.address_line1 ? "border-destructive" : ""}
        />
        {errors?.address_line1 && (
          <p className="text-sm text-destructive">{errors.address_line1}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">{t("shippingAddressForm.postalCode")}</Label>
          <Input
            id="postal_code"
            value={address.postal_code}
            onChange={(e) => onChange({ ...address, postal_code: e.target.value })}
            placeholder={t("shippingAddressForm.postalCodePlaceholder")}
            className={errors?.postal_code ? "border-destructive" : ""}
          />
          {errors?.postal_code && (
            <p className="text-sm text-destructive">{errors.postal_code}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">{t("shippingAddressForm.city")}</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            placeholder={t("shippingAddressForm.cityPlaceholder")}
            className={errors?.city ? "border-destructive" : ""}
          />
          {errors?.city && (
            <p className="text-sm text-destructive">{errors.city}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">{t("shippingAddressForm.country")}</Label>
        <Select
          value={address.country}
          onValueChange={(value) => onChange({ ...address, country: value })}
        >
          <SelectTrigger id="country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`shippingAddressForm.countries.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
