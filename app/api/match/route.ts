import mock from "@/lib/mock.json";

export const maxDuration = 30;

// Stub: returns mock data until github/rank/gemma are wired in.
export async function POST() {
  return Response.json(mock);
}
