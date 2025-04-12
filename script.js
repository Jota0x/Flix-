const apiKey = '18f457718baa96e762f9268193f43e2b';
const baseUrl = 'https://api.themoviedb.org/3';
const imgBaseUrl = 'https://image.tmdb.org/t/p/w1280';

let currentPage = 1;
let currentGenre = '';
let searchQuery = '';
let filmes = [];
let carregando = false;

const filmesContainer = document.getElementById('filmes');
const searchInput = document.getElementById('search-input');
const genreFilter = document.getElementById('genre-filter');

async function buscarFilmes(page = 1) {
  if (carregando) return;
  carregando = true;

  // Construção da URL
  let url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&page=${page}`;
  if (currentGenre) url += `&with_genres=${currentGenre}`;
  if (searchQuery) {
    url = `${baseUrl}/search/movie?api_key=${apiKey}&language=pt-BR&query=${searchQuery}&page=${page}`;
  }

  console.log('Buscando URL:', url);  // Para testar

  // Chama a API
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.results && data.results.length > 0) {
    filmes = filmes.concat(data.results);
    exibirFilmes(data.results);
  } else {
    console.log("Nenhum filme encontrado");
  }

  carregando = false;
}

function exibirFilmes(lista) {
  lista.forEach(filme => {
    const div = document.createElement('div');
    div.className = 'filme';
    div.innerHTML = `
      <img src="${imgBaseUrl}${filme.poster_path}" alt="${filme.title}" onclick="abrirModal(${filme.id})">
    `;
    filmesContainer.appendChild(div);
  });
}

async function abrirModal(id) {
  const [detalhes, creditos, videos] = await Promise.all([
    fetch(`${baseUrl}/movie/${id}?api_key=${apiKey}&language=pt-BR`).then(r => r.json()),
    fetch(`${baseUrl}/movie/${id}/credits?api_key=${apiKey}&language=pt-BR`).then(r => r.json()),
    fetch(`${baseUrl}/movie/${id}/videos?api_key=${apiKey}&language=pt-BR`).then(r => r.json())
  ]);

  document.getElementById('modalTitulo').innerText = detalhes.title;
  document.getElementById('modalSinopse').innerText = detalhes.overview;

  const elenco = creditos.cast.slice(0, 5).map(a => `<li>${a.name}</li>`).join('');
  document.getElementById('modalElenco').innerHTML = elenco;

  const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  document.getElementById('modalTrailer').innerHTML = trailer
    ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`
    : '<p>Trailer não disponível.</p>';

  new bootstrap.Modal(document.getElementById('modalFilme')).show();
}

// Scroll infinito
function checarScroll() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 300 && !carregando) {
      currentPage++;
      buscarFilmes(currentPage);
    }
  }

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  currentPage = 1;
  filmes = [];
  filmesContainer.innerHTML = '';
  buscarFilmes();
});

genreFilter.addEventListener('change', () => {
  currentGenre = genreFilter.value;
  currentPage = 1;
  filmes = [];
  filmesContainer.innerHTML = '';
  buscarFilmes();
});

async function carregarGeneros() {
  const res = await fetch(`${baseUrl}/genre/movie/list?api_key=${apiKey}&language=pt-BR`);
  const data = await res.json();
  data.genres.forEach(genero => {
    const opt = document.createElement('option');
    opt.value = genero.id;
    opt.textContent = genero.name;
    genreFilter.appendChild(opt);
  });
}

async function carregarFilmesDestaque() {
    const res = await fetch(`${baseUrl}/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`);
    const data = await res.json();
    const destaques = data.results.slice(0, 5); // primeiros 5
  
    const carousel = document.getElementById('carousel-inner');
    carousel.innerHTML = '';
  
    destaques.forEach((filme, index) => {
      const item = document.createElement('div');
      item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
      item.innerHTML = `
        <img src="${imgBaseUrl}${filme.backdrop_path}" class="d-block w-100" alt="${filme.title}" style="border-radius:10px; cursor:pointer" onclick="abrirModal(${filme.id})">
      `;
      carousel.appendChild(item);
    });
  }
  

async function carregarFavoritos() {
  const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
  filmesContainer.innerHTML = '';
  for (let id of favoritos) {
    const res = await fetch(`${baseUrl}/movie/${id}?api_key=${apiKey}&language=pt-BR`);
    const filme = await res.json();
    exibirFilmes([filme]);
  }
}

// Roteamento
if (window.location.pathname.includes('favoritos.html')) {
  carregarFavoritos();
} else {
  buscarFilmes();
  carregarGeneros();
  window.addEventListener('scroll', checarScroll);
  carregarFilmesDestaque();
}
window.addEventListener('scroll', checarScroll);