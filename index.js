require('dotenv').config()
const express = require('express');
const single = require('./routes/uploadSingle');
const app = express();

app.use(express.json());


app.use('/', single);

app.get('/',(req,res)=>{
    res.send("hellow");
})

app.listen(process.env.PORT, ()=>{
    console.log("server is listening "+ process.env.PORT);
})