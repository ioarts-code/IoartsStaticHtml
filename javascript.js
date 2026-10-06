const DEFAULT_CONFIG = {
  endpoint: 'https://eu-west-2.cdn.hygraph.com/content/cmog3w3va0oy007jqcj9c8v7x/master',
  authToken: '',
};

function sanitizeHygraphConfig(config = {}) {
  const endpoint = String(config.endpoint || DEFAULT_CONFIG.endpoint || '').trim();
  const authToken = String(config.authToken || '').trim();

  return {
    endpoint: endpoint || DEFAULT_CONFIG.endpoint,
    authToken,
  };
}

function clearHygraphAuthToken() {
  try {
    localStorage.removeItem('basic_ioarts_hygraph');
  } catch {
    // Ignore storage errors.
  }

  if (window.__HYGRAPH_CONFIG__) {
    window.__HYGRAPH_CONFIG__ = {
      ...window.__HYGRAPH_CONFIG__,
      authToken: '',
    };
  }
}

function getStoredConfig() {
  try {
    const raw = localStorage.getItem('basic_ioarts_hygraph');
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object' && parsed.authToken && (parsed.authToken.includes('YOUR_') || parsed.authToken === 'undefined')) {
      clearHygraphAuthToken();
      return {};
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getHygraphConfig() {
  return sanitizeHygraphConfig({
    ...DEFAULT_CONFIG,
    ...getStoredConfig(),
    ...(window.__HYGRAPH_CONFIG__ || {}),
  });
}

function setHygraphConfig(nextConfig) {
  const merged = sanitizeHygraphConfig({
    ...getHygraphConfig(),
    ...(nextConfig || {}),
  });

  window.__HYGRAPH_CONFIG__ = merged;

  try {
    localStorage.setItem('basic_ioarts_hygraph', JSON.stringify(merged));
  } catch {
    // Ignore storage errors.
  }

  return merged;
}

const productGrid = document.getElementById('product-grid');
const heroCarousel = document.getElementById('hero-carousel');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreButton = document.getElementById('load-more-products');
const categoryFilters = document.getElementById('category-filters');
const colorTypeFilters = document.getElementById('color-type-filters');

const FEATURED_PRODUCT_SLUGS = ['t-shirt-cells', 'for-the-horde',];
const PRODUCT_GRID_CATEGORY = 'vectors';
const PRODUCT_PAGE_SIZE = 6;
let productOffset = 0;
let isLoadingMoreProducts = false;
let loadedProducts = [];
let colorTypeOptions = [];
let activeCategoryFilter = 'all';
let activeColorTypeFilter = 'all';

function getProductUrl(product) {
  const slug = typeof product === 'string' ? product : product?.slug;
  const category = typeof product === 'string' ? null
    : product?.categories?.find((item) => item?.slug === PRODUCT_GRID_CATEGORY)
      || product?.categories?.find((item) => item?.slug !== 'hero' && item?.slug !== 't-shirt')
      || product?.categories?.[0];
  const categoryPath = typeof product === 'string' ? '' : `${category?.slug || PRODUCT_GRID_CATEGORY}/`;
  return `/products/${categoryPath}${encodeURIComponent(slug || '')}`;
}

function getFeaturedProducts(products) {
  const order = new Map(FEATURED_PRODUCT_SLUGS.map((slug, index) => [slug, index]));
  return (products || [])
    .filter((product) => order.has(product?.slug))
    .sort((first, second) => order.get(first.slug) - order.get(second.slug));
}

function getProductCategory(product) {
  const category = product?.categories?.find((item) => item?.slug === 'vectors')
    || product?.categories?.find((item) => item?.slug !== 'hero' && item?.slug !== 't-shirt')
    || product?.categories?.[0];
  return category?.name || 'Vectors';
}

function renderFilterGroup(container, options, activeValue, onChange) {
  if (!container) return;

  container.replaceChildren();
  options.forEach(({ value, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter${value === activeValue ? ' filter--active' : ''}`;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(value === activeValue));
    button.addEventListener('click', () => onChange(value));
    container.append(button);
  });
}

function renderProductFilters() {
  const categories = new Map();
  loadedProducts.forEach((product) => {
    (product?.categories || []).forEach((category) => {
      if (category?.slug && category.slug !== 'hero') categories.set(category.slug, category.name || category.slug);
    });
  });

  const categoryOptions = [
    { value: 'all', label: 'All' },
    ...Array.from(categories, ([value, label]) => ({ value, label })),
  ];
  const colorOptions = [
    { value: 'all', label: 'All' },
    ...colorTypeOptions.map((value) => ({ value, label: value })),
  ];

  renderFilterGroup(categoryFilters, categoryOptions, activeCategoryFilter, (value) => {
    activeCategoryFilter = value;
    renderProductFilters();
    renderProductGrid();
  });
  renderFilterGroup(colorTypeFilters, colorOptions, activeColorTypeFilter, (value) => {
    activeColorTypeFilter = value;
    renderProductFilters();
    renderProductGrid();
  });
}

function renderFeaturedHero(products) {
  if (!heroCarousel) return;

  const featuredProducts = getFeaturedProducts(products);
  if (featuredProducts.length === 0) {
    heroCarousel.innerHTML = '<div class="hero-loading">No featured products found.</div>';
    return;
  }

  heroCarousel.innerHTML = `
    <div class="hero-slides">
      ${featuredProducts.map((product, index) => {
        const imageUrl = product?.images?.[0]?.url || product?.heroImage?.url || '';
        return `
          <article class="hero-slide${index === 0 ? ' active' : ''}" data-hero-slide="${index}">
            <div class="hero__bg">${imageUrl ? `<img class="hero__tshirt" src="${imageUrl}" alt="${product?.name || 'Featured product'}">` : ''}</div>
            <div class="hero__side">
              <span class="label">${getProductCategory(product)}</span>
              <h1 class="hero__title">${product?.name || 'Featured product'}</h1>
              ${product?.description ? `<p class="hero__desc">${product.description}</p>` : ''}
              <a href="${getProductUrl(product)}" class="hero__btn">View</a>
            </div>
          </article>
        `;
      }).join('')}
    </div>
    ${featuredProducts.length > 1 ? `
      <div class="hero-dots" aria-label="Featured products">
        ${featuredProducts.map((product, index) => `<button class="hero-dot${index === 0 ? ' active' : ''}" type="button" data-hero-dot="${index}" aria-label="Show ${product.name}"></button>`).join('')}
      </div>
    ` : ''}
  `;

  let activeIndex = 0;
  const showSlide = (nextIndex) => {
    activeIndex = (nextIndex + featuredProducts.length) % featuredProducts.length;
    heroCarousel.querySelectorAll('[data-hero-slide]').forEach((slide, index) => slide.classList.toggle('active', index === activeIndex));
    heroCarousel.querySelectorAll('[data-hero-dot]').forEach((dot, index) => dot.classList.toggle('active', index === activeIndex));
  };

  heroCarousel.querySelectorAll('[data-hero-dot]').forEach((button) => {
    button.addEventListener('click', () => showSlide(Number(button.dataset.heroDot)));
  });

  if (featuredProducts.length > 1) {
    window.setInterval(() => showSlide(activeIndex + 1), 5500);
  }
}

function showEmptyState(message) {
  if (!productGrid) return;
  productGrid.innerHTML = `
    <div class="empty-state">
      <p>${message}</p>
    </div>
  `;
}

function showHeroLoadingState(message) {
  if (!heroCarousel) return;
  heroCarousel.innerHTML = `<div class="hero-loading">${message}</div>`;
}

function formatPrice(price) {
  const value = Number(price || 0);
  if (!Number.isFinite(value)) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function renderProductGrid() {
  if (!productGrid) return;

  const gridProducts = loadedProducts.filter((product) => {
    const matchesCategory = activeCategoryFilter === 'all'
      || product?.categories?.some((category) => category?.slug === activeCategoryFilter);
    const matchesColorType = activeColorTypeFilter === 'all'
      || product?.colorTypeModel === activeColorTypeFilter;
    return matchesCategory && matchesColorType;
  });

  if (gridProducts.length === 0) {
    if (loadedProducts.length === 0) {
      showEmptyState('No products found. Check your Hygraph endpoint and project data.');
    } else {
      productGrid.innerHTML = '<p class="empty-state">No products match these filters.</p>';
    }
    return;
  }

  productGrid.innerHTML = gridProducts
    .map((product) => {
      const imageUrls = (product?.images || []).map((image) => image?.url)
        .filter((url, index, urls) => url && urls.indexOf(url) === index);
      const imageUrl = imageUrls[0] || '';
      const secondaryImageUrl = imageUrls[1] || imageUrl;

      return `
        <article class="card">
          <div class="card__img">
            <a class="card__img-link" href="${getProductUrl(product)}">
              <img class="card__shadow" src="${imageUrl || 'https://placehold.co/800x1000/171717/a2a2a2?text=Product'}" alt="">
              <img class="card__art" src="${secondaryImageUrl || 'https://placehold.co/800x1000/171717/a2a2a2?text=Product'}" alt="${product?.name || 'Product image'}">
            </a>
          </div>
          <a class="card__label" href="${getProductUrl(product)}"><p class="card__name">${product?.name || 'Unnamed product'}</p></a>
          <p class="card__tags">${getProductCategory(product)} / Free</p>
        </article>
      `;
    })
    .join('');

  setupCardSwipe();
}

function renderProducts(products, append = false) {
  if (!productGrid) return;

  if (append) loadedProducts.push(...products);
  else loadedProducts = [...products];

  renderProductFilters();
  renderProductGrid();
}

function setupCardSwipe(cardImages = productGrid.querySelectorAll('.card__img')) {
  if (!productGrid) return;

  cardImages.forEach((cardImage) => {
    let touchStartX = 0;
    let touchStartY = 0;

    cardImage.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    cardImage.addEventListener('touchend', (event) => {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Ensure horizontal intent and sufficient swipe distance
      if (Math.abs(deltaX) < 30 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

      // Swiping in either direction toggles between front and back images
      cardImage.classList.toggle('is-switched');
    }, { passive: true });
  });
}

function renderProductDetail(product) {
  const detailContainer = document.getElementById('product-detail');
  if (!detailContainer) return;

  const name = product?.name || 'Product';
  const description = product?.description || 'No description provided.';
  const imageUrl = product?.images?.[0]?.url || product?.heroImage?.url || 'https://placehold.co/1200x1200/f1e9e0/1f2a37?text=Product';
  const images = [...(product?.images || []), ...(product?.heroImage ? [product.heroImage] : [])].filter((image, index, list) => image?.url && list.findIndex((item) => item?.url === image.url) === index);
  const secondaryImageUrl = images[1]?.url || imageUrl;
  const category = getProductCategory(product);
  const tags = product?.tags?.map((tag) => tag.name).join(', ') || category;
  const linkToEtsy = product?.linkToEtsy || '';
  const linkToDeviantArt = product?.linktoDeviantArt || product?.linkToDeviantArt || '';
  const hasExternalLink = linkToDeviantArt || linkToEtsy;
  const downloadUrl = product?.download?.url || '#';
  const downloadFileName = product?.download?.fileName || `${product?.slug || 'product'}.svg`;
  const titleParts = name.split(/\s+/);
  const titleMarkup = titleParts.length > 1
    ? `<p>${titleParts.slice(0, Math.ceil(titleParts.length / 2)).join(' ')}</p><p>${titleParts.slice(Math.ceil(titleParts.length / 2)).join(' ')}</p>`
    : `<p>${name}</p>`;

  detailContainer.innerHTML = `
    <a class="back-link" href="index.html#shop">
      <span class="arrow-circle"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 15.8333L4.16667 10L10 4.16667M15.8333 10H4.16667" stroke="currentColor" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      Back to Home
    </a>
    <div class="product-image">
      <img id="product-secondary-image" class="product-image__bg" src="${secondaryImageUrl}" alt="" draggable="false" />
      <img id="product-main-image" class="product-image__main" src="${imageUrl}" alt="${name}" draggable="false" />
    </div>
    <div class="title">${titleMarkup}</div>
    <p class="description">${description}</p>
    <div class="buttons-row">
      ${linkToEtsy ? `<a class="btn" href="${linkToEtsy}" target="_blank" rel="noopener noreferrer">Buy on Etsy</a>` : ''}
      ${linkToDeviantArt ? `<a class="btn" href="${linkToDeviantArt}" target="_blank" rel="noopener noreferrer">View On DeviantArt</a>` : ''}
      ${hasExternalLink ? '' : '<button class="btn" type="button" data-open-product-options>Download Image Free</button>'}
    </div>
    ${hasExternalLink ? '' : `
      <dialog class="product-options" data-product-options>
        <div class="product-options__content">
          <a class="btn" href="${downloadUrl}" data-download-svg ${downloadUrl === '#' ? '' : `download="${downloadFileName}"`}>Download Image Free</a>
          <a class="btn" href="https://buymeacoffee.com/ioartseu" target="_blank" rel="noopener noreferrer">Buy me coffee</a>
        </div>
      </dialog>
    `}
    <div class="meta"><span class="meta-line">Tags: ${tags}</span><span class="meta-line">Copyright: ${product?.copyright || 'Unofficial fanart'}</span></div>
  `;

  const productOptions = detailContainer.querySelector('[data-product-options]');
  const openProductOptions = detailContainer.querySelector('[data-open-product-options]');
  const downloadButton = detailContainer.querySelector('[data-download-svg]');
  if (openProductOptions && productOptions) {
    openProductOptions.addEventListener('click', () => productOptions.showModal());
  }
  if (downloadButton && !hasExternalLink) downloadButton.addEventListener('click', async (event) => {
    if (downloadUrl === '#') return;

    event.preventDefault();
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`SVG download failed: ${response.status}`);

      const blobUrl = URL.createObjectURL(await response.blob());
      const temporaryLink = document.createElement('a');
      temporaryLink.href = blobUrl;
      temporaryLink.download = downloadFileName;
      document.body.appendChild(temporaryLink);
      temporaryLink.click();
      temporaryLink.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('SVG download error:', error);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  });
  if (productOptions) {
    productOptions.addEventListener('click', (event) => {
      if (event.target === productOptions) productOptions.close();
    });
  }

  const mainImage = detailContainer.querySelector('#product-main-image');
  const secondaryImage = detailContainer.querySelector('#product-secondary-image');
  let imageIndex = 0;

  const setImages = (primaryIdx, direction = 0) => {
    imageIndex = Math.min(primaryIdx, Math.max(images.length - 1, 0));
    if (images[imageIndex]?.url && mainImage) {
      if (direction !== 0) {
        mainImage.animate([
          { transform: `translateX(${direction * 18}px) scale(0.98)`, opacity: 0.8 },
          { transform: 'translateX(0) scale(1)', opacity: 1 }
        ], {
          duration: 180,
          easing: 'ease-out',
          fill: 'forwards',
        });
      }
      mainImage.src = images[imageIndex].url;
    }
    const bgIdx = images.length > 1 ? (imageIndex + 1) % images.length : imageIndex;
    if (images[bgIdx]?.url && secondaryImage) {
      secondaryImage.src = images[bgIdx].url;
    }
  };

  if (images.length > 1) {
    const updateImage = (nextIndex, direction = 0) => {
      const targetIndex = (nextIndex + images.length) % images.length;
      setImages(targetIndex, direction);
    };

    let pointerStartX = null;
    let pointerStartY = null;

    mainImage.addEventListener('pointerdown', (event) => {
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      mainImage.style.transition = 'transform 120ms ease, opacity 120ms ease';
      mainImage.setPointerCapture(event.pointerId);
    });

    mainImage.addEventListener('pointermove', (event) => {
      if (pointerStartX === null) return;

      const distanceX = event.clientX - pointerStartX;
      const distanceY = event.clientY - pointerStartY;
      if (Math.abs(distanceX) <= Math.abs(distanceY)) return;

      const offset = distanceX * 0.18;
      mainImage.style.transform = `translateX(${offset}px) scale(${1 - Math.min(Math.abs(distanceX) / 1000, 0.06)})`;
      mainImage.style.opacity = String(1 - Math.min(Math.abs(distanceX) / 900, 0.15));
    });

    mainImage.addEventListener('pointerup', (event) => {
      if (pointerStartX === null) return;

      const distance = event.clientX - pointerStartX;
      const distanceY = event.clientY - pointerStartY;
      pointerStartX = null;
      pointerStartY = null;
      mainImage.style.transform = '';
      mainImage.style.opacity = '';

      if (Math.abs(distance) < 40 || Math.abs(distance) <= Math.abs(distanceY)) return;
      updateImage(imageIndex + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
    });

    mainImage.addEventListener('pointercancel', () => {
      pointerStartX = null;
      pointerStartY = null;
      mainImage.style.transform = '';
      mainImage.style.opacity = '';
    });
  }
}

async function fetchProductPage(skip) {
  const config = getHygraphConfig();
  const endpoint = (config.endpoint || '').trim();
  const token = (config.authToken || '').trim();

  if (!endpoint || endpoint.includes('YOUR_')) {
    throw new Error('Configure the Hygraph endpoint before loading products.');
  }

  const query = `
    query GetProducts($first: Int!, $skip: Int!) {
      colorTypes: __type(name: "ColorEnumeration") {
        enumValues {
          name
        }
      }
      products(first: $first, skip: $skip) {
        id
        name
        slug
        price
        description
        colorTypeModel
        images {
          url
        }
        categories {
          name
          slug
        }
      }
    }
  `;

  const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: { first: PRODUCT_PAGE_SIZE, skip } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      clearHygraphAuthToken();
      throw new Error('Hygraph rejected the current auth token. Refresh with a valid auth token and retry.');
    }
    throw new Error(`Hygraph request failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  if (Array.isArray(result?.errors) && result.errors.length > 0) {
    throw new Error(result.errors.map((error) => error.message).join('; '));
  }

  const products = result?.data?.products;

  if (!Array.isArray(products)) {
    throw new Error('Hygraph response does not contain a products array.');
  }

  return {
    products,
    colorTypes: result?.data?.colorTypes?.enumValues?.map((colorType) => colorType.name) || [],
  };
}

async function fetchProductsFromHygraph() {
  try {
    const { products, colorTypes } = await fetchProductPage(0);
    colorTypeOptions = colorTypes;
    productOffset = products.length;
    renderFeaturedHero(products);
    renderProducts(products);
    if (loadMoreContainer) loadMoreContainer.hidden = products.length < PRODUCT_PAGE_SIZE;
  } catch (error) {
    console.error('Hygraph fetch error:', error);
    showHeroLoadingState('Unable to load featured products. Check the Hygraph endpoint and token, or refresh with a valid auth token.');
    showEmptyState('Unable to load products from Hygraph. Check the endpoint and token, or refresh with a valid auth token.');
    if (loadMoreContainer) loadMoreContainer.hidden = true;
  }
}

async function loadMoreProducts() {
  if (isLoadingMoreProducts || !loadMoreButton) return;

  isLoadingMoreProducts = true;
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = 'Loading...';

  try {
    const { products } = await fetchProductPage(productOffset);
    productOffset += products.length;
    renderProducts(products, true);
    if (loadMoreContainer) loadMoreContainer.hidden = products.length < PRODUCT_PAGE_SIZE;
  } catch (error) {
    console.error('Hygraph load-more error:', error);
    loadMoreButton.textContent = 'Try Again';
  } finally {
    isLoadingMoreProducts = false;
    loadMoreButton.disabled = false;
    if (loadMoreButton.textContent === 'Loading...') loadMoreButton.textContent = 'Load More';
  }
}

if (loadMoreButton) loadMoreButton.addEventListener('click', loadMoreProducts);

async function fetchProductBySlug(slug) {
  const config = getHygraphConfig();
  const endpoint = (config.endpoint || '').trim();
  const token = (config.authToken || '').trim();
  const detailContainer = document.getElementById('product-detail');

  if (!detailContainer) return;

  if (!endpoint || endpoint.includes('YOUR_')) {
    detailContainer.innerHTML = '<div class="empty-state">Configure the Hygraph endpoint to show product details.</div>';
    return;
  }

  const query = `
    query GetProductBySlug($slug: String!) {
      products(where: { slug: $slug }, first: 1) {
        id
        name
        slug
        price
        linkToEtsy
        linktoDeviantArt
        description
        copyright
        download {
          url
          fileName
        }
        categories {
          name
          slug
        }
        tags {
          name
        }
        images {
          url
        }
      }
    }
  `;

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables: { slug } }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 || response.status === 403) {
        clearHygraphAuthToken();
        throw new Error('Hygraph rejected the current auth token. Refresh with a valid auth token and retry.');
      }
      throw new Error(`Hygraph request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const products = result?.data?.products || [];
    const product = Array.isArray(products) ? products[0] : null;

    if (!product) {
      detailContainer.innerHTML = '<div class="empty-state">No product found for this link.</div>';
      return;
    }

    renderProductDetail(product);
  } catch (error) {
    console.error('Hygraph product fetch error:', error);
    detailContainer.innerHTML = '<div class="empty-state">Unable to load this product from Hygraph.</div>';
  }
}

window.BASIC_IOARTS = {
  setHygraphConfig,
  fetchProductsFromHygraph,
  getHygraphConfig,
  fetchProductBySlug,
  clearHygraphConfig: clearHygraphAuthToken,
};

const currentPath = window.location.pathname;
const productPathMatch = currentPath.match(/^\/products\/(?:([^/]+)\/)?([^/]+)\/?$/);
const slug = productPathMatch
  ? decodeURIComponent(productPathMatch[2])
  : currentPath.endsWith('/product.html')
    ? new URLSearchParams(window.location.search).get('slug')
    : null;

if (slug) {
  fetchProductBySlug(slug);
} else if (currentPath.endsWith('/product.html')) {
  const detailContainer = document.getElementById('product-detail');
  if (detailContainer) {
    detailContainer.innerHTML = '<div class="empty-state">No product was selected.</div>';
  }
} else {
  fetchProductsFromHygraph();
}
