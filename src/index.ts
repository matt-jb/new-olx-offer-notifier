import express, { NextFunction, Request, Response } from "express";
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

function handleAuth(req: Request, res: Response, next: NextFunction) {
  if (req.query["qs"] !== process.env.QUERY_SECRET) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  next();
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/get-offers", handleAuth, async (_, res) => {
  const renaultEspace = await handleQuery(renaultEspaceQueryString);
  const peugeot5008Petrol = await handleQuery(peugeot5008QueryString);
  const peugeot5008Diesel = await handleQuery(peugeot5008DieselQueryString);

  const response = {
    renaultEspace,
    peugeot5008Petrol,
    peugeot5008Diesel,
  };

  console.log(response);
  res.json(response);
});

async function handleQuery(queryString: string) {
  const offersInDb = await prisma.offer.findMany();
  const olxOffers = await getOffersFromOlx(queryString);

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

    await sendEmail(offers).catch((err) => {
      console.error(`Error sending email: ${err}`);
    });
  }

  const response = {
    newOffers: offersToSave.length ? offersToSave.length : 0,
    message: offersToSave.length
      ? `${offersToSave.length} offers added to the database`
      : "No new offers at this moment",
    status: "ok",
  };

  return response;
}

async function getOffersFromOlx(queryString: string) {
  const offers = await axios.get(queryString).catch((err) => {
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
      <p>Cena: ${offer.price.toLocaleString()} z??</p>
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

const renaultEspaceQueryString = `https://www.olx.pl/api/v1/offers/?offset=0&limit=50&query=renault%20espace&category_id=84&sort_by=created_at%3Adesc&filter_float_price%3Ato=80000&filter_float_year%3Afrom=2015&filter_refiners=spell_checker&filter_enum_petrol%5B0%5D=petrol`;
const peugeot5008QueryString = `https://www.olx.pl/api/v1/offers/?offset=0&limit=50&query=peugeot%205008&category_id=84&sort_by=created_at%3Adesc&filter_float_price%3Ato=80000&filter_float_year%3Afrom=2017&filter_refiners=spell_checker&filter_enum_petrol%5B0%5D=petrol`;
const peugeot5008DieselQueryString = `https://www.olx.pl/api/v1/offers/?offset=0&limit=50&query=peugeot%205008&category_id=84&filter_enum_petrol%5B0%5D=diesel&filter_float_enginepower%3Afrom=160&filter_float_enginepower%3Ato=210&filter_float_enginesize%3Afrom=1800&filter_float_enginesize%3Ato=2100&filter_float_price%3Ato=85000&filter_float_year%3Afrom=2017&filter_refiners=spell_checker&facets=%5B%7B%22field%22%3A%22region%22%2C%22fetchLabel%22%3Atrue%2C%22fetchUrl%22%3Atrue%2C%22limit%22%3A30%7D%2C%7B%22field%22%3A%22category_without_exclusions%22%2C%22fetchLabel%22%3Atrue%2C%22fetchUrl%22%3Atrue%2C%22limit%22%3A10%7D%5D`;

app.listen(port, () => {
  console.log(`App listening at port: ${port}`);
});
