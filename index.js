const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 8080;
const sass = require('sass');
const {Pool} = require('pg')
let obGlobal = { obErori: null };

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

function getGalerie () {
  const eroriPath = path.join(__dirname, "galerie.json");
  if (fs.existsSync(eroriPath)) {
    let imagini = fs.readFileSync(eroriPath);
    imagini = JSON.parse(imagini);
    return imagini;
  }
}
function afisareEroare(res, identificator, titlu, text, imagine) {
  let eroare = obGlobal.obErori.info_erori.find((e) => e.identificator === identificator);
  if (!eroare) eroare = obGlobal.obErori.eroare_default;

  res.status(identificator || 500).render("pagini/eroare", {
    titlu: titlu || eroare.titlu,
    text: text || eroare.text,
    imagine: imagine || eroare.imagine,
  });
}

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'book_heaven',
  password: 'postgres',
  port: 5432,
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));


app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "resurse", "favicon.ico"));
});

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

app.get("/*.ejs", (req, res) => {
  afisareEroare(res, 400);
});

app.get(["/", "/home", "/index"], (req, res) => {
  res.render("pagini/index");
});

app.get("/despre", (req, res) => {
  res.render("pagini/despre");
});
app.get('/galerie', (req, res) => {
  const galerieData = getGalerie();
  const currentTime = new Date();
  const minutes = currentTime.getMinutes();
  // const sfertOra = Math.floor(minutes / 15) + 1;
  const sfertOra = 3;
  const imaginiFiltrate = galerieData.imagini.filter(img => img.sfert_ora == sfertOra).slice(0, 10);
  res.render('pagini/galerie', { imagini: imaginiFiltrate, caleGalerie: galerieData.cale_galerie });
});

app.get('/carti', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, pret, imagine FROM carti');
    res.render('pagini/carti', { carti: result.rows });
  } catch (err) {
    console.log(err)
    res.status(500).send('Database error');
  }
});
// Route: Single book details
app.get('/carti/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM carti WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.render('pagini/carte', { carte: result.rows[0] });
    } else {
      res.status(404).send('Cartea nu a fost gasita');
    }
  } catch (err) {
    res.status(500).send('Database error');
  }
});
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

global.__dirname = __dirname;
global.folderScss = path.join(__dirname, 'resurse', 'stiluri', 'scss');
global.folderCss = path.join(__dirname, 'resurse', 'stiluri','css');
global.folderBackup = path.join(__dirname, 'backup');

[global.folderScss, global.folderCss, global.folderBackup].forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

function compileazaScss(caleScss, caleCss) {
    try {
        if (!path.isAbsolute(caleScss)) {
            caleScss = path.join(global.folderScss, caleScss);
        }

        if (!caleCss) {
            const numeFisier = path.basename(caleScss, '.scss') + '.css';
            caleCss = path.join(global.folderCss, numeFisier);
        } else if (!path.isAbsolute(caleCss)) {
            caleCss = path.join(global.folderCss, caleCss);
        }

        if (fs.existsSync(caleCss)) {
            const numeFisierBackup = path.basename(caleCss);
            const caleBackup = path.join(global.folderBackup, numeFisierBackup);

            fs.copyFileSync(caleCss, caleBackup);
            console.log(`Backup creat: ${caleBackup}`);
        }

        const rezultat = sass.compile(caleScss, {
            style: 'compressed',
        });
        fs.writeFileSync(caleCss, rezultat.css);
        console.log(`Fișier compilat: ${caleCss}`);
    } catch (err) {
        console.error(`Eroare la compilare: ${err.message}`);
    }
}

function compileazaInitial() {
    const fisiereScss = fs.readdirSync(global.folderScss).filter(fisier => fisier.endsWith('.scss'));

    fisiereScss.forEach(fisier => {
        const caleScss = path.join(global.folderScss, fisier);
        compileazaScss(caleScss);
    });
}

function monitorizeazaScss() {
    fs.watch(global.folderScss, (eventType, fisier) => {
        if (eventType === 'change' && path.extname(fisier) === '.scss') {
            const caleScss = path.join(global.folderScss, fisier);
            console.log(`Fișier modificat: ${caleScss}`);
            compileazaScss(caleScss);
        }
    });

    console.log(`Monitorizare activă pentru folderul: ${global.folderScss}`);
}


compileazaInitial();
monitorizeazaScss(); 
app.listen(PORT, () => {
  console.log(`Serverul rulează la http://localhost:${PORT}`);
});
