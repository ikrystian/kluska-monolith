const mongoose = require('mongoose');

async function fixWorkoutPlanSchema() {
  try {
    const mongoUri = process.env.MONGO_DB_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_DB_URI or MONGODB_URI environment variable is not set');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop the old workoutPlans collection
    console.log('Dropping old workoutPlans collection...');
    try {
      await db.collection('workoutplans').drop();
      console.log('✓ workoutPlans collection dropped');
    } catch (error) {
      if (error.code === 26) {
        console.log('✓ workoutPlans collection does not exist (already clean)');
      } else {
        throw error;
      }
    }

    // Clear Mongoose model cache
    if (mongoose.models.WorkoutPlan) {
      delete mongoose.models.WorkoutPlan;
    }
    if (mongoose.modelSchemas && mongoose.modelSchemas.WorkoutPlan) {
      delete mongoose.modelSchemas.WorkoutPlan;
    }

    console.log('✓ Mongoose cache cleared');
    console.log('✓ Schema migration completed successfully');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error during schema migration:', error);
    process.exit(1);
  }
}

fixWorkoutPlanSchema();

