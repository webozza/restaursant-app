"use client";

import { useAppSelector } from "@/lib/store";

import { PersonDetails } from "@/components/person-details";
import IndividualFoodSelection from "@/components/individual-food-selection";
import { BookingConfirmation } from "@/components/booking-confirmation";
import { Navigation } from "@/components/navigation";
import TableSelection from "@/components/table-selection";
import { SeatSelection } from "@/components/seat-selection";
import CheckoutPage from "@/components/checkout";


export default function HomePage() {
  // step now comes from the flow slice
  const step = useAppSelector((state) => state.flow.step);

  return (
    <div className="min-h-screen">
      <Navigation />

      {step === "table-selection" && <TableSelection />}
      {step === "seat-selection" && <SeatSelection />}
      {step === "person-details" && <PersonDetails />}
      {step === "food-selection" && <IndividualFoodSelection />}
     
    </div>
  );
}
