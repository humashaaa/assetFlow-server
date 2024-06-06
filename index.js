const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const express = require("express");
const cors = require("cors");
// const jwt = require('jsonwebtoken')
// const cookieParser = require('cookie-parser')
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wal4hcq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const employeeCollection = client.db('assetflow').collection('employee')
    const HRCollection = client.db('assetflow').collection('HR')
    const assetCollection = client.db('assetflow').collection('asset')

    // save employee details on db
    app.post('/employee', async(req, res)=>{
        const employeeData = req.body
        console.log(employeeData);
        const result = await employeeCollection.insertOne(employeeData)
        res.send(result)
      })
    // save HR details on db
    app.post('/hrManager', async(req, res)=>{
        const hrManagerData = req.body
        console.log(hrManagerData);
        const result = await HRCollection.insertOne(hrManagerData)
        res.send(result)
      })
    // save asset details on db
    app.post('/asset', async(req, res)=>{
        const assetData = req.body
        console.log(assetData);
        const result = await assetCollection.insertOne(assetData)
        res.send(result)
      })
      // get  the asset data from specific hr manager from the server
    app.get('/asset/:email', async(req, res)=>{
      const query = {email : req.params.email}
        const result = await assetCollection.find(query).toArray()
        res.send(result)
      })










    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
