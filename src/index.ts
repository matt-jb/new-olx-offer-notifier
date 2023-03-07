import express from "express";
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.get("/", (_, res) => {
  res.send({
    message: "Hello World!",
  });
});

app.get("/get-offers", (_, res) => {
  res.send({
    message: "/get-offers route",
  });
});

app.listen(port, () => {
  console.log(`Example app listening at port: ${port}`);
});
