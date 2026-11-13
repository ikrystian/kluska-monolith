/**
 * Zwierzak: jedyne miejsce, które zmienia jego stan, ekwipunek i saldo.
 * Wszystko, co dotyka FitCoins albo własności przedmiotu, idzie atomowym
 * `updateOne` z warunkiem — równoległe żądania nie wydadzą monet dwa razy.
 */
import { randomBytes } from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { GamificationProfile } from '@/models/GamificationProfile';
import { Pet, IPet } from '@/models/Pet';
import { PetProfile, IPetProfile, IPetChest } from '@/models/PetProfile';
import { getOrCreateGamificationProfile, grantPoints } from '@/lib/gamification/gamification-service';
import { dayKey } from '@/lib/gamification/streaks';
import {
  DEFAULT_BACKGROUND,
  getPetItem,
  PET_ITEMS,
  PET_SPECIES,
  PetItem,
  PetSlot,
  PetSpecies,
  SPECIES_META,
} from './catalog';
import {
  boostStat,
  decayedValue,
  formFromActivity,
  HUNGER_DECAY_PER_HOUR,
  JOY_DECAY_PER_HOUR,
  PetMood,
  petMood,
  PetThought,
  petThought,
  timeUntilBelow,
} from './state';
import { PetProgress, petProgress, PetStage, STAGE_META } from './progression';

const PET_COOLDOWN_MS = 5 * 60 * 1000;
const PLAY_COOLDOWN_MS = 30 * 60 * 1000;
const PET_JOY = 4;
const WORKOUT_JOY = 15;
/** Próg „głodny” — na ten moment aplikacja planuje powiadomienie. */
const HUNGRY_THRESHOLD = 25;

export class PetError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export interface PetView {
  id: string;
  species: PetSpecies;
  speciesName: string;
  name: string;
  hunger: number;
  joy: number;
  form: number;
  mood: PetMood;
  thought: PetThought;
  shiny: boolean;
  equipped: Partial<Record<PetSlot, string>>;
  progress: PetProgress;
  mastered: boolean;
  /** Kiedy zgłodnieje (ISO) — do lokalnych powiadomień; `null`, gdy już jest głodny. */
  hungryAt: string | null;
  adoptedAt: string;
}

export interface PetState {
  balance: number;
  activePetId: string | null;
  pets: PetView[];
  inventory: { itemKey: string; qty: number }[];
  ownedItems: string[];
  room: { background: string; furniture: string[] };
  chests: { id: string; source: IPetChest['source']; createdAt: string }[];
  /** Można adoptować: brak zwierzaka albo aktywny jest Mistrzem. */
  canAdopt: boolean;
  adoptableSpecies: { key: PetSpecies; name: string; description: string }[];
  /** Ostatni aktywny dzień (`YYYY-MM-DD`) — do powiadomień „dawno nie trenowaliśmy”. */
  lastActiveDay: string | null;
  catalog: PetItem[];
}

async function getOrCreatePetProfile(userId: string): Promise<IPetProfile> {
  const profile = await PetProfile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, room: { background: DEFAULT_BACKGROUND, furniture: [] } } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return profile!;
}

function toPetView(pet: IPet, lastActiveDay: string | null, now: Date): PetView {
  const hunger = Math.round(decayedValue(pet.hunger, HUNGER_DECAY_PER_HOUR, now));
  const joy = Math.round(decayedValue(pet.joy, JOY_DECAY_PER_HOUR, now));
  const form = formFromActivity(lastActiveDay, dayKey(now));
  const stats = { hunger, joy, form };
  const equipped: Partial<Record<PetSlot, string>> = {};
  for (const [slot, key] of Object.entries((pet.toObject().equipped ?? {}) as Record<string, unknown>)) {
    if (typeof key === 'string' && key) equipped[slot as PetSlot] = key;
  }

  return {
    id: pet._id.toString(),
    species: pet.species,
    speciesName: SPECIES_META[pet.species].name,
    name: pet.name,
    hunger,
    joy,
    form,
    mood: petMood(stats),
    thought: petThought(stats),
    shiny: Boolean(pet.shineUntil && pet.shineUntil.getTime() > now.getTime()),
    equipped,
    progress: petProgress(pet.runXp ?? 0, pet.liftXp ?? 0),
    mastered: Boolean(pet.masteredAt),
    hungryAt: timeUntilBelow(pet.hunger, HUNGER_DECAY_PER_HOUR, HUNGRY_THRESHOLD, now)?.toISOString() ?? null,
    adoptedAt: pet.createdAt.toISOString(),
  };
}

