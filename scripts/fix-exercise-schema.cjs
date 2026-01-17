/**
 * Script to fix the Exercise schema by dropping the old collection
 * and recreating it with the correct enum values
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_DB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGO_DB_URI environment variable inside .env');
  process.exit(1);
}

async function fixExerciseSchema() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check if exercises collection exists
    const collections = await db.listCollections().toArray();
    const exercisesExists = collections.some(col => col.name === 'exercises');

    if (exercisesExists) {
      console.log('Found existing exercises collection, dropping it...');
      await db.collection('exercises').drop();
      console.log('✅ Dropped exercises collection');
    } else {
      console.log('No existing exercises collection found');
    }

    // Also clear the Mongoose model cache
    delete mongoose.models.Exercise;
    console.log('✅ Cleared Mongoose model cache for Exercise');

    console.log('\n✅ Schema fix complete!');
    console.log('The exercises collection will be recreated with the correct schema on next use.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    process.exit(1);
  }
}

fixExerciseSchema();

