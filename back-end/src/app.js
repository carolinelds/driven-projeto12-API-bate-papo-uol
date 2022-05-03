import express, { json } from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

const app = express();
app.use(cors());
app.use(json());
dotenv.config();

let database = null;
dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URI); 

const promise = mongoClient.connect(); 

promise.then(response => {
	database = mongoClient.db("uol"); 
	console.log(chalk.blue.bold("Banco de dados conectado com sucesso"));
});

promise.catch(err => {
	console.log(chalk.red.bold("Falha na conexão com o banco de dados"), err)
});

/*
Estrutura dos objetos:

const participante = {
    name: 'João', 
    lastStatus: 12313123
}

const mensagem = {
    from: 'João', 
    to: 'Todos', 
    text: 'oi galera', 
    type: 'message', 
    time: '20:04:37'
}
*/

app.post("/participants", async (req,res) => {    
    const nameSchema = joi.object({
        name: joi.string().required()
    });
    const validation  = nameSchema.validate(req.body, { abortEarly: true });
    if (validation.error){
        console.log(validation.error.details);
        res.sendStatus(422);
        return;
    }

    const novoParticipante = {
        name: req.body.name,
        lastStatus: Date.now()
    };
    
    let now = dayjs();
    now = now.format('HH:mm:ss');

    const novaMensagem = {
        from: req.body.name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: now
    };
    
    try {
        const nomeExiste = await database.collection("participantes").find({ name: novoParticipante.name }).toArray();
        if (nomeExiste.length !== 0) {
            console.log(chalk.red.bold("Esse nome já existe."));
            res.sendStatus(409);
            return;
        }
        
        await database.collection("participantes").insertOne(novoParticipante);
        await database.collection("mensagens").insertOne(novaMensagem);        

        console.log(chalk.green.bold("Login feito com sucesso"));
        res.sendStatus(201);
    
    } catch(err) {
        console.log(chalk.red.bold("Erro inesperado no servidor"));
        res.sendStatus(500);
    }

})

app.listen(5000, () => console.log("Server is running."));