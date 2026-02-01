export async function GET(request: Request, { id }: { id: string }) {
    try {
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

        if (!apiBaseUrl) {
            return Response.json(
                { error: "API base URL not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(`${apiBaseUrl}/api/locations/${id}/latest`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error("Error fetching latest location:", error);
        return Response.json(
            { error: "Failed to fetch latest location" },
            { status: 500 }
        );
    }
}