export async function getPetState(userId: string): Promise<PetState> {
  await connectToDatabase();
  const now = new Date();

  const [profile, pets, gamification] = await Promise.all([
    getOrCreatePetProfile(userId),
    Pet.find({ userId }).sort({ createdAt: 1 }),
    getOrCreateGamificationProfile(userId),
  ]);

  const lastActiveDay = (gamification.lifetimeStats?.lastActiveDay as string | null | undefined) ?? null;
  const views = pets.map(pet => toPetView(pet, lastActiveDay, now));
  const activePetId =
    views.find(pet => pet.id === profile.activePetId)?.id ?? views[views.length - 1]?.id ?? null;
  const active = views.find(pet => pet.id === activePetId);
  const owned = new Set(pets.map(pet => pet.species));
  const adoptable = PET_SPECIES.filter(species => !owned.has(species));

  return {
    balance: gamification.currentFitCoins,
    activePetId,
    pets: views,
    inventory: profile.inventory.filter(entry => entry.qty > 0).map(entry => ({ itemKey: entry.itemKey, qty: entry.qty })),
    ownedItems: [...new Set([DEFAULT_BACKGROUND, ...profile.ownedItems])],
    room: {
      background: profile.room?.background || DEFAULT_BACKGROUND,
      furniture: [...(profile.room?.furniture ?? [])],
    },
    chests: profile.chests
      .filter(chest => !chest.openedAt)
      .map(chest => ({ id: chest.id, source: chest.source, createdAt: new Date(chest.createdAt).toISOString() })),
    canAdopt: adoptable.length > 0 && (!active || active.mastered),
    adoptableSpecies: adoptable.map(key => ({ key, ...SPECIES_META[key] })),
    lastActiveDay,
    catalog: PET_ITEMS,
  };
}

async function requireActivePet(userId: string): Promise<IPet> {
  const profile = await getOrCreatePetProfile(userId);
  const pet =
    (profile.activePetId && (await Pet.findOne({ _id: profile.activePetId, userId }))) ||
    (await Pet.findOne({ userId }).sort({ createdAt: -1 }));
  if (!pet) throw new PetError(409, 'Najpierw adoptuj zwierzaka');
  return pet;
}

export async function adoptPet(userId: string, species: PetSpecies, name: string): Promise<PetState> {
  await connectToDatabase();
  const state = await getPetState(userId);
  if (!state.canAdopt) {
    throw new PetError(409, 'Kolejnego zwierzaka adoptujesz, gdy obecny zostanie Mistrzem');
  }
  if (!state.adoptableSpecies.some(entry => entry.key === species)) {
    throw new PetError(409, 'Masz już zwierzaka tego gatunku');
  }

  const now = new Date();
  let pet: IPet;
  try {
    pet = await Pet.create({
      userId,
      species,
      name,
      hunger: { value: 80, updatedAt: now },
      joy: { value: 80, updatedAt: now },
    });
  } catch (error: any) {
    if (error?.code === 11000) throw new PetError(409, 'Masz już zwierzaka tego gatunku');
    throw error;
  }
  await PetProfile.updateOne({ userId }, { $set: { activePetId: pet._id.toString() } });
  return getPetState(userId);
}

export async function renamePet(userId: string, name: string): Promise<PetState> {
  await connectToDatabase();
  const pet = await requireActivePet(userId);
  await Pet.updateOne({ _id: pet._id }, { $set: { name } });
  return getPetState(userId);
}

export async function switchActivePet(userId: string, petId: string): Promise<PetState> {
  await connectToDatabase();
  const pet = await Pet.findOne({ _id: petId, userId }).catch(() => null);
  if (!pet) throw new PetError(404, 'Nie znaleziono zwierzaka');
  await getOrCreatePetProfile(userId);
  await PetProfile.updateOne({ userId }, { $set: { activePetId: pet._id.toString() } });
  return getPetState(userId);
}

