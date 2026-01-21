import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './db';
import { dbRouter } from './routes/db';
import { authRouter } from './routes/auth';
import uploadRouter from './routes/upload';
import aiRouter from './routes/ai';
import { gamificationRouter } from './routes/gamification';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectToDatabase();

// Routes
app.get('/', (req, res) => {
    res.send('Kluska Monolith Backend Running');
});

app.use('/api/db', dbRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/ai', aiRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
