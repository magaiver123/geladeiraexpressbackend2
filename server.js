const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const app = express();
const session = require('express-session');
const PORT = 3000;
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


app.use(session({
  secret: 'chave-secreta-supersecreta',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 }
}));

app.use(bodyParser.json());
app.use(express.static(__dirname + '/../'));

app.post('/register', async (req, res) => {
  const { cpf, email, telefone, recaptchaResponse } = req.body;

  const recaptchaVerifyURL = 'https://www.google.com/recaptcha/api/siteverify';
  const secret = '6LceC1orAAAAAEXxrPMJaA_JXEExft70Dc3b4c4k';

  try {
    const response = await fetch(recaptchaVerifyURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${recaptchaResponse}`
    });

    const data = await response.json();
    if (!data.success) {
      return res.status(400).send('reCAPTCHA inválido');
    }

    const user = { cpf, email, telefone, horaCadastro: new Date().toISOString() };
    req.session.user = user;

    const log = {
      cpf,
      email,
      telefone,
      dataHora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    };

    const logPath = require('path').join(__dirname, 'logs.json');
    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath));
    }
    logs.push(log);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

   res.status(200).send("Cadastro concluído com sucesso.");

 } catch (err) {
  console.error('Erro completo ao registrar:', err);
  res.status(500).send(err.message || 'Erro interno');
}

});

app.post('/destravar', (req, res) => {
  const ESP_IP = '192.168.0.123'; // Substitua com IP do ESP real
  http.get(`http://${ESP_IP}/destravar`, (espRes) => {
    let data = "";
    espRes.on("data", chunk => data += chunk);
    espRes.on("end", () => res.send("Comando enviado à geladeira: " + data));
  }).on("error", err => {
    res.status(500).send("Erro ao contatar a geladeira.");
  });
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
