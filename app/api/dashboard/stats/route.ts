import { type NextRequest, NextResponse } from "next/server"
import { getDashboardStats } from "@/lib/database-operations"

export const dynamic = "force-dynamic"

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const stats = await getDashboardStats()

    console.log(`[v0] Dashboard stats accessed`)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error("[v0] Fetch dashboard stats error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
