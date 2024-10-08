import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "./models/User.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import { WebSocketServer } from "ws"; // Correct import for WebSocketServer
import { Message } from "./models/Message.js";


const bcryptSalt = bcrypt.genSaltSync(10);

dotenv.config();

// MongoDB Connection
const uri="mongodb+srv://sunnyshukla4900:sunny123@cluster0.er9kk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
async function connectDB() {
    try {
        // Await the mongoose connection directly and log success
        await mongoose.connect(uri);
        console.log("Database connected successfully");
    } catch (err) {
        // Log the full error object to capture the reason or any specific issues
        console.error("MongoDB connection error:", err.message || err);
        throw err;  // Re-throw the error to handle it elsewhere if needed
    }
}


connectDB();

const app = express();
const jwtSecret = process.env.JWT_SECRET;

// Middleware Setup
const allowedOrigins = [
    "https://chat-deploy-client.vercel.app", // Your deployed frontend on Vercel
    "http://localhost:3000","https://chat-deploy-client-m8s655gsp-sunnny04.vercel.app",
    "https://chat-deploy-client-git-main-sunnny04.vercel.app"// For local development
];
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://chat-deploy-client.vercel.app");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});
app.use(express.json());
app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
}));

// Handle preflight requests
app.use(cors({
    credentials: true,
    origin: "https://chat-deploy-client.vercel.app", // Specify the Vercel client URL
}));
app.use(cookieParser());
// Test Route
app.get("/test", (req, res) => {
    res.json({ message: "test ok" });
});
async function getUserDataFromRequest(req){
    return new Promise((resolve,reject)=>{
        const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            resolve({ userData });
        });
    } else {
        reject("no token");
    }
    })
}

app.get('/messages/:userId',async (req,res)=>{
    const {userId}=req.params;
    const userData= await getUserDataFromRequest(req);

    const ourUserId=userData.userData.userId;
    const messages=await Message.find({
        sender:{$in:[userId,ourUserId]},
        recipient:{$in:[userId,ourUserId]},

    }).sort({createdAt:1})
    res.json(messages)
    console.log(messages)

})
app.get('/people',async(req,res)=>{
    const users=await User.find({},{'_id':1,username:1});
    res.json({users});
    // console.log(users);
    
})


app.get("/profile", (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            res.json({ userData });
        });
    } else {
        res.status(401).json("no token");
    }
});

// Register Route
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({ username, password: hashedPassword });
        jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) {
                console.error("JWT Sign Error:", err);
                return res.status(500).json({ error: 'Token generation failed' });
            }
            res.cookie('token', token, { sameSite: "none", secure: true}).status(201).json({
                _id: createdUser._id,
                username
            });
            console.log("user created");
        });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: 'User registration failed' });
    }
});
app.post('/logout',(req,res)=>{
    res.cookie('token', '', { sameSite: "none", secure: true }).json('ok')
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user) {
            const match = bcrypt.compareSync(password, user.password);
            if (match) {
                jwt.sign({ userId: user._id, username }, jwtSecret, {}, (err, token) => {
                    if (err) {
                        console.error("JWT Sign Error:", err);
                        return res.status(500).json({ error: 'Token generation failed' });
                    }
                    res.cookie('token', token, { sameSite: "none", secure: true }).json({
                        _id: user._id,
                        username
                    });
                });
            } else {
                res.status(400).json({ error: "Invalid credentials" });
            }
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});

// Start Server
const API_PORT = process.env.API_PORT

    const server = app.listen(API_PORT, () => {
        console.log(`Server is running on http://localhost:${API_PORT}`);
    });


const wss = new WebSocketServer({ server });
wss.on('connection', (connection,req) => {

    connection.timer=setInterval(()=>{
        connection.ping();
        connection.deathTimer=setTimeout(()=>{
            connection.isAlive=false;
        },1000)
    },5000)
    connection.on('pong',()=>{
        clearTimeout(connection.deathTimer)
        
    },5000)
    const cookies=req.headers.cookie;
    if(cookies){
        const tokenCookieString=cookies.split(';').find(str=>str.startsWith('to'))
        if(tokenCookieString){
            const token=tokenCookieString.split('=')[1];
            if(token){
                jwt.verify(token,jwtSecret,{},(err,userData)=>{
                    if(err) throw err;
                    const {userId,username}=userData
                    connection.userId=userId;
                    connection.username=username
                    
                })
                
            }
        }
        
    }
    connection.on('message',async(message)=>{
        const messageData=JSON.parse(message.toString());
        const {recipient,text}=messageData.message;
        console.log({text});
        
        if(recipient && text ){
            const Messagedoc= await Message.create({
                sender:connection.userId,
                recipient,
                text
            });
            [...wss.clients].filter(c=>c.userId===recipient).
            forEach(c=>c.send(JSON.stringify({text,sender:connection.userId,recipient,
                _id:Messagedoc._id,
            })))
        }
        
    });


    [...wss.clients].forEach(client=>{
        client.send(JSON.stringify({
            online:[...wss.clients].map(c=>({userId:c.userId,username:c.username}))
    }))
    })
});
wss.on('close',data=>{
    console.log('disconnect',data)
})
