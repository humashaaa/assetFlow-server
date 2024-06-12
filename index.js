const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://assignment-12-ef2db.web.app"],
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
    const assetCollection = client.db("assetflow").collection("asset");
    const userCollection = client.db("assetflow").collection("users");

    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // token verify
    const verifiedToken = (req, res, next) => {
      console.log("inside verified token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //  use verify hr after verify token
    const verifyHr = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isHr = user?.role === "hr";
      if (!isHr) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //  use verify employee after verify token
    const verifyEmployee = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isEmployee = user?.role === "employee";
      if (!isEmployee) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // payment
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // hr

    app.get("/users/hr/:email", verifiedToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let hr = false;
      if (user) {
        hr = user?.role === "hr";
      }
      res.send({ hr });
    });

    app.get("/user/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // don't save existing  user in db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUsers = await userCollection.findOne(query);
      if (existingUsers) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // post affilite employee
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const user = req.body
      console.log(user);
      const updatedDoc = {
        $set: {
          isJoin: "true",
          hrEmail: user?.email,
          companyName : user?.companyName,
         
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // update user profile

    app.patch("/user/:email", async (req, res) => {
      const filter = { email: req.params.email };

      const user = req.body
      // console.log({user});
      const updatedDoc = {
        $set: {
          name : user.name,
          photo : user.photo
        }
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });




    // remove employee from a team

    app.patch("/users/:id/remove", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const user = req.body
      // console.log({user});
      const updatedDoc = {
        $set: {
          isJoin: "false"
        },
        $unset: {
          hrEmail: "",
          companyName : ""
        },
        // $inc : { "user.limit": -1 } ,
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


    

    // asset related api

    app.get("/assets", async (req, res) => {
      const result = await assetCollection.find().toArray();
      res.send(result);
    });

    app.get("/asset-detail/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log({ query });
      const result = await assetCollection.findOne(query);
      console.log({ result });
      res.send(result);
    });
    // save asset details on db
    app.post("/asset", async (req, res) => {
      const assetData = req.body;
      console.log(assetData);
      const result = await assetCollection.insertOne(assetData);
      res.send(result);
    });
    // get  the asset data from specific hr manager from the server
    app.get("/asset/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await assetCollection.find(query).toArray();
      res.send(result);
    });

    // // for filter
    // app.get("/asset/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const filter = req.query.filter;
    //   let query = {};
    //   if (filter) query = { category: filter, email };
    //   console.log(query);
    //   const result = await assetCollection.find(query).toArray();
    //   res.send(result);
    // });
   

    // delete asset data from db
    app.delete("/assets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assetCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/assets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assetCollection.findOne(query);
      res.send(result);
    });

    //  update asset
    app.patch("/assets/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          productName: item.productName,
          productQuantity: item.productQuantity,
          productType: item.productType,
          assetAdded: item.assetAdded,
        },
      };
      const result = await assetCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // get all the assets employee requested
    app.get("/asset/requestAsset/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await assetCollection.find(query).toArray();
      res.send(result);
    });

// update asset request page
app.patch("/assets/requestAsset/:id", async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      requestStatus : 'pending',
      requestDate : new Date().toLocaleDateString(),
      addNote : item.addNote,
      requesterName : item.requesterName,
      requesterEmail : item.requesterEmail,
      addNote : item.addNote
    },
  };
  const result = await assetCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

// update asset for all request page

app.patch("/assets/:id/allRequest", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      requestStatus : 'Approved',
      approveDate : new Date().toLocaleDateString()
    },
  };
  const result = await assetCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

// reject update asset for all request page
app.patch("/assets/:id/reject", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      requestStatus : 'Rejected',
    },
  };
  const result = await assetCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

// return product
app.patch("/assets/return/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      requestStatus : 'Returned',
    },
  };
  const result = await assetCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

// pending request cancel
app.patch("/assets/cancel/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $unset: {
      requestStatus : '',
      requestDate : '',
      addNote : '',
      requesterName : '',
      requesterEmail : '',
      addNote : ''    },
  };
  const result = await assetCollection.updateOne(filter, updatedDoc);
  res.send(result);
});






    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
