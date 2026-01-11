const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const url = require('url');

const app = express();

// This line allows ANY URL to access this proxy
app.use(cors({ origin: true }));

app.all('*', (req, res) => {
    // It looks for a ?url=... parameter
    let targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Please provide a URL. Example: ?url=https://google.com');
    }

    // Add https if missing
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

    // Remove host header to avoid security blocks on the target site
    delete options.headers['host'];

    const proxyReq = protocol.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
        res.status(500).send('Proxy Error: ' + e.message);
    });

    req.pipe(proxyReq);
});

// This exports the function as "proxy"
exports.proxy = onRequest({ region: "us-central1", cors: true }, app);
