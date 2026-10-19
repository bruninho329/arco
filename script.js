const BANCO = "MinhasTabelasDB";
const VERSAO_BANCO = 1;

const CORES = {
  amarelo: [9, 10],
  vermelho: [7, 8],
  azul: [5, 6],
  preto: [3, 4]
};

let db;
let tabelas = [];
let tabelaAtualId = null;

const $ = id => document.getElementById(id);

function gerarId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function novaEstrutura(nome) {
  return {
    id: gerarId(),
    nome,
    valores: Array.from({ length: 10 }, () => [0, 0, 0]),
    criadaEm: Date.now()
  };
}

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, VERSAO_BANCO);

    pedido.onupgradeneeded = () => {
      const banco = pedido.result;

      if (!banco.objectStoreNames.contains("tabelas")) {
        banco.createObjectStore("tabelas", { keyPath: "id" });
      }
    };

    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

function obterTodas() {
  return new Promise((resolve, reject) => {
    const transacao = db.transaction("tabelas", "readonly");
    const pedido = transacao.objectStore("tabelas").getAll();

    pedido.onsuccess = () => resolve(pedido.result || []);
    pedido.onerror = () => reject(pedido.error);
  });
}

function salvarNoBanco(tabela) {
  return new Promise((resolve, reject) => {
    const transacao = db.transaction("tabelas", "readwrite");
    transacao.objectStore("tabelas").put(tabela);

    transacao.oncomplete = () => resolve();
    transacao.onerror = () => reject(transacao.error);
    transacao.onabort = () => reject(transacao.error);
  });
}

function excluirDoBanco(id) {
  return new Promise((resolve, reject) => {
    const transacao = db.transaction("tabelas", "readwrite");
    transacao.objectStore("tabelas").delete(id);

    transacao.oncomplete = () => resolve();
    transacao.onerror = () => reject(transacao.error);
    transacao.onabort = () => reject(transacao.error);
  });
}

function informarStatus(mensagem, erro = false) {
  $("status").textContent = mensagem;
  $("status").style.color = erro ? "#b42323" : "#287443";
}

async function salvarAtual() {
  const tabela = tabelas.find(t => t.id === tabelaAtualId);
  if (!tabela) return;

  try {
    await salvarNoBanco(tabela);
    informarStatus("Salvo neste dispositivo");
  } catch (erro) {
    console.error(erro);
    informarStatus("Erro ao salvar os dados", true);
  }
}

function classeDaCor(valor) {
  if (CORES.amarelo.includes(valor)) return "amarelo";
  if (CORES.vermelho.includes(valor)) return "vermelho";
  if (CORES.azul.includes(valor)) return "azul";
  if (CORES.preto.includes(valor)) return "preto";
  return "";
}

function desenharLista() {
  const lista = $("listaTabelas");
  lista.replaceChildren();

  if (tabelas.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "vazio";
    aviso.textContent = "Nenhuma tabela criada.";
    lista.appendChild(aviso);
    return;
  }

  for (const tabela of tabelas) {
    const botao = document.createElement("button");
    botao.className = "item-tabela";

    if (tabela.id === tabelaAtualId) {
      botao.classList.add("ativa");
    }

    const nome = document.createElement("div");
    nome.textContent = tabela.nome;

    const total = tabela.valores.reduce(
      (soma, linha) => soma + linha.reduce((a, b) => a + b, 0),
      0
    );

    const detalhe = document.createElement("small");
    detalhe.textContent = `Total: ${total}`;

    botao.append(nome, detalhe);

    botao.addEventListener("click", () => {
      tabelaAtualId = tabela.id;
      desenharTudo();
    });

    lista.appendChild(botao);
  }
}

