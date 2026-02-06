export async function POST(request: Request) {
    try {
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

        if (!apiBaseUrl) {
            return Response.json(
                { error: "API base URL not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { userId, email, name } = body;

        if (!userId || !email) {
            return Response.json(
                { error: "userId and email are required" },
                { status: 400 }
            );
        }

        const response = await fetch(`${apiBaseUrl}/api/auth/sync/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clerk_user_id: userId,
                email,
                name,
            }),
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error("Error syncing user:", error);
        return Response.json(
            { error: "Failed to sync user" },
            { status: 500 }
        );
    }
}
