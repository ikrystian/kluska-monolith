import 'dotenv/config';

async function testFatSecret() {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    console.log('Testing FatSecret Integration...');
    console.log('Client ID:', clientId ? 'Found' : 'Missing');
    console.log('Client Secret:', clientSecret ? 'Found' : 'Missing');

    if (!clientId || !clientSecret) {
        console.error('Missing credentials');
        return;
    }

    // 1. Get Token
    console.log('\n1. Requesting Access Token...');
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const tokenResponse = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials&scope=premier', // Added scope based on user example
        });

        if (!tokenResponse.ok) {
            console.error('Token Request Failed:', tokenResponse.status, await tokenResponse.text());
            return;
        }

        const tokenData = await tokenResponse.json();
        console.log('Token Received:', tokenData.access_token ? 'Yes' : 'No');
        console.log('Scope:', tokenData.scope);

        if (!tokenData.access_token) return;

        // 2. Search Food
        console.log('\n2. Searching for "chicken"...');
        const params = new URLSearchParams({
            search_expression: 'chicken',
            format: 'json',
            max_results: '5'
        });

        const searchResponse = await fetch(`https://platform.fatsecret.com/rest/foods/search/v4?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!searchResponse.ok) {
            console.error('Search Request Failed:', searchResponse.status, await searchResponse.text());
            return;
        }

        const searchData = await searchResponse.json();
        console.log('Search Results:', JSON.stringify(searchData, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testFatSecret();
