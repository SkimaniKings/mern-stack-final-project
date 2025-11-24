import { NextResponse } from "next/server";
import { resetBillCategories } from "@/app/actions/bill-categories";

export async function POST() {
  try {
    const result = await resetBillCategories();
    if (result.success) {
      return NextResponse.json({ message: "Bill categories reset successfully." }, { status: 200 });
    } else {
      return NextResponse.json({ message: "Failed to reset bill categories.", error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ message: "An unexpected error occurred.", error: (error as Error).message }, { status: 500 });
  }
}