export async function feedPet(userId: string, itemKey: string): Promise<PetState> {
  await connectToDatabase();
  const item = getPetItem(itemKey);
  if (!item || item.category !== 'food') throw new PetError(400, 'To nie jest jedzenie');
  const pet = await requireActivePet(userId);
  const now = new Date();

  if (decayedValue(pet.hunger, HUNGER_DECAY_PER_HOUR, now) >= 99 && !item.joy && !item.shineHours) {
    throw new PetError(409, `${pet.name} jest już najedzony`);
  }

  const taken = await PetProfile.updateOne(
    { userId, inventory: { $elemMatch: { itemKey, qty: { $gte: 1 } } } },
    { $inc: { 'inventory.$.qty': -1 } }
  );
  if (taken.modifiedCount === 0) throw new PetError(409, 'Nie masz tego w plecaku — kup w sklepie');

  const set: Record<string, unknown> = {
    hunger: boostStat(pet.hunger, HUNGER_DECAY_PER_HOUR, item.hunger ?? 0, now, item.holdHours ?? 0),
  };
  if (item.joy) set.joy = boostStat(pet.joy, JOY_DECAY_PER_HOUR, item.joy, now);
  if (item.shineHours) {
    const from = Math.max(now.getTime(), pet.shineUntil?.getTime() ?? 0);
    set.shineUntil = new Date(from + item.shineHours * 3_600_000);
  }
  await Pet.updateOne({ _id: pet._id }, { $set: set });
  return getPetState(userId);
}

export async function playWithPet(userId: string, toyKey: string): Promise<PetState & { joyGained: number }> {
  await connectToDatabase();
  const toy = getPetItem(toyKey);
  if (!toy || toy.category !== 'toy') throw new PetError(400, 'To nie jest zabawka');
  const profile = await getOrCreatePetProfile(userId);
  if (!profile.ownedItems.includes(toyKey)) throw new PetError(409, 'Nie masz tej zabawki — kup w sklepie');

  const pet = await requireActivePet(userId);
  const now = new Date();
  // Animacja leci zawsze; radość rośnie raz na pół godziny, żeby nie dało się jej „wyklikać”.
  const claimed = await Pet.updateOne(
    {
      _id: pet._id,
      $or: [{ lastPlayedAt: { $exists: false } }, { lastPlayedAt: { $lte: new Date(now.getTime() - PLAY_COOLDOWN_MS) } }],
    },
    { $set: { lastPlayedAt: now, joy: boostStat(pet.joy, JOY_DECAY_PER_HOUR, toy.joy ?? 0, now) } }
  );
  const joyGained = claimed.modifiedCount > 0 ? (toy.joy ?? 0) : 0;
  return { ...(await getPetState(userId)), joyGained };
}

export async function strokePet(userId: string): Promise<PetState & { joyGained: number }> {
  await connectToDatabase();
  const pet = await requireActivePet(userId);
  const now = new Date();
  const claimed = await Pet.updateOne(
    {
      _id: pet._id,
      $or: [{ lastPettedAt: { $exists: false } }, { lastPettedAt: { $lte: new Date(now.getTime() - PET_COOLDOWN_MS) } }],
    },
    { $set: { lastPettedAt: now, joy: boostStat(pet.joy, JOY_DECAY_PER_HOUR, PET_JOY, now) } }
  );
  return { ...(await getPetState(userId)), joyGained: claimed.modifiedCount > 0 ? PET_JOY : 0 };
}

/** Pobiera monety tylko wtedy, gdy saldo wystarcza — jednym atomowym zapisem. */
async function chargeCoins(userId: string, cost: number, item: PetItem, qty: number): Promise<boolean> {
  if (cost <= 0) return true;
  await getOrCreateGamificationProfile(userId);
  const charged = await GamificationProfile.updateOne(
    { userId, currentFitCoins: { $gte: cost } },
    {
      $inc: { currentFitCoins: -cost },
      $push: {
        pointTransactions: {
          $each: [
            {
              amount: -cost,
              type: 'spent',
              source: 'pet_purchase',
              sourceId: item.key,
              description: `Sklep zwierzaka: ${item.name}${qty > 1 ? ` ×${qty}` : ''}`,
              createdAt: new Date(),
            },
          ],
          $slice: -200,
        },
      },
    }
  );
  return charged.modifiedCount > 0;
}