function desenharTabela() {
  const corpo = $("corpoTabela");
  corpo.replaceChildren();

  const tabela = tabelas.find(t => t.id === tabelaAtualId);
  if (!tabela) return;

  tabela.valores.forEach(valores => {
    valores.sort((a, b) => b - a);
  });

  const totalGeral = tabela.valores.reduce(
    (soma, linha) => soma + linha.reduce((a, b) => a + b, 0),
    0
  );

  let totalNotasAltas = 0;

  tabela.valores.forEach((valores, indiceLinha) => {
    const tr = document.createElement("tr");

    for (let coluna = 0; coluna < 3; coluna++) {
      const td = document.createElement("td");
      td.className = "editavel";

      const valor = valores[coluna];
      const cor = classeDaCor(valor);

      if (cor) td.classList.add(cor);

      const select = document.createElement("select");
      select.setAttribute(
        "aria-label",
        `Linha ${indiceLinha + 1}, valor ${coluna + 1}`
      );

      for (let numero = 0; numero <= 10; numero++) {
        const opcao = document.createElement("option");
        opcao.value = String(numero);
        opcao.textContent = String(numero);

        if (numero === valor) {
          opcao.selected = true;
        }

        select.appendChild(opcao);
      }

      select.addEventListener("change", async () => {
        tabela.valores[indiceLinha][coluna] = Number(select.value);

        tabela.valores[indiceLinha].sort((a, b) => b - a);

        await salvarAtual();
        desenharTabela();
        desenharLista();
      });

      td.appendChild(select);
      tr.appendChild(td);
    }

    const somaLinha = valores.reduce(
      (soma, valor) => soma + valor,
      0
    );

    const tdSoma = document.createElement("td");
    tdSoma.className = "soma-linha";
    tdSoma.textContent = String(somaLinha);
    tr.appendChild(tdSoma);

    const quantidadeAltas = valores.filter(
      valor => valor === 9 || valor === 10
    ).length;

    totalNotasAltas += quantidadeAltas;

    const tdQuantidade = document.createElement("td");
    tdQuantidade.className = "quantidade-altas";
    tdQuantidade.textContent = String(quantidadeAltas);
    tr.appendChild(tdQuantidade);

    if (indiceLinha === 0) {
      const tdTotal = document.createElement("td");
      tdTotal.className = "total-geral";
      tdTotal.rowSpan = tabela.valores.length;
      tdTotal.textContent = String(totalGeral);
      tr.appendChild(tdTotal);
    }

    corpo.appendChild(tr);
  });

  // Linha final: sem somatórios nos três primeiros campos.
  const linhaTotal = document.createElement("tr");
  linhaTotal.className = "linha-totais";

  for (let i = 0; i < 3; i++) {
    const tdVazio = document.createElement("td");
    tdVazio.className = "celula-total-vazia";
    linhaTotal.appendChild(tdVazio);
  }

  const tdSomaFinal = document.createElement("td");
  tdSomaFinal.className = "celula-total-coluna";
  tdSomaFinal.textContent = String(totalGeral);
  linhaTotal.appendChild(tdSomaFinal);

  const tdTotalAltas = document.createElement("td");
  tdTotalAltas.className = "celula-total-coluna";
  tdTotalAltas.textContent = String(totalNotasAltas);
  linhaTotal.appendChild(tdTotalAltas);

  const tdTotalGeralVazio = document.createElement("td");
  tdTotalGeralVazio.className = "celula-total-vazia";
  linhaTotal.appendChild(tdTotalGeralVazio);

  corpo.appendChild(linhaTotal);
}

function desenharTudo() {
  const tabela = tabelas.find(t => t.id === tabelaAtualId);

  if (!tabela) {
    $("tituloTabela").textContent = "Nenhuma tabela";
    $("descricaoTabela").textContent = "Crie uma tabela para começar.";
    $("corpoTabela").replaceChildren();
    desenharLista();
    return;
  }

  $("tituloTabela").textContent = tabela.nome;
  $("descricaoTabela").textContent = "Edite os valores abaixo.";

  desenharLista();
  desenharTabela();
}

async function criarTabela() {
  const nomeDigitado = prompt("Qual será o nome da nova tabela?");
  if (nomeDigitado === null) return;

  const nome = nomeDigitado.trim();

  if (!nome) {
    alert("Digite um nome para a tabela.");
    return;
  }

  const tabela = novaEstrutura(nome);

  tabelas.push(tabela);
  tabelaAtualId = tabela.id;

  await salvarAtual();
  desenharTudo();
}

