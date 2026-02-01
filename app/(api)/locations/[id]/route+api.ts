export async function GET(request: Request, { id }: { id: string }) {
    try {
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
        const url = new URL(request.url);
        const startTime = url.searchParams.get('start_time');
        const endTime = url.searchParams.get('end_time');

        if (!apiBaseUrl) {
            return Response.json(
                { error: "API base URL not configured" },
                { status: 500 }
            );
        }

        if (!startTime || !endTime) {
            return Response.json(
                { error: "start_time and end_time query parameters are required" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `${apiBaseUrl}/api/locations/${id}/route?start_time=${startTime}&end_time=${endTime}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error("Error fetching route:", error);
        return Response.json(
            { error: "Failed to fetch route" },
            { status: 500 }
        );
    }
}
