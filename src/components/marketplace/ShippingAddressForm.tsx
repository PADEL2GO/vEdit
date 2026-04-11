import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ShippingAddress } from "@/hooks/useMarketplaceRedeem";

interface ShippingAddressFormProps {
  address: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

const COUNTRIES = [
  { code: "DE", name: "Deutschland" },
  { code: "AT", name: "Österreich" },
  { code: "CH", name: "Schweiz" },
];

export const ShippingAddressForm = ({ address, onChange, errors }: ShippingAddressFormProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address_line1">Straße und Hausnummer *</Label>
        <Input
          id="address_line1"
          value={address.address_line1}
          onChange={(e) => onChange({ ...address, address_line1: e.target.value })}
          placeholder="Musterstraße 123"
          className={errors?.address_line1 ? "border-destructive" : ""}
        />
        {errors?.address_line1 && (
          <p className="text-sm text-destructive">{errors.address_line1}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">PLZ *</Label>
          <Input
            id="postal_code"
            value={address.postal_code}
            onChange={(e) => onChange({ ...address, postal_code: e.target.value })}
            placeholder="12345"
            className={errors?.postal_code ? "border-destructive" : ""}
          />
          {errors?.postal_code && (
            <p className="text-sm text-destructive">{errors.postal_code}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Stadt *</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            placeholder="Berlin"
            className={errors?.city ? "border-destructive" : ""}
          />
          {errors?.city && (
            <p className="text-sm text-destructive">{errors.city}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Land</Label>
        <Select
          value={address.country}
          onValueChange={(value) => onChange({ ...address, country: value })}
        >
          <SelectTrigger id="country">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