async function renomearTabela() {
  const tabela = tabelas.find(t => t.id === tabelaAtualId);
  if (!tabela) return;

  const nomeDigitado = prompt("Novo nome da tabela:", tabela.nome);
  if (nomeDigitado === null) return;

  const nome = nomeDigitado.trim();

  if (!nome) {
    alert("O nome não pode ficar vazio.");
    return;
  }

  tabela.nome = nome;

  await salvarAtual();
  desenharTudo();
}

async function excluirTabela() {
  const tabela = tabelas.find(t => t.id === tabelaAtualId);
  if (!tabela) return;

  if (!confirm(
    `Deseja excluir a tabela "${tabela.nome}"? Essa ação não pode ser desfeita.`
  )) {
    return;
  }

  try {
    await excluirDoBanco(tabela.id);
    tabelas = tabelas.filter(t => t.id !== tabela.id);

    if (tabelas.length === 0) {
      const primeira = novaEstrutura("Minha tabela");
      tabelas.push(primeira);
      tabelaAtualId = primeira.id;
      await salvarNoBanco(primeira);
    } else {
      tabelaAtualId = tabelas[0].id;
    }

    informarStatus("Tabela excluída");
    desenharTudo();
  } catch (erro) {
    console.error(erro);
    informarStatus("Erro ao excluir", true);
  }
}

