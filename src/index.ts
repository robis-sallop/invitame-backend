import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, Collection } from 'mongodb';
import { getGuests, saveGuestResponse, createInvitation, getInvitationByToken, type GuestDocument } from './services/guestService.js';

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 4000;
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'invitame';
const collectionName = 'invitados';

if (!mongoUri) {
  console.error('MONGODB_URI is not defined in .env');
  process.exit(1);
}

const client = new MongoClient(mongoUri);

async function startServer() {
  await client.connect();
  const db = client.db(dbName);
  const collection: Collection<GuestDocument> = db.collection(collectionName);

  app.use(cors());
  app.use(express.json());

  app.get('/api/guests', async (req, res) => {
    try {
      const guests = await getGuests(collection);
      res.json(guests);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'No se pudo obtener los invitados' });
    }
  });

  app.post('/api/invitations', async (req, res) => {
    const { invitation, guestName, status } = req.body;

    if (!guestName) {
      return res.status(400).json({ error: 'El nombre del invitado es obligatorio' });
    }

    try {
      const invitationData = await createInvitation(collection, { invitation, guestName, status });
      res.json(invitationData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'No se pudo crear la invitación' });
    }
  });

  app.get('/api/invitations/:token', async (req, res) => {
    const { token } = req.params;

    try {
      const invitationData = await getInvitationByToken(collection, token);
      if (!invitationData) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }
      res.json(invitationData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'No se pudo obtener la invitación' });
    }
  });

  app.post('/api/guests', async (req, res) => {
    const { name, attending, status, updatedAt, message } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre del invitado es obligatorio' });
    }

    try {
      const savedGuest = await saveGuestResponse(collection, { name, attending, status, updatedAt, message });
      res.json(savedGuest);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'No se pudo guardar la respuesta del invitado' });
    }
  });

  app.listen(port, () => {
    console.log(`MongoDB API server listening at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});