const apiKey = '18f457718baa96e762f9268193f43e2b';
const baseUrl = 'https://api.themoviedb.org/3';
const imgBaseUrl = 'https://image.tmdb.org/t/p/w1280';

let currentPage = 1;
let currentGenre = '';
let searchQuery = '';
let filmes = [];
let carregando = false;

document.addEventListener('DOMContentLoaded', () => {
  const filmesContainer = document.getElementById('filmes');
  const searchInput = document.getElementById('search-input');
  const genreFilter = document.getElementById('genre-filter');

  async function buscarFilmes(page = 1) {
    if (carregando) return;
    carregando = true;

    if (page === 1) filmesContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>';

    let url = `${baseUrl}/discover/movie?api_key=${apiKey}&language=pt-BR&page=${page}`;
    if (currentGenre) url += `&with_genres=${currentGenre}`;
    if (searchQuery) {
      url = `${baseUrl}/search/movie?api_key=${apiKey}&language=pt-BR&query=${searchQuery}&page=${page}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (page === 1) filmesContainer.innerHTML = '';

      if (data.results && data.results.length > 0) {
        filmes = filmes.concat(data.results);
        exibirFilmes(data.results);
      } else if (page === 1) {
        filmesContainer.innerHTML = '<p class="text-center py-5">Nenhum filme encontrado.</p>';
      }
    } catch (error) {
      console.error("Erro ao buscar filmes:", error);
      if (page === 1) filmesContainer.innerHTML = '<p class="text-center py-5">Erro ao carregar filmes.</p>';
    } finally {
      carregando = false;
    }
  }

  function exibirFilmes(lista) {
    lista.forEach(filme => {
      if (!filme.poster_path) return;
      
      const div = document.createElement("div");
      div.className = "col-6 col-sm-4 col-md-3 col-lg-2 d-flex justify-content-center filme mb-4";
      div.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${filme.poster_path}" alt="${filme.title}" class="img-fluid" onclick="abrirModal(${filme.id})">
      `;
      filmesContainer.appendChild(div);
    });
  }

  async function abrirModal(id) {
    try {
      const [detalhes, creditos, videos] = await Promise.all([
        fetch(`${baseUrl}/movie/${id}?api_key=${apiKey}&language=pt-BR`).then(r => r.json()),
        fetch(`${baseUrl}/movie/${id}/credits?api_key=${apiKey}&language=pt-BR`).then(r => r.json()),
        fetch(`${baseUrl}/movie/${id}/videos?api_key=${apiKey}&language=pt-BR`).then(r => r.json())
      ]);

      document.getElementById('modalTitulo').innerText = detalhes.title || 'Título não disponível';
      document.getElementById('modalSinopse').innerText = detalhes.overview || 'Sinopse não disponível.';

      const elenco = creditos.cast?.slice(0, 5).map(a => `<li>${a.name}</li>`).join('') || '<li>Elenco não disponível</li>';
      document.getElementById('modalElenco').innerHTML = elenco;

      const trailer = videos.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      document.getElementById('modalTrailer').innerHTML = trailer
        ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`
        : '<p>Trailer não disponível.</p>';

      // Botão de favorito
      const modalAcoes = document.getElementById('modalAcoes');
      modalAcoes.innerHTML = '';
      
      const btnFavorito = document.createElement('button');
      btnFavorito.className = 'btn btn-danger';
      
      const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
      const jaFavoritado = favoritos.includes(id);
      
      btnFavorito.innerHTML = jaFavoritado 
        ? '<i class="bi bi-heart-fill me-2"></i> Remover dos Favoritos' 
        : '<i class="bi bi-heart me-2"></i> Adicionar aos Favoritos';
      
      btnFavorito.onclick = () => {
        toggleFavorito(id);
        btnFavorito.innerHTML = favoritos.includes(id)
          ? '<i class="bi bi-heart-fill me-2"></i> Remover dos Favoritos'
          : '<i class="bi bi-heart me-2"></i> Adicionar aos Favoritos';
      };
      
      modalAcoes.appendChild(btnFavorito);

      new bootstrap.Modal(document.getElementById('modalFilme')).show();
    } catch (error) {
      console.error("Erro ao abrir modal:", error);
      alert('Erro ao carregar detalhes do filme.');
    }
  }

  function toggleFavorito(id) {
    let favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    
    if (favoritos.includes(id)) {
      favoritos = favoritos.filter(filmeId => filmeId !== id);
    } else {
      favoritos.push(id);
    }
    
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
  }

  function checarScroll() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 300 && !carregando) {
      currentPage++;
      buscarFilmes(currentPage);
    }
  }

  
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        currentPage = 1;
        filmes = [];
        buscarFilmes();
      }, 500);
    });
  }

  if (genreFilter) {
    genreFilter.addEventListener('change', () => {
      currentGenre = genreFilter.value;
      currentPage = 1;
      filmes = [];
      buscarFilmes();
    });
  }

  async function carregarGeneros() {
    try {
      const res = await fetch(`${baseUrl}/genre/movie/list?api_key=${apiKey}&language=pt-BR`);
      const data = await res.json();
      genreFilter.innerHTML = '<option value="">Gêneros</option>';
      data.genres.forEach(genero => {
        const opt = document.createElement('option');
        opt.value = genero.id;
        opt.textContent = genero.name;
        genreFilter.appendChild(opt);
      });
    } catch (error) {
      console.error("Erro ao carregar gêneros:", error);
    }
  }

  async function carregarFilmesDestaque() {
    try {
      const res = await fetch(`${baseUrl}/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`);
      const data = await res.json();
      const destaques = data.results.slice(0, 5);

      const carousel = document.getElementById('carousel-inner');
      carousel.innerHTML = '';

      destaques.forEach((filme, index) => {
        if (!filme.backdrop_path) return;
        
        const item = document.createElement('div');
        item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        item.innerHTML = `
          <img src="${imgBaseUrl}${filme.backdrop_path}" class="d-block w-100" alt="${filme.title}" style="height: 400px; object-fit: cover; cursor:pointer" onclick="abrirModal(${filme.id})">
          <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded">
            <h5>${filme.title}</h5>
          </div>
        `;
        carousel.appendChild(item);
      });
    } catch (error) {
      console.error("Erro ao carregar destaques:", error);
    }
  }

  async function carregarFavoritos() {
    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    filmesContainer.innerHTML = '';
    
    if (favoritos.length === 0) {
      filmesContainer.innerHTML = '<p class="text-center py-5">Nenhum filme favoritado ainda.</p>';
      return;
    }

    try {
      const promises = favoritos.map(id => 
        fetch(`${baseUrl}/movie/${id}?api_key=${apiKey}&language=pt-BR`).then(r => r.json())
      );
      const filmesFavoritos = await Promise.all(promises);
      exibirFilmes(filmesFavoritos.filter(f => f.poster_path));
    } catch (error) {
      console.error("Erro ao carregar favoritos:", error);
      filmesContainer.innerHTML = '<p class="text-center py-5">Erro ao carregar favoritos.</p>';
    }
  }

  if (window.location.pathname.includes('favoritos.html')) {
    carregarFavoritos();
  } else {
    buscarFilmes();
    carregarGeneros();
    carregarFilmesDestaque();
    window.addEventListener('scroll', checarScroll);
  }
});

document.querySelectorAll('.filme img').forEach(img => {
  img.addEventListener('load', function() {
    this.closest('.filme').classList.add('loaded');
  });
  
  if (img.complete) {
    img.closest('.filme').classList.add('loaded');
  }
});

window.abrirModal = function(id) {
  const event = new Event('DOMContentLoaded');
  document.dispatchEvent(event);
  document.addEventListener('DOMContentLoaded', () => {
    const func = () => abrirModal(id);
    func();
  }, { once: true });
  window.abrirModal = async function(id) {
    const [detalhes, creditos, videos] = await Promise.all([
      fetch(`${baseUrl}/movie/${id}?api_key=${apiKey}&language=pt-BR`).then(r => r.json()),
      fetch(`${baseUrl}/movie/${id}/credits?api_key=${apiKey}&language=pt-BR`).then(r => r.json()),
      fetch(`${baseUrl}/movie/${id}/videos?api_key=${apiKey}&language=pt-BR`).then(r => r.json())
    ]);
  
    document.getElementById('modalTitulo').innerText = detalhes.title || 'Título não disponível';
    document.getElementById('modalSinopse').innerText = detalhes.overview || 'Sinopse não disponível.';
  
    const elenco = creditos.cast?.slice(0, 5).map(a => `<li>${a.name}</li>`).join('') || '<li>Elenco não disponível</li>';
    document.getElementById('modalElenco').innerHTML = elenco;
  
    const trailer = videos.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    document.getElementById('modalTrailer').innerHTML = trailer
      ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`
      : '<p>Trailer não disponível.</p>';
  
    const modalAcoes = document.getElementById('modalAcoes');
    modalAcoes.innerHTML = '';
    
    const favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
    const btnFavorito = document.createElement('button');
    btnFavorito.className = 'btn btn-danger';
    btnFavorito.innerHTML = favoritos.includes(id)
      ? '<i class="bi bi-heart-fill me-2"></i> Remover dos Favoritos'
      : '<i class="bi bi-heart me-2"></i> Adicionar aos Favoritos';
    
    btnFavorito.onclick = () => {
      toggleFavorito(id);
      btnFavorito.innerHTML = favoritos.includes(id)
        ? '<i class="bi bi-heart-fill me-2"></i> Remover dos Favoritos'
        : '<i class="bi bi-heart me-2"></i> Adicionar aos Favoritos';
    };
    
    modalAcoes.appendChild(btnFavorito);
  
    new bootstrap.Modal(document.getElementById('modalFilme')).show();
    
  };
};