import express from "express";
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
import { PrismaClient } from "@prisma/client";
import axios from "axios";
const prisma = new PrismaClient();

app.get("/", (_, res) => {
  res.send({
    message: "Hello World!",
  });
});

app.get("/get-offers", async (_, res) => {
  // const offersInDb = await prisma.offer.findMany();
  const olxOffers = await getOffersFromOlx();

  res.send(olxOffers);
});

async function getOffersFromOlx() {
  const offers = await axios
    .get(
      `https://www.olx.pl/api/v1/offers/?offset=0&limit=50&query=renault%20espace&category_id=84&region_id=2&sort_by=created_at%3Adesc&filter_float_price%3Ato=80000&filter_float_year%3Afrom=2015&filter_refiners=spell_checker`
    )
    .catch((err) => {
      console.error(err);
    });

  console.log(offers);

  if (!offers || offers.status !== 200) return [];
  return offers.data;
}

app.listen(port, () => {
  console.log(`App listening at port: ${port}`);
});
