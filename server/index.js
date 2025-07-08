require('dotenv').config()
const express = require('express');
const app = express();
const {Router} = require('./routes/uploadChunked');

app.use(express.json());


app.use('/',Router);

app.get('/',(req,res)=>{
    res.send("hellow");
})

app.listen(process.env.PORT, ()=>{
    console.log("server is listening "+ process.env.PORT);
})