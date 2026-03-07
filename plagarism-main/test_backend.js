
// Use 127.0.0.1 to avoid localhost resolution issues

async function testBackend() {
    const url = 'http://127.0.0.1:5000/api/plagiarism-check';
    const payload = {
        text: "This is a comprehensive test sentence designed to verify that the backend API is reachable. We need enough content to pass the minimum character validation threshold set in the schema."
    };

    try {
        console.log(`Sending POST request to ${url}...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Response Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            console.log('✅ Success! Backend responded.');
            const data = await response.json();
            console.log('Data received:', JSON.stringify(data).substring(0, 100) + '...');
        } else {
            console.error('❌ Backend Error');
            const errText = await response.text();
            console.error('Body:', errText);
        }
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

testBackend();
