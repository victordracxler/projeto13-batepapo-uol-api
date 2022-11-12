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

const msgSchema = joi.object({
	to: joi.string().required().min(1),
	text: joi.string().required().min(1),
	type: joi.string().required().valid('message', 'private_message'),
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
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.post('/messages', async (req, res) => {
	const { user } = req.headers;
	const message = req.body;

	try {
		const userExists = await userCollection.findOne({ name: user });
		if (!userExists) {
			res.status(422).send({ message: 'Usuário não está conectado' });
			return;
		}

		const { validationError } = msgSchema.validate(message, {
			abortEarly: false,
		});
		if (validationError) {
			const errors = validationError.details.map(
				(detail) => detail.message
			);
			return res.status(400).send(errors);
		}

		const formatTime = dayjs().format('HH:mm:ss');

		await msgsCollection.insertOne({
			...message,
			from: user,
			time: formatTime,
		});

		res.sendStatus(201);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.get('/messages', async (req, res) => {
	const limit = Number(req.query.limit);
	const { user } = req.headers;

	try {
		const list = await msgsCollection.find().toArray();
		const filteredList = list.filter((message) => {
			if (
				message.type === 'message' ||
				message.to === user ||
				message.type === 'status'
			) {
				return true;
			}
		});

		if (limit) {
			res.send(filteredList.slice(-limit));
			return;
		}
		res.send(filteredList);
	} catch (err) {
		console.log(err);
		res.sendStatus(500);
	}
});

app.listen(5000, () => {
	console.log(`Server running in port: ${5000}`);
});