async function addFood(userId: string, itemKey: string, qty: number): Promise<void> {
  const bumped = await PetProfile.updateOne({ userId, 'inventory.itemKey': itemKey }, { $inc: { 'inventory.$.qty': qty } });
  if (bumped.modifiedCount > 0) return;
  const pushed = await PetProfile.updateOne(
    { userId, 'inventory.itemKey': { $ne: itemKey } },
    { $push: { inventory: { itemKey, qty } } }
  );
  // Równoległy zakup zdążył dodać wpis między dwoma zapisami — dolicz do niego.
  if (pushed.modifiedCount === 0) {
    await PetProfile.updateOne({ userId, 'inventory.itemKey': itemKey }, { $inc: { 'inventory.$.qty': qty } });
  }
}

export async function buyPetItem(userId: string, itemKey: string, qty = 1): Promise<PetState> {
  await connectToDatabase();
  const item = getPetItem(itemKey);
  if (!item || item.price <= 0) throw new PetError(404, 'Nie ma takiego przedmiotu');
  await getOrCreatePetProfile(userId);

  if (item.category === 'food') {
    if (!(await chargeCoins(userId, item.price * qty, item, qty))) throw new PetError(402, 'Za mało FitCoins');
    await addFood(userId, itemKey, qty);
    return getPetState(userId);
  }

  // Najpierw zajmij własność (warunek `$ne`), potem pobierz monety; brak monet cofa zajęcie.
  const claimed = await PetProfile.updateOne({ userId, ownedItems: { $ne: itemKey } }, { $addToSet: { ownedItems: itemKey } });
  if (claimed.modifiedCount === 0) throw new PetError(409, 'Masz już ten przedmiot');
  if (!(await chargeCoins(userId, item.price, item, 1))) {
    await PetProfile.updateOne({ userId }, { $pull: { ownedItems: itemKey } });
    throw new PetError(402, 'Za mało FitCoins');
  }
  return getPetState(userId);
}

export async function equipPetItem(userId: string, slot: PetSlot, itemKey: string | null): Promise<PetState> {
  await connectToDatabase();
  const pet = await requireActivePet(userId);
  if (itemKey === null) {
    await Pet.updateOne({ _id: pet._id }, { $unset: { [`equipped.${slot}`]: 1 } });
    return getPetState(userId);
  }
  const item = getPetItem(itemKey);
  if (!item || item.category !== 'clothes' || item.slot !== slot) throw new PetError(400, 'Ten przedmiot tu nie pasuje');
  const profile = await getOrCreatePetProfile(userId);
  if (!profile.ownedItems.includes(itemKey)) throw new PetError(409, 'Nie masz tego przedmiotu');
  await Pet.updateOne({ _id: pet._id }, { $set: { [`equipped.${slot}`]: itemKey } });
  return getPetState(userId);
}

export async function setPetRoom(
  userId: string,
  room: { background?: string; furniture?: string[] }
): Promise<PetState> {
  await connectToDatabase();
  const profile = await getOrCreatePetProfile(userId);
  const owned = new Set([DEFAULT_BACKGROUND, ...profile.ownedItems]);
  const set: Record<string, unknown> = {};

  if (room.background !== undefined) {
    const item = getPetItem(room.background);
    if (!item || item.decor !== 'background' || !owned.has(item.key)) throw new PetError(409, 'Nie masz tego tła');
    set['room.background'] = item.key;
  }
  if (room.furniture !== undefined) {
    const furniture = [...new Set(room.furniture)];
    for (const key of furniture) {
      if (getPetItem(key)?.decor !== 'furniture' || !owned.has(key)) throw new PetError(409, 'Nie masz tego mebla');
    }
    set['room.furniture'] = furniture;
  }
  if (Object.keys(set).length > 0) await PetProfile.updateOne({ userId }, { $set: set });
  return getPetState(userId);
}

/** Skrzynia za rekord. Czeka w profilu, nawet jeśli użytkownik nie ma jeszcze zwierzaka. */
export async function grantPetChest(userId: string, source: IPetChest['source']): Promise<string> {
  await getOrCreatePetProfile(userId);
  const id = randomBytes(8).toString('hex');
  await PetProfile.updateOne({ userId }, { $push: { chests: { id, source, createdAt: new Date() } } });
  return id;
}

