"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartOrderSummary } from "@/components/cart/CartOrderSummary";
import { useCart } from "@/hooks/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { BD_REGION_OPTIONS, BD_REGIONS } from "@/lib/constants/locations";
import {
  deliveryAreaIdForDistrict,
  resolveShippingFee,
  shippingEstimateForArea,
} from "@/lib/shipping/calculate";
import { queryKeys } from "@/lib/queries/query-keys";
import { fetchOrderRegion, placeStoreOrder } from "@/services/store-orders";

type CheckoutFormValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  city: string;
  deliveryAreaId: string;
  note: string;
};

const PHONE_PATTERN = /^(\+880|880|0)?1[3-9]\d{8}$/;

export function CheckoutPageView() {
  const router = useRouter();
  const settings = useSiteSettings();
  const { cart, clearCart, updateQuantity, removeItem } = useCart();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: orderRegion, isPending: regionPending } = useQuery({
    queryKey: queryKeys.store.orderRegion(),
    queryFn: fetchOrderRegion,
    staleTime: 60_000,
  });
  const regionBlocked = orderRegion?.allowed === false;

  const defaultAreaId = settings.shippingAreas[0]?.id ?? "";

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      region: "Dhaka",
      city: "Dhaka",
      deliveryAreaId: defaultAreaId,
      note: "",
    },
    mode: "onBlur",
  });

  const region = watch("region");
  const city = watch("city");
  const deliveryAreaId = watch("deliveryAreaId");
  const phoneValue = watch("phone");
  const emailValue = watch("email");
  const nameValue = watch("name");
  const districts = BD_REGIONS[region] ?? [];

  const autoAreaId = useMemo(
    () => deliveryAreaIdForDistrict(settings.shippingAreas, city),
    [settings.shippingAreas, city],
  );

  useEffect(() => {
    if (!autoAreaId) return;
    setValue("deliveryAreaId", autoAreaId);
  }, [autoAreaId, setValue]);

  const areaIndex = Math.max(
    0,
    settings.shippingAreas.findIndex((area) => area.id === deliveryAreaId),
  );

  const shippingFee = useMemo(
    () => resolveShippingFee(settings, areaIndex, cart.subtotal),
    [settings, areaIndex, cart.subtotal],
  );

  const deliveryEstimate = shippingEstimateForArea(settings, areaIndex);
  const isEmpty = cart.items.length === 0;
  const checkoutTracked = useRef(false);

  useEffect(() => {
    if (isEmpty || checkoutTracked.current) return;
    checkoutTracked.current = true;
    void import("@/lib/pixel/track").then(({ trackPixelEvent, cartContentsFromItems }) => {
      const contents = cartContentsFromItems(cart.items);
      void trackPixelEvent({
        eventName: "InitiateCheckout",
        value: cart.subtotal,
        currency: cart.currency,
        contentIds: cart.items.map((item) => item.productId),
        contents,
        numItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      });
    });
  }, [isEmpty, cart.items, cart.subtotal, cart.currency]);

  useEffect(() => {
    const compactPhone = phoneValue.replace(/[\s-]/g, "");
    const phoneOk = PHONE_PATTERN.test(compactPhone);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim());
    if (!phoneOk && !emailOk) return;
    const [firstName, ...rest] = nameValue.trim().split(/\s+/).filter(Boolean);
    void import("@/lib/pixel/track").then(({ syncPixelCustomer }) => {
      syncPixelCustomer({
        phone: phoneOk ? compactPhone : undefined,
        email: emailOk ? emailValue.trim() : undefined,
        firstName,
        lastName: rest.join(" ") || undefined,
        city,
        state: region,
        country: "bd",
      });
    });
  }, [phoneValue, emailValue, nameValue, city, region]);

  async function onSubmit(values: CheckoutFormValues) {
    if (regionBlocked) {
      setSubmitError(orderRegion?.message || "Orders cannot be placed from this connection.");
      return;
    }
    setSubmitError(null);
    const selectedArea =
      settings.shippingAreas.find((area) => area.id === values.deliveryAreaId) ??
      settings.shippingAreas[0];
    try {
      const { createEventId, getBrowserIds } = await import("@/lib/pixel/browser");
      const { trackPixelEvent, cartContentsFromItems } = await import("@/lib/pixel/track");

      const purchaseEventId = createEventId();
      const browser = getBrowserIds();
      const contents = cartContentsFromItems(cart.items);

      const order = await placeStoreOrder({
        customer: {
          name: values.name,
          phone: values.phone,
          email: values.email,
          address: values.address,
          region: values.region,
          city: values.city,
          note: values.note,
          deliveryArea: selectedArea?.name ?? "",
        },
        items: cart.items,
        shippingFee,
        deliveryAreaId: selectedArea?.id ?? values.deliveryAreaId,
        tracking: {
          eventId: purchaseEventId,
          fbp: browser.fbp,
          fbc: browser.fbc,
          ttp: browser.ttp,
          ttclid: browser.ttclid,
          eventSourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
          clientUserAgent: browser.clientUserAgent,
        },
      });

      const eventId = order.purchaseEventId || purchaseEventId;
      await trackPixelEvent({
        eventName: "Purchase",
        eventId,
        skipServer: true,
        value: order.total,
        currency: order.currency,
        contentIds: order.items.map((item) => item.productId),
        contents,
        numItems: order.itemCount,
        orderId: order.orderNumber,
        user: {
          email: values.email,
          phone: values.phone,
          firstName: values.name.trim().split(/\s+/).filter(Boolean)[0],
          lastName:
            values.name.trim().split(/\s+/).filter(Boolean).slice(1).join(" ") || undefined,
          city: values.city,
          state: values.region,
          country: "bd",
        },
      });

      clearCart();
      const successParams = new URLSearchParams({
        order: order.orderNumber,
        phone: values.phone.trim(),
      });
      router.push(`/checkout/success?${successParams.toString()}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not place order");
    }
  }

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold text-[#20312d]">Your cart is empty</h1>
        <p className="mt-2 text-sm text-[#61716a]">Add products before checking out.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex rounded-md bg-[var(--eco-primary)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#20312d] sm:text-3xl">
          Confirm your order
        </h1>
        <p className="mt-2 text-sm text-[#61716a] sm:text-base">
          Enter your name, address, and phone number
        </p>
      </div>

      {submitError || regionBlocked ? (
        <Alert severity="error" sx={{ borderRadius: 1 }}>
          {submitError || orderRegion?.message}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Stack spacing={2.5} className="lg:col-span-7">
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: { xs: 2, sm: 2.5 },
                bgcolor: "background.paper",
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Contact & delivery</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Full name"
                  fullWidth
                  autoComplete="name"
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  {...register("name", { required: "Name is required", minLength: 2 })}
                />
                <TextField
                  label="Phone"
                  type="tel"
                  fullWidth
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  error={Boolean(errors.phone)}
                  helperText={errors.phone?.message}
                  {...register("phone", {
                    required: "Phone is required",
                    pattern: { value: PHONE_PATTERN, message: "Enter a valid BD mobile number" },
                  })}
                />
                <TextField
                  label="Email (optional)"
                  type="email"
                  fullWidth
                  autoComplete="email"
                  {...register("email")}
                />
                <Controller
                  name="deliveryAreaId"
                  control={control}
                  rules={{ required: "Select a delivery area" }}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.deliveryAreaId)}>
                      <InputLabel id="delivery-area-label">Delivery area</InputLabel>
                      <Select
                        {...field}
                        labelId="delivery-area-label"
                        label="Delivery area"
                      >
                        {settings.shippingAreas.map((area) => (
                          <MenuItem key={area.id} value={area.id}>
                            {area.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {deliveryEstimate ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.75, ml: 0.25 }}
                        >
                          Estimated delivery: {deliveryEstimate}
                        </Typography>
                      ) : null}
                    </FormControl>
                  )}
                />
                <Controller
                  name="region"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id="region-label">Division</InputLabel>
                      <Select
                        {...field}
                        labelId="region-label"
                        label="Division"
                        onChange={(event) => {
                          field.onChange(event);
                          const next = String(event.target.value);
                          const first = BD_REGIONS[next]?.[0] ?? "";
                          setValue("city", first);
                        }}
                      >
                        {BD_REGION_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  name="city"
                  control={control}
                  rules={{ required: "District is required" }}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.city)}>
                      <InputLabel id="city-label">District</InputLabel>
                      <Select {...field} labelId="city-label" label="District">
                        {districts.map((district) => (
                          <MenuItem key={district} value={district}>
                            {district}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <TextField
                  label="Full address"
                  fullWidth
                  multiline
                  minRows={2}
                  error={Boolean(errors.address)}
                  helperText={errors.address?.message}
                  {...register("address", { required: "Address is required", minLength: 8 })}
                />
                <TextField
                  label="Order note (optional)"
                  fullWidth
                  multiline
                  minRows={2}
                  {...register("note")}
                />
              </Stack>
            </Box>

            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: { xs: 2, sm: 2.5 },
                bgcolor: "background.paper",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                <PaymentsOutlinedIcon color="primary" />
                <Typography sx={{ fontWeight: 700 }}>Payment</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Cash on delivery (COD). Pay when your order arrives.
              </Typography>
            </Box>
          </Stack>

          <Box className="lg:col-span-5">
            <Stack
              spacing={2}
              sx={{
                position: { lg: "sticky" },
                top: { lg: 96 },
              }}
            >
              <Stack spacing={1.5}>
                {cart.items.map((item) => (
                  <CartItemRow
                    key={`${item.productId}-${item.size}-${item.color}`}
                    item={item}
                    compact
                    onIncrease={() =>
                      updateQuantity(item.productId, item.size, item.color, item.quantity + 1)
                    }
                    onDecrease={() =>
                      updateQuantity(item.productId, item.size, item.color, item.quantity - 1)
                    }
                    onRemove={() => removeItem(item.productId, item.size, item.color)}
                  />
                ))}
              </Stack>

              <CartOrderSummary
                cart={cart}
                deliveryCharge={shippingFee}
                confirmAsSubmit
                confirmDisabled={isSubmitting || regionPending || regionBlocked}
                confirmLabel={isSubmitting ? "Placing order…" : "Place order"}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 0.5 }}
              >
                <LockOutlinedIcon sx={{ fontSize: 14 }} />
                Secure checkout · Cash on delivery
              </Typography>
            </Stack>
          </Box>
        </div>
      </form>
    </div>
  );
}
