import express from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import nodemailer from "nodemailer";
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
const prisma = new PrismaClient();

interface Offer {
  id: number;
  title: string;
  price: number;
  url: string;
  year: number;
  milage: number;
}

app.get("/", async (_, res) => {
  res.send({
    message: "Hello World!",
  });
});

app.get("/get-offers", async (_, res) => {
  const offersInDb = await prisma.offer.findMany();
  const olxOffers = await getOffersFromOlx();

  const offersToSave = olxOffers?.data?.filter((offer: Offer) => {
    const offerInDb = offersInDb.find((offerInDb) => {
      return offerInDb.id === offer.id;
    });
    return !offerInDb;
  });

  if (offersToSave.length > 0) {
    const offers = offersToSave.map((offer: any) => {
      return {
        id: offer.id,
        url: offer.url,
        title: offer.title,
        price:
          parseInt(
            offer.params.find((param: any) => param.key === "price").value.value
          ) || 0,
        year:
          parseInt(
            offer.params.find((param: any) => param.key === "year").value.key
          ) || 0,
        milage:
          parseInt(
            offer.params.find((param: any) => param.key === "milage").value.key
          ) || undefined,
      };
    });

    await prisma.offer.createMany({
      data: offers,
    });

    const email = await sendEmail(offers);
    // TODO: email error handling

    res.send({
      newOffers: offersToSave.length,
      message: "New offers added successfully",
      status: "ok",
    });
  }

  res.send({
    newOffers: 0,
    message: "No new offers at this moment",
    status: "ok",
  });
});

async function getOffersFromOlx() {
  const offers = await axios
    .get(
      `https://www.olx.pl/api/v1/offers/?offset=0&limit=50&query=renault%20espace&category_id=84&region_id=2&sort_by=created_at%3Adesc&filter_float_price%3Ato=80000&filter_float_year%3Afrom=2015&filter_refiners=spell_checker`
    )
    .catch((err) => {
      console.error(err);
    });

  if (!offers || offers.status !== 200) return [];
  return offers.data;
}

async function sendEmail(offers: Offer[]) {
  const body = offers.map((offer) => {
    return `
    <div>
      <h3>${offer.title}</h3>
      <p>Cena: ${offer.price.toLocaleString()} zł</p>
      <p>Rok produkcji: ${offer.year}</p>
      <p>Przebieg: ${offer.milage.toLocaleString()} km</p>
      <a href="${offer.url}">${offer.url}</a>
    </div>
    `;
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TARGETS,
    subject: `Nowe oferty: ${offers.length}`,
    text: JSON.stringify(offers, null, 2),
    html: body.join("<br />"),
  });

  return info;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.listen(port, () => {
  console.log(`App listening at port: ${port}`);
});
