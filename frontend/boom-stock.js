// Proxy helper for development: fetches Boom full stock from the API using environment-like headers.
// NOTE: For Vercel/Netlify you should place an equivalent function under frontend/api/boom-stock.js
// (this file is a reference implementation you can adapt / move to the proper serverless location).

const http = require('http');
const https = require('https');

async function fetchFromBoom(base, filial, usuario, username, password) {
  const baseClean = base.replace(/\/$/, '');
  const url = `${baseClean}/api/fullestoque/filial/${filial}/user/${usuario}`;
  const lib = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Username': username,
        'Password': password,
        'Accept': 'application/json'
      }
    };

    const req = lib.get(url, options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { const json = JSON.parse(raw); resolve(json); }
        catch(e) { resolve(raw); }
      });
    });

    req.on('error', reject);
  });
}

module.exports = { fetchFromBoom };
