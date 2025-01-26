const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 8080;

// Variabilă globală pentru erori
let obGlobal = { obErori: null };

// Inițializare folder temporar
const vect_foldere = ["temp"];
vect_foldere.forEach((folder) => {
  const folderPath = path.join(__dirname, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
});
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

console.log("Calea folderului (__dirname):", __dirname);
console.log("Calea fișierului (__filename):", __filename);
console.log("Folderul curent de lucru (process  wd()):", process.cwd());
// Inițializare erori din JSON
function initErori() {
  const eroriPath = path.join(__dirname, "erori.json");
  if (fs.existsSync(eroriPath)) {
    let rawData = fs.readFileSync(eroriPath);
    obGlobal.obErori = JSON.parse(rawData);
    obGlobal.obErori.info_erori.forEach((eroare) => {
      eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
    });
  }
}
initErori();

// Funcție pentru afișarea erorilor
function afisareEroare(res, identificator, titlu, text, imagine) {
  let eroare = obGlobal.obErori.info_erori.find((e) => e.identificator === identificator);
  if (!eroare) eroare = obGlobal.obErori.eroare_default;

  res.status(identificator || 500).render("pagini/eroare", {
    titlu: titlu || eroare.titlu,
    text: text || eroare.text,
    imagine: imagine || eroare.imagine,
  });
}

// Middleware pentru resurse statice
app.use("/resurse", express.static(path.join(__dirname, "resurse")));

// Configurăm EJS ca motor de template-uri

// Gestionare favicon
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "resurse", "favicon.ico"));
});

// Interzicerea accesului la foldere fără fișier specificat
app.get("/resurse/*", (req, res, next) => {
  if (req.path.endsWith("/")) {
    afisareEroare(res, 403);
  } else {
    next();
  }
});
app.use("/resurse", (req, res, next) => {
  afisareEroare(res, 404);
});

// Blocare acces fișiere .ejs
app.get("/*.ejs", (req, res) => {
  afisareEroare(res, 400);
});

// Rute pentru pagini statice
app.get("/", (req, res) => {
  res.render("pagini/index");
});

app.get("/despre", (req, res) => {
  res.render("pagini/despre");
});

// Rută generală pentru orice pagină
app.get("/*", (req, res) => {
  let pagina = req.params[0];
  res.render(`pagini/${pagina}`, function (eroare, rezultatRandare) {
    if (eroare) {
      if (eroare.message.startsWith("Failed to lookup view")) {
        afisareEroare(res, 404);
      } else {
        afisareEroare(res, 500);
      }
    } else {
      res.send(rezultatRandare);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Serverul rulează la http://localhost:${PORT}`);
});