function baixarArquivo(nome, conteudo) {
  const arquivo = new Blob(
    [conteudo],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = nome;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportarBackup() {
  const backup = {
    formato: "minhas-tabelas",
    versao: 1,
    tabelas
  };

  baixarArquivo(
    "backup-minhas-tabelas.json",
    JSON.stringify(backup, null, 2)
  );
}

function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportarPdf() {
  const tabela = tabelas.find(item => item.id === tabelaAtualId);

  if (!tabela) {
    alert("Selecione uma tabela antes de exportar.");
    return;
  }

  const janela = window.open("", "_blank");

  if (!janela) {
    alert(
      "O navegador bloqueou a janela do PDF. Permita pop-ups para este site e tente novamente."
    );
    return;
  }

  const valores = tabela.valores.map(
    linha => [...linha].sort((a, b) => b - a)
  );

  const totalGeral = valores.reduce(
    (soma, linha) => soma + linha.reduce((a, b) => a + b, 0),
    0
  );

  const totalNotasAltas = valores.reduce(
    (soma, linha) =>
      soma + linha.filter(valor => valor === 9 || valor === 10).length,
    0
  );

  const linhasHtml = valores.map((linha, indice) => {
    const somaLinha = linha.reduce(
      (soma, valor) => soma + valor,
      0
    );

    const quantidadeAltas = linha.filter(
      valor => valor === 9 || valor === 10
    ).length;

    const celulasValores = linha
      .map(valor => `<td>${valor}</td>`)
      .join("");

    const totalGeralCell = indice === 0
      ? `<td class="total-geral" rowspan="${valores.length}">${totalGeral}</td>`
      : "";

    return `
      <tr>
        ${celulasValores}
        <td>${somaLinha}</td>
        <td>${quantidadeAltas}</td>
        ${totalGeralCell}
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${escaparHtml(tabela.nome)}</title>

<style>
  @page {
    size: A4 landscape;
    margin: 12mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    margin: 0;
    background: #fff;
  }

  h1 {
    margin: 0 0 5px;
    font-size: 22px;
    overflow-wrap: anywhere;
    color: #000;
  }

  .data {
    margin: 0 0 18px;
    color: #000;
    font-size: 11px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    border: 1px solid #000;
    padding: 9px 6px;
    text-align: center;
    background: #fff;
    color: #000;
  }

  th {
    font-size: 12px;
    font-weight: bold;
  }

  td {
    height: 34px;
    font-size: 12px;
  }

  .total-geral {
    font-weight: bold;
    font-size: 17px;
    vertical-align: middle;
  }

  .linha-totais td {
    font-weight: bold;
    background: #fff;
    color: #000;
  }

  .nota {
    margin-top: 12px;
    font-size: 10px;
    color: #000;
  }

  @media print {
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
</style>
</head>

<body>
  <h1>${escaparHtml(tabela.nome)}</h1>

  <p class="data">
    Exportado em ${new Date().toLocaleDateString("pt-BR")}
  </p>

  <table>
    <thead>
      <tr>
        <th>Valor 1</th>
        <th>Valor 2</th>
        <th>Valor 3</th>
        <th>Soma da linha</th>
        <th>Qtd. 9 e 10</th>
        <th>Total geral</th>
      </tr>
    </thead>

    <tbody>
      ${linhasHtml}

      <tr class="linha-totais">
        <td></td>
        <td></td>
        <td></td>
        <td>${totalGeral}</td>
        <td>${totalNotasAltas}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <p class="nota">Gerado pelo Minhas Tabelas.</p>
</body>
</html>`;

  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  janela.onload = () => {
    janela.focus();
    janela.print();
  };
}

function validarTabela(item) {
  if (
    !item ||
    typeof item.nome !== "string" ||
    !Array.isArray(item.valores)
  ) {
    return false;
  }

  if (item.valores.length !== 10) return false;

  return item.valores.every(linha =>
    Array.isArray(linha) &&
    linha.length === 3 &&
    linha.every(valor =>
      Number.isInteger(valor) &&
      valor >= 0 &&
      valor <= 10
    )
  );
}

async function importarBackup(arquivo) {
  try {
    const texto = await arquivo.text();
    const dados = JSON.parse(texto);

    if (
      !dados ||
      dados.formato !== "minhas-tabelas" ||
      !Array.isArray(dados.tabelas) ||
      !dados.tabelas.every(validarTabela)
    ) {
      throw new Error("Formato de backup inválido.");
    }

    if (!confirm(
      "As tabelas do arquivo serão adicionadas às tabelas atuais. Deseja continuar?"
    )) {
      return;
    }

    for (const item of dados.tabelas) {
      const importada = {
        id: gerarId(),
        nome: item.nome.trim() || "Tabela importada",
        valores: item.valores.map(linha => [...linha]),
        criadaEm: Date.now()
      };

      tabelas.push(importada);
      await salvarNoBanco(importada);
      tabelaAtualId = importada.id;
    }

    informarStatus("Backup importado");
    desenharTudo();
  } catch (erro) {
    console.error(erro);
    alert(
      "Não foi possível importar. Confira se o arquivo é um backup válido."
    );
  } finally {
    $("arquivoBackup").value = "";
  }
}

async function iniciar() {
  try {
    db = await abrirBanco();
    tabelas = await obterTodas();

    if (tabelas.length === 0) {
      const primeira = novaEstrutura("Minha tabela");

      tabelas.push(primeira);
      tabelaAtualId = primeira.id;

      await salvarNoBanco(primeira);
    } else {
      tabelas.sort((a, b) => a.criadaEm - b.criadaEm);
      tabelaAtualId = tabelas[0].id;
    }

    $("novaTabela").addEventListener("click", criarTabela);
    $("renomear").addEventListener("click", renomearTabela);
    $("excluir").addEventListener("click", excluirTabela);
    $("exportar").addEventListener("click", exportarBackup);
    $("exportarPdf").addEventListener("click", exportarPdf);

    $("importar").addEventListener("click", () => {
      $("arquivoBackup").click();
    });

    $("arquivoBackup").addEventListener("change", event => {
      const arquivo = event.target.files[0];
      if (arquivo) importarBackup(arquivo);
    });

    desenharTudo();
    informarStatus("Salvo neste dispositivo");

    if (
      "serviceWorker" in navigator &&
      location.protocol !== "file:"
    ) {
      navigator.serviceWorker.register("./sw.js").catch(erro => {
        console.warn(
          "Não foi possível registrar o service worker:",
          erro
        );
      });
    }
  } catch (erro) {
    console.error(erro);
    informarStatus("Não foi possível abrir o armazenamento", true);

    alert(
      "O armazenamento não pôde ser iniciado. Abra o projeto pelo Live Server no VS Code."
    );
  }
}

iniciar();

