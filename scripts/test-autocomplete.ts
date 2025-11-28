
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env') });

async function getAccessToken() {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('FatSecret credentials not found in environment variables.');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=premier',
    });

    const data = await response.json();
    return data.access_token;
}

async function testAutocomplete() {
    try {
        const token = await getAccessToken();
        console.log('Got token');

        const query = 'Chicken';
        const params = new URLSearchParams({
            expression: query,
            format: 'json',
        });

        // Try v2 endpoint
        console.log('Testing food.autocomplete.v1...');
        const response = await fetch(`https://platform.fatsecret.com/rest/food/autocomplete/v1?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testAutocomplete();
