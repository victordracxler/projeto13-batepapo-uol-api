import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import joi from 'joi';

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
	await mongoClient.connect();
} catch (err) {
	console.log(err);
}

const db = mongoClient.db('uolAPI');
const userCollection = db.collection('users');
const msgsCollection = db.collection('messages');

app.listen(5000, () => {
	console.log(`Server running in port: ${5000}`);
});
