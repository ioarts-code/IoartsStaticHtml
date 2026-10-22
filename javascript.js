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
const tagFilters = document.getElementById('tag-filters');
const colorTypeFilters = document.getElementById('color-type-filters');

const FEATURED_PRODUCT_SLUGS = ['t-shirt-cells', 'for-the-horde',];
const PRODUCT_GRID_CATEGORY = 'vectors';
const PRODUCT_PAGE_SIZE = 6;
const INITIAL_PRODUCT_COUNT = 3;

// Inserts Hygraph asset transforms (resize + webp) before the asset handle; other hosts pass through.
function optimizeImage(url, width) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('graphassets.com')) return url;
    const segments = parsed.pathname.split('/');
    const handle = segments.pop();
    segments.push(`resize=width:${width},fit:max`, 'quality=value:80', 'output=format:webp', handle);
    parsed.pathname = segments.join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

function imageSrcset(url, widths) {
  return widths.map((width) => `${optimizeImage(url, width)} ${width}w`).join(', ');
}
let productOffset = 0;
let isLoadingMoreProducts = false;
let loadedProducts = [];
let colorTypeOptions = [];
let tagOptionNames = [];
let productRequestId = 0;
let activeTagFilter = 'all';
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
  const tagOptions = [
    { value: 'all', label: 'All' },
    ...tagOptionNames.map((value) => ({ value, label: value })),
  ];
  const colorOptions = [
    { value: 'all', label: 'All' },
    ...colorTypeOptions.map((value) => ({ value, label: value })),
  ];

  renderFilterGroup(tagFilters, tagOptions, activeTagFilter, (value) => {
    activeTagFilter = value;
    renderProductFilters();
    reloadProducts();
  });
  renderFilterGroup(colorTypeFilters, colorOptions, activeColorTypeFilter, (value) => {
    activeColorTypeFilter = value;
    renderProductFilters();
    reloadProducts();
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
            <div class="hero__bg">${imageUrl ? `<img class="hero__backdrop" src="${optimizeImage(imageUrl, 1200)}" srcset="${imageSrcset(imageUrl, [640, 1200, 1800])}" sizes="(max-width: 720px) 72vw, 54vw" decoding="async" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} alt="${product?.name || 'Featured product'}">` : ''}</div>
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

function renderProductGrid() {
  if (!productGrid) return;

  const gridProducts = [...loadedProducts].sort((first, second) => {
    const firstOrder = first?.colorTypeModel === 'light' ? 0 : first?.colorTypeModel === 'dark' ? 2 : 1;
    const secondOrder = second?.colorTypeModel === 'light' ? 0 : second?.colorTypeModel === 'dark' ? 2 : 1;
    return firstOrder - secondOrder;
  });

  if (gridProducts.length === 0) {
    if (activeTagFilter === 'all' && activeColorTypeFilter === 'all') {
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
              <img class="card__shadow" src="${imageUrl ? optimizeImage(imageUrl, 640) : 'https://placehold.co/800x1000/171717/a2a2a2?text=Product'}" ${imageUrl ? `srcset="${imageSrcset(imageUrl, [480, 960])}" sizes="(max-width: 720px) 100vw, 33vw"` : ''} loading="lazy" decoding="async" alt="">
              <img class="card__art" src="${secondaryImageUrl ? optimizeImage(secondaryImageUrl, 640) : 'https://placehold.co/800x1000/171717/a2a2a2?text=Product'}" ${secondaryImageUrl ? `srcset="${imageSrcset(secondaryImageUrl, [480, 960])}" sizes="(max-width: 720px) 100vw, 33vw"` : ''} loading="lazy" decoding="async" alt="${product?.name || 'Product image'}">
            </a>
          </div>
          <a class="card__label" href="${getProductUrl(product)}"><p class="card__name">${product?.name || 'Unnamed product'}</p></a>
          <p class="card__tags">${getProductCategory(product)} / Free</p>
        </article>
      `;
    })
    .join('');
}

function renderProducts(products, append = false) {
  if (!productGrid) return;

  if (append) loadedProducts.push(...products);
  else loadedProducts = [...products];

  renderProductFilters();
  renderProductGrid();
}

function renderProductDetail(product) {
  const detailContainer = document.getElementById('product-detail');
  if (!detailContainer) return;

  const name = product?.name || 'Product';
  const description = product?.description || 'No description provided.';
  const imageUrl = product?.images?.[0]?.url || product?.heroImage?.url || 'https://placehold.co/1200x1200/f1e9e0/1f2a37?text=Product';
  const images = [...(product?.images || []), ...(product?.heroImage ? [product.heroImage] : [])].filter((image, index, list) => image?.url && list.findIndex((item) => item?.url === image.url) === index);
  const secondaryImageUrl = images[1]?.url || imageUrl;
  const colorType = product?.colorTypeModel
    ? product.colorTypeModel.charAt(0).toUpperCase() + product.colorTypeModel.slice(1)
    : '';
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
    <div class="product-image">
      <img id="product-secondary-image" class="product-image__bg" src="${secondaryImageUrl}" alt="" draggable="false" />
      <img id="product-main-image" class="product-image__main" src="${imageUrl}" alt="${name}" draggable="false" />
      ${images.length > 1 ? '<svg class="product-image__arrow" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
    </div>
    <div class="product-copy">
      <div class="title">${titleMarkup}</div>
      <p class="description">${description}</p>
      <div class="buttons-row">
        ${linkToEtsy ? `<a class="btn" href="${linkToEtsy}" target="_blank" rel="noopener noreferrer">Buy on Etsy</a>` : ''}
        ${linkToDeviantArt ? `<a class="btn" href="${linkToDeviantArt}" target="_blank" rel="noopener noreferrer">View On DeviantArt</a>` : ''}
        ${hasExternalLink ? '' : '<button class="btn" type="button" data-open-product-options>Download Image Free</button>'}
      </div>
      <div class="meta"><span class="meta-line">Tags: ${tags}</span><span class="meta-line">Copyright: ${product?.copyright || 'Unofficial fanart'}</span>${colorType ? `<span class="meta-line">Color Type: ${colorType}</span>` : ''}</div>
    </div>
    ${hasExternalLink ? '' : `
      <dialog class="product-options" data-product-options>
        <div class="product-options__content">
          <a class="btn" href="${downloadUrl}" data-download-svg ${downloadUrl === '#' ? '' : `download="${downloadFileName}"`}>Download Image Free</a>
          <a class="btn" href="https://buymeacoffee.com/ioartseu" target="_blank" rel="noopener noreferrer">Buy me coffee</a>
        </div>
      </dialog>
    `}
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

    detailContainer.querySelector('.product-image__arrow')?.addEventListener('click', () => updateImage(imageIndex + 1, 1));

    let pointerStartX = null;
    let pointerStartY = null;

    mainImage.addEventListener('pointerdown', (event) => {
      if (!window.matchMedia('(max-width: 1100px)').matches) return;

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

async function fetchProductPage(skip, pageSize = PRODUCT_PAGE_SIZE, whereOverride = null) {
  const config = getHygraphConfig();
  const endpoint = (config.endpoint || '').trim();
  const token = (config.authToken || '').trim();

  if (!endpoint || endpoint.includes('YOUR_')) {
    throw new Error('Configure the Hygraph endpoint before loading products.');
  }

  const where = whereOverride ? { ...whereOverride } : {};
  if (!whereOverride && activeTagFilter !== 'all') where.tags_some = { name: activeTagFilter };
  if (!whereOverride && activeColorTypeFilter !== 'all') where.colorTypeModel = activeColorTypeFilter;

  const query = `
    query GetProducts($first: Int!, $skip: Int!, $where: ProductWhereInput) {
      colorTypes: __type(name: "ColorEnumeration") {
        enumValues {
          name
        }
      }
      allTags: tags(first: 100) {
        name
      }
      products(first: $first, skip: $skip, where: $where) {
        id
        name
        slug
        description
        colorTypeModel
        tags {
          name
        }
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
    body: JSON.stringify({ query, variables: { first: pageSize, skip, where } }),
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
    tagNames: (result?.data?.allTags || []).map((tag) => tag.name).filter(Boolean),
  };
}

async function fetchProductsFromHygraph() {
  try {
    const [{ products, colorTypes, tagNames }, { products: featuredProducts }] = await Promise.all([
      fetchProductPage(0, INITIAL_PRODUCT_COUNT),
      fetchProductPage(0, FEATURED_PRODUCT_SLUGS.length, { slug_in: FEATURED_PRODUCT_SLUGS })
        .catch((error) => {
          console.error('Featured products fetch error:', error);
          return { products: [] };
        }),
    ]);
    colorTypeOptions = colorTypes;
    tagOptionNames = tagNames;
    productOffset = products.length;
    renderFeaturedHero(featuredProducts.length > 0 ? featuredProducts : products);
    renderProducts(products);
    if (loadMoreContainer) loadMoreContainer.hidden = products.length < INITIAL_PRODUCT_COUNT;
  } catch (error) {
    console.error('Hygraph fetch error:', error);
    showHeroLoadingState('Unable to load featured products. Check the Hygraph endpoint and token, or refresh with a valid auth token.');
    showEmptyState('Unable to load products from Hygraph. Check the endpoint and token, or refresh with a valid auth token.');
    if (loadMoreContainer) loadMoreContainer.hidden = true;
  }
}

async function reloadProducts() {
  const requestId = ++productRequestId;
  showEmptyState('Loading products...');
  if (loadMoreContainer) loadMoreContainer.hidden = true;

  try {
    const { products } = await fetchProductPage(0, INITIAL_PRODUCT_COUNT);
    if (requestId !== productRequestId) return;
    productOffset = products.length;
    renderProducts(products);
    if (loadMoreContainer) loadMoreContainer.hidden = products.length < INITIAL_PRODUCT_COUNT;
  } catch (error) {
    if (requestId !== productRequestId) return;
    console.error('Hygraph filter error:', error);
    showEmptyState('Unable to load products from Hygraph. Check the endpoint and token, or refresh with a valid auth token.');
  }
}

async function loadMoreProducts() {
  if (isLoadingMoreProducts || !loadMoreButton) return;

  const requestId = productRequestId;
  isLoadingMoreProducts = true;
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = 'Loading...';

  try {
    const { products } = await fetchProductPage(productOffset);
    if (requestId !== productRequestId) return;
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
        linkToEtsy
        linktoDeviantArt
        description
        copyright
        colorTypeModel
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
