CREATE TYPE categorie_carte AS ENUM ('fictiune', 'nonfictiune', 'mister', 'stiinta', 'fantastic', 'copii);

CREATE TABLE carti (
  id int AUTO_INCREMENET PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  IMAGINE VARCHAR(255),
  categorie categorie_carte,
  subcategorie VARCHAR(100),
  pret NUMERIC(10, 2),
  numar_pagini INTEGER,
  data DATE,
  tip_coperta VARCHAR(50),
  limba VARCHAR(255), 
  ilustratii BOOLEAN
);
