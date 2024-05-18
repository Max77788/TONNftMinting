// src/server.ts
import express from 'express';
import { init, getNftCount } from './init'; // Adjust the path to your init file
import path from 'path';
import * as dotenv from 'dotenv';
import { Address } from 'ton-core';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.static('public'));


// Render index.html on the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/*
// Return tonconnect-manifest.json on /tonconnect-manifest.json route
app.get('/tonconnect-manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/tonconnect-manifest.json'));
});
*/

app.get('/start', async (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).send('Address parameter is required');
  }

  const address_parsed = Address.parse(address.toString())
  
  try {
    await init(address_parsed);
    res.send('NFT Collection deployment was successful');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error starting the deployment');
  }
});

app.get('/nft-count', getNftCount);

// app.get('/tonconnect-manifest22.json', getTonManifestJSON);




app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
