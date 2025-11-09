import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";

export async function POST(req: Request) {
  const { email } = await req.json();

  try {
    const { db } = await connectMongoDB();
    // Minimal change: allow users marked as admin in applicants to access admin portal
    // This keeps backward compatibility for setups without an `admins` collection.
    const admin = await db.collection("admins").findOne({ email });
    const applicantAdmin = await db
      .collection("applicants")
      .findOne({ email, role: { $in: ["admin", "super_admin", "superadmin"] } });

    return NextResponse.json({ isSuperAdmin: !!admin || !!applicantAdmin });
  } catch (error) {
    console.error("Error checking super admin:", error);
    return NextResponse.json({ isSuperAdmin: false }, { status: 500 });
  }
}