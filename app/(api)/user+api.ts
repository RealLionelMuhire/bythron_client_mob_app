export async function POST(request: Request) {
  try {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) {
      return Response.json(
        { error: "API base URL not configured" },
        { status: 500 },
      );
    }

    const { name, email, clerkId } = await request.json();

    if (!name || !email || !clerkId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const response = await fetch(`${apiBaseUrl}/api/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerk_user_id: clerkId,
        email,
        name,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ data }), { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
