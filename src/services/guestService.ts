import { Collection, ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

export type GuestDocument = {
  _id?: ObjectId;
  type: 'guest' | 'invitation';
  guestName: string;
  attending: boolean | null;
  message?: string;
  status?: string;
  updatedAt?: string;
  invitation?: unknown;
  token?: string;
  createdAt?: string;
};

type GuestResponseInput = {
  name: string;
  attending: boolean;
  status: string;
  updatedAt: string;
  message: string;
};

type InvitationInput = {
  invitation: unknown;
  guestName: string;
  status?: string;
};

export async function getGuests(collection: Collection<GuestDocument>) {
  const guests = await collection
    .find({ type: { $in: ['guest', 'invitation'] } })
    .sort({ updatedAt: -1 })
    .toArray();

  return guests.map((guest) => ({
    id: guest._id,
    name: guest.guestName || '',
    attending: guest.attending,
    message: guest.message,
    status: guest.status,
    token: guest.token,
    updatedAt: guest.updatedAt,
  }));
}

export async function saveGuestResponse(collection: Collection<GuestDocument>, { name, attending, status, updatedAt, message }: GuestResponseInput) {
  const existing = await collection.findOne({ guestName: name, type: 'guest' });
  const guestData: GuestDocument = {
    type: 'guest',
    guestName: name,
    attending,
    status,
    updatedAt,
    message,
  };

  if (existing) {
    await collection.updateOne({ _id: existing._id }, { $set: guestData });
    return {
      id: existing._id,
      name,
      attending,
      status,
      updatedAt,
      message,
    };
  }

  const result = await collection.insertOne(guestData);
  return {
    id: result.insertedId,
    name,
    attending,
    status,
    updatedAt,
    message,
  };
}

export async function createInvitation(collection: Collection<GuestDocument>, { invitation, guestName, status }: InvitationInput) {
  const token = nanoid(10);
  const createdAt = new Date().toISOString();
  const invitationData: GuestDocument = {
    type: 'invitation',
    token,
    guestName,
    status: status || 'Pendiente',
    attending: null,
    invitation,
    createdAt,
    updatedAt: createdAt,
  };

  const existingGuest = await collection.findOne({ guestName, type: 'guest' });
  if (existingGuest) {
    const updatedGuest: GuestDocument = {
      ...existingGuest,
      token,
      invitation,
      status: status || 'Pendiente',
      attending: null,
      updatedAt: createdAt,
      createdAt: existingGuest.createdAt || createdAt,
    };

    await collection.updateOne({ _id: existingGuest._id }, { $set: {
      token,
      invitation,
      status: status || 'Pendiente',
      attending: null,
      updatedAt: createdAt,
      createdAt: existingGuest.createdAt || createdAt,
    }});

    return updatedGuest;
  }

  await collection.insertOne(invitationData);
  return invitationData;
}

export async function getInvitationByToken(collection: Collection<GuestDocument>, token: string) {
  return collection.findOne({ token });
}
