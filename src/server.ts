// src/server.ts
import express from 'express';
import { init, getNftCount } from './init'; // Adjust the path to your init file
import * as dotenv from 'dotenv';
import { Address } from 'ton-core';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.static('public'));

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


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
