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

app.post("/participants", async (req, res) => {
    const nameSchema = joi.object({
        name: joi.string().required()
    });
    const validation = nameSchema.validate(req.body, { abortEarly: true });
    if (validation.error) {
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

        console.log(chalk.green.bold("Usuário entrou na sala com sucesso"));
        res.sendStatus(201);

    } catch (err) {
        console.log(chalk.red.bold("Erro inesperado no servidor"));
        res.sendStatus(500);
    }
})

app.get("/participants", async (req, res) => {
    try {
        const participantes = await database.collection("participantes").find({}).toArray();
        res.send(participantes);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) => {
    const mensagemSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.any().valid('message', 'private_message')
    });

    const validation = mensagemSchema.validate(req.body, { abortEarly: true });
    if (validation.error) {
        console.log(validation.error.details);
        res.sendStatus(422);
        return;
    }

    let now = dayjs();
    now = now.format('HH:mm:ss');

    const novaMensagem = {
        to: req.body.to,
        text: req.body.text,
        type: req.body.type,
        from: req.headers.user,
        time: now
    };

    try {
        const participanteExiste = await database.collection("participantes").find({ name: novaMensagem.from }).toArray();
        if (participanteExiste.length === 0) {
            console.log(chalk.red.bold("Esse usuário não existe"));
            res.sendStatus(422);
            return;
        }

        await database.collection("mensagens").insertOne(novaMensagem);

        console.log(chalk.green.bold("Mensagem enviada com sucesso"));
        res.sendStatus(201);

    } catch (err) {
        console.log(chalk.red.bold("Falha no envio da mensagem"));
        res.sendStatus(422);
    }
})

app.get("/messages", async (req,res) => {
    const { limit } = req.query;
    const usuario = req.headers.user;
    try {
        const mensagens = await database.collection("mensagens").find({}).toArray();

        const mensagensFiltradas = mensagens.filter(mensagem => {
            if (mensagem.type === 'private_message'){
                let validation = (mensagem.from === usuario) || (mensagem.to === usuario);
                return validation ? true : false;
            } else {
                return true;
            } 
        });

        if (!limit || mensagensFiltradas.length <= limit) {
            res.send(mensagensFiltradas);
        } else {
            const start = mensagensFiltradas.length - limit;
            const end = mensagensFiltradas.length - 1;
            const ultimasMensagens = [...mensagensFiltradas].splice(start, end);
            res.send(ultimasMensagens);
        }
        
    } catch(err) {
        console.log(chalk.red.bold("Falha na obtenção das mensagens"));
        res.sendStatus(500);
    }
});

app.post("/status", async (req,res) => {
    try {
        const usuario = await database.collection("participantes").findOne({ name: req.headers.user });
        if (usuario.toArray().length === 0) {
            res.sendStatus(404);
            return;
        }
        
        await database.collection("participantes").updateOne(
            { _id: usuario._id }, 
            { $set: { lastStatus: Date.now() } }
        );

        res.sendStatus(200);

    } catch(err) {
        res.sendStatus(404);
    }
})

app.listen(5000, () => console.log("Server is running."));