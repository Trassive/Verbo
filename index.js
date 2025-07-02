require('dotenv').config()
const express = require('express');
const app = express();
const {Router, loadStateFromDisk} = require('./routes/uploadChunked');

app.use(express.json());

loadStateFromDisk();

app.use('/',Router);

app.get('/',(req,res)=>{
    res.send("hellow");
})

app.listen(process.env.PORT, ()=>{
    console.log("server is listening "+ process.env.PORT);
})