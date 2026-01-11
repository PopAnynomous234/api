const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const url = require('url');

const app = express();

// This allows ANY frontend domain to access this proxy
app.use(cors({ origin: true }));

app.all('*', (req, res) => {
    // Look for the URL in the query string (e.g., /proxy?url=...)
    let targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Error: No URL provided. Usage: /proxy?url=https://example.com');
    }

    // Auto-fix missing protocol
    if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
    }

    const parsedUrl = url.parse(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: req.method,
        headers: { ...req.headers }
    };

    // Remove headers that would cause the target site to block the request
    delete options.headers['host'];
    delete options.headers['origin'];
    delete options.headers['referer'];
    
    // Add a common User-Agent so the request looks like a real browser
    options.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const proxyReq = protocol.request(options, (proxyRes) => {
        // Forward the status code and headers from the target site back to the frontend
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
        res.status(500).send('Proxy Error: ' + e.message);
    });

    // Pipe the user's request data (like POST body) to the target
    req.pipe(proxyReq);
});

// "cors: true" here tells Firebase's infrastructure to allow all origins
exports.proxy = onRequest({ 
    region: "us-central1", 
    cors: true,
    maxInstances: 10,
    invoker: 'public' // Ensures the URL is accessible to everyone
}, app);