export type ChestLoot = { kind: 'coins'; amount: number } | { kind: 'item'; itemKey: string; name: string; qty: number };

/** Losuje zawartość: paczka monet albo przedmiot, którego użytkownik jeszcze nie ma. */
export function rollChestLoot(ownedItems: string[], random: () => number = Math.random): ChestLoot {
  const owned = new Set(ownedItems);
  const prizes = PET_ITEMS.filter(item => item.category !== 'food' && item.price > 0 && item.price <= 220 && !owned.has(item.key));

  if (prizes.length > 0 && random() < 0.5) {
    const item = prizes[Math.floor(random() * prizes.length)];
    return { kind: 'item', itemKey: item.key, name: item.name, qty: 1 };
  }
  if (random() < 0.3) {
    const food = getPetItem('food_protein_shake')!;
    return { kind: 'item', itemKey: food.key, name: food.name, qty: 2 };
  }
  return { kind: 'coins', amount: 100 + Math.floor(random() * 4) * 50 };
}

export async function openPetChest(userId: string, chestId: string): Promise<PetState & { loot: ChestLoot }> {
  await connectToDatabase();
  const profile = await getOrCreatePetProfile(userId);
  const loot = rollChestLoot(profile.ownedItems);

  const claimed = await PetProfile.updateOne(
    { userId, chests: { $elemMatch: { id: chestId, openedAt: { $exists: false } } } },
    { $set: { 'chests.$.openedAt': new Date(), 'chests.$.loot': loot } }
  );
  if (claimed.modifiedCount === 0) throw new PetError(404, 'Ta skrzynia jest już otwarta');

  if (loot.kind === 'coins') {
    await grantPoints(userId, loot.amount, {
      type: 'bonus',
      source: 'pet_chest',
      sourceId: chestId,
      description: 'Skrzynia za rekord',
    });
  } else if (getPetItem(loot.itemKey)?.category === 'food') {
    await addFood(userId, loot.itemKey, loot.qty);
  } else {
    await PetProfile.updateOne({ userId }, { $addToSet: { ownedItems: loot.itemKey } });
  }

  return { ...(await getPetState(userId)), loot };
}

export interface PetWorkoutGain {
  name: string;
  species: PetSpecies;
  xpGained: number;
  stageUp: { from: PetStage; to: PetStage; toName: string } | null;
}

/**
 * Trening albo bieg właściciela: doświadczenie dla aktywnego zwierzaka
 * i zastrzyk radości. Bez zwierzaka — `null`. Nie rzuca: nie może wywrócić
 * zapisu treningu.
 */
export async function onPetActivity(userId: string, gain: { runXp?: number; liftXp?: number }): Promise<PetWorkoutGain | null> {
  try {
    const profile = await PetProfile.findOne({ userId });
    if (!profile) return null;
    const pet =
      (profile.activePetId && (await Pet.findOne({ _id: profile.activePetId, userId }))) ||
      (await Pet.findOne({ userId }).sort({ createdAt: -1 }));
    if (!pet) return null;

    const runXp = Math.max(0, Math.round(gain.runXp ?? 0));
    const liftXp = Math.max(0, Math.round(gain.liftXp ?? 0));
    const before = petProgress(pet.runXp ?? 0, pet.liftXp ?? 0);
    const now = new Date();

    const updated = await Pet.findOneAndUpdate(
      { _id: pet._id },
      { $inc: { runXp, liftXp }, $set: { joy: boostStat(pet.joy, JOY_DECAY_PER_HOUR, WORKOUT_JOY, now) } },
      { new: true }
    );
    const after = petProgress(updated?.runXp ?? 0, updated?.liftXp ?? 0);
    if (after.stage === 'master' && !updated?.masteredAt) {
      await Pet.updateOne({ _id: pet._id, masteredAt: { $exists: false } }, { $set: { masteredAt: now } });
    }

    return {
      name: pet.name,
      species: pet.species,
      xpGained: runXp + liftXp,
      stageUp:
        after.stage !== before.stage ? { from: before.stage, to: after.stage, toName: STAGE_META[after.stage].name } : null,
    };
  } catch (error) {
    console.error('Failed to update pet after activity:', error);
    return null;
  }
}
