require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const dns = require("dns");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// MongoDB setup
const client = new MongoClient(process.env.MONGO_URI);

client
  .connect()
  .then(() => {
    console.log("Connected to the database");

    const db = client.db("shortened_urls");
    const urls = db.collection("urls");

    app.post("/api/shorturl", (req, res) => {
      console.log("Received POST request to /api/shorturl");
      const url = req.body.url;
      const { hostname } = new URL(url);

      dns.lookup(hostname, async (err, address) => {
        if (err || !address) {
          res.json({
            error: "Invalid URL",
          });
        } else {
          console.log("DNS lookup successful");
          const urlCount = await urls.countDocuments({});
          const urlDoc = {
            url,
            short_url: urlCount + 1,
          };
          try {
            const result = await urls.insertOne(urlDoc);
            console.log(result);
            console.log(urlDoc);
            res.json({
              original_url: urlDoc.url,
              short_url: urlDoc.short_url,
            });
          } catch (error) {
            console.error("Error inserting URL into database:", error);
            res.status(500).json({ error: "Internal server error" });
          }
        }
      });
    });
    app.get("/api/shorturl/:short_url", async (req, res) => {
      const shorturl = req.params.short_url;
      const urlDoc = await urls.findOne({ short_url: parseInt(shorturl) });
      res.redirect(urlDoc.url);
    });
    app.listen(port, function () {
      console.log(`Listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
  });
