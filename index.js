import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

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

const userSchema = joi.object({
	name: joi.string().required(),
});

// ROUTES

app.post('/participants', async (req, res) => {
	const user = req.body;

	try {
		const userExists = await userCollection.findOne({ name: user.name });
		if (userExists) {
			return res
				.status(409)
				.send({ message: 'Já existe um participante com este nome' });
		}

		const { validationError } = userSchema.validate(user, {
			abortEarly: false,
		});
		if (validationError) {
			const errors = validationError.details.map(
				(detail) => detail.message
			);
			return res.status(400).send(errors);
		}

		const time = Date.now();
		const formatTime = dayjs(time).format('HH:mm:ss');

		await userCollection.insertOne({ ...user, lastStatus: time });
		await msgsCollection.insertOne({
			from: user.name,
			to: 'Todos',
			text: 'entra na sala...',
			type: 'status',
			time: formatTime,
		});
		res.sendStatus(201);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.get('/participants', async (req, res) => {
	try {
		const participantsList = await userCollection.find({}).toArray();
		res.send(participantsList);
	} catch (err) {}
});

app.listen(5000, () => {
	console.log(`Server running in port: ${5000}`);
});
