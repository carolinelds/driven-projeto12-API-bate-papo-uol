import express, { json } from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

const app = express();
app.use(cors());
app.use(json());
dotenv.config();

let database = null;
dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URI); 

const promise = mongoClient.connect(); 

promise.then(response => {
	database = mongoClient.db("bate-papo-uol"); 
	console.log(chalk.blue.bold("Banco de dados conectado com sucesso"));
});

promise.catch(err => {
	console.log(chalk.red.bold("Falha na conexão com o banco de dados"), err)
});

// requests aqui

app.listen(5000, () => console.log("Server is running."));