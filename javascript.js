const DEFAULT_CONFIG = {
  endpoint: 'https://eu-west-2.cdn.hygraph.com/content/cmog3w3va0oy007jqcj9c8v7x/master',
  authToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdjbXMtbWFpbi1wcm9kdWN0aW9uIn0.eyJ2ZXJzaW9uIjozLCJpYXQiOjE3ODg5OTUxMDksImF1ZCI6WyJodHRwczovL2FwaS1ldS13ZXN0LTIuaHlncmFwaC5jb20vdjIvY21vZzN3M3ZhMG95MDA3anFjajljOHY3eC9tYXN0ZXIiLCJtYW5hZ2VtZW50LW5leHQuZ3JhcGhjbXMuY29tIl0sImlzcyI6Imh0dHBzOi8vbWFuYWdlbWVudC1ldS13ZXN0LTIuaHlncmFwaC5jb20vIiwic3ViIjoiNGI0YzMzMTYtMGNlMC00ZTkyLTk2Y2QtZjNkNTc0MWRlMTE5IiwianRpIjoiY210dXBoeDM2MG5icTA2bW80dHo3MnFqbyJ9.1kSMtmXDeU2bcCpwWX2m2NgIcWuT4M6FPhP2qrQy4OV8vDZhcvn0z0PeCmJZH50k85jAbNc5cco7OkB8rbvyYpI2Y_C1le-6Eeujn1FOrXgfljJxknOpobwvcF0kIbEczBLx62gILReHIWPTVnYmPptKRQW7RHyMjMdHmEkrK600lxzrZDzZTKooKt7p-L7vSblPTmocVYK0077OtIn8d6ZL46_bba0HIz4MshO1OQ-sZVQDeWoa6oRDJ2OoFSTWsfWSCOhLF20Vsnt_3ofkVQZmLN2FLahm9Q45R8ZS7qsMrHTUAGgsGf-B4S3P5s7tCGk7pMcxcJpyiVWUCsfemuPZvSLZm2i1UCkg3kjmeU6Sr_jfJYRgQtPWzB0mIF9XjVBMuTxfJGLTkfXAVrsxRiWz3IUHI1izA4P5eu9RsiPWirNFNJ45vnfa7p5apahCOqKSlpUIGIw4hjtgCLdi2Z2PjoH5kLCAUxKCKwzjeyH2noY1AwJkoIM-L_ZjY2I32a1vQNflpIDxmOoeMdpEji0aNopfEaAoxeHCUdsbYbUpv9lxLZ-ELzMReVH3jKCHqk2-xjp--8ay-I9ERuL1tFBstDYhIT_dHxMAyAlfyUsRcIrHKkl_r_k3RSoZHRIi_T9HjUWdgFsmcd4wwfYWoz1G21gG5qfpaBquL33SODg',
};

function getStoredConfig() {
  try {
    const raw = localStorage.getItem('basic_ioarts_hygraph');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getHygraphConfig() {
  return {
    ...DEFAULT_CONFIG,
    ...getStoredConfig(),
    ...(window.__HYGRAPH_CONFIG__ || {}),
  };
}

function setHygraphConfig(nextConfig) {
  const merged = {
    ...getHygraphConfig(),
    ...nextConfig,
  };

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

const FEATURED_PRODUCT_SLUGS = ['t-shirt-queens', 't-shirt-elden', 'for-the-horde'];
const PRODUCT_GRID_CATEGORY = 'vectors';

function getProductUrl(product) {
  const slug = typeof product === 'string' ? product : product?.slug;
  const categoryPath = typeof product === 'string' ? '' : `${PRODUCT_GRID_CATEGORY}/`;
  return `/products/${categoryPath}${encodeURIComponent(slug || '')}`;
}

function getFeaturedProducts(products) {
  const order = new Map(FEATURED_PRODUCT_SLUGS.map((slug, index) => [slug, index]));
  return (products || [])
    .filter((product) => order.has(product?.slug))
    .sort((first, second) => order.get(first.slug) - order.get(second.slug));
}

function getProductCategory(product) {
  const category = product?.categories?.find((item) => item?.slug !== 'hero') || product?.categories?.[0];
  return category?.name || 'Featured';
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
        const imageUrl = product?.heroImage?.url || product?.images?.[0]?.url || '';
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

function formatPrice(price) {
  const value = Number(price || 0);
  if (!Number.isFinite(value)) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function renderProducts(products) {
  if (!productGrid) return;

  const vectorProducts = Array.isArray(products)
    ? products.filter((product) => product?.categories?.some((category) => category?.slug === PRODUCT_GRID_CATEGORY))
    : [];

  if (vectorProducts.length === 0) {
    showEmptyState('No products found. Check your Hygraph endpoint and project data.');
    return;
  }

  productGrid.innerHTML = vectorProducts
    .map((product) => {
      const imageUrls = [product?.heroImage?.url, ...(product?.images || []).map((image) => image?.url)]
        .filter((url, index, urls) => url && urls.indexOf(url) === index);
      const imageUrl = imageUrls[0] || '';
      const hoverImageUrl = imageUrls[1] || imageUrl;

      return `
        <article class="card">
          <a class="card__img" href="${getProductUrl(product)}">
            <img class="card__shadow" src="${imageUrl || 'https://placehold.co/800x1000/171717/a2a2a2?text=IOARTS'}" alt="">
            <img class="card__art" src="${hoverImageUrl || 'https://placehold.co/800x1000/171717/a2a2a2?text=Product'}" alt="${product?.name || 'Product image'}">
          </a>
          <a class="card__label" href="${getProductUrl(product)}"><p class="card__name">${product?.name || 'Unnamed product'}</p></a>
          <p class="card__tags">Vectors / Free</p>
        </article>
      `;
    })
    .join('');
}

function renderProductDetail(product) {
  const detailContainer = document.getElementById('product-detail');
  if (!detailContainer) return;

  const name = product?.name || 'Product';
  const description = product?.description || 'No description provided.';
  const imageUrl = product?.heroImage?.url || product?.images?.[0]?.url || 'https://placehold.co/1200x1200/f1e9e0/1f2a37?text=Product';
  const images = [product?.heroImage, ...(product?.images || [])].filter((image, index, list) => image?.url && list.findIndex((item) => item?.url === image.url) === index);
  const productType = (product?.productType || 'Digital Product').toUpperCase();
  const category = product?.categories?.[0]?.name || 'Misc';
  const tags = product?.tags?.map((tag) => tag.name).join(', ') || category;
  const linkToEtsy = product?.linkToEtsy || '';
  const downloadUrl = product?.download?.url || '#';
  const downloadFileName = product?.download?.fileName || `${product?.slug || 'product'}.svg`;
  const primaryActionLabel = linkToEtsy ? 'Buy on Etsy' : 'Download SVG';
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
      <img id="product-main-image" src="${imageUrl}" alt="${name}" draggable="false" />
    </div>
    ${images.length > 1 ? `
      <div class="image-nav" aria-label="Product images">
        <button class="nav-btn prev" type="button" aria-label="Previous image">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="image-counter" aria-live="polite">1 / ${images.length}</span>
        <button class="nav-btn next" type="button" aria-label="Next image">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    ` : ''}
    <div class="title">${titleMarkup}</div>
    <p class="description">${description}</p>
    <div class="buttons-row">${linkToEtsy
      ? `<a class="btn" href="${linkToEtsy}" target="_blank" rel="noopener noreferrer">Buy on Etsy</a>`
      : '<button class="btn" type="button" data-open-product-options>Download SVG</button>'}
    </div>
    ${linkToEtsy ? '' : `
      <dialog class="product-options" data-product-options>
        <div class="product-options__content">
          <a class="btn" href="${downloadUrl}" data-download-svg ${downloadUrl === '#' ? '' : `download="${downloadFileName}"`}>Download SVG</a>
          <a class="btn" href="https://buymeacoffee.com/ioartseu" target="_blank" rel="noopener noreferrer">Buy me coffee</a>
        </div>
      </dialog>
    `}
    <div class="meta"><span class="meta-line">Tags: ${tags}</span><span class="meta-line">Copyright: ${product?.copyright || 'Unofficial fanart'}</span><span class="meta-line">Product type <span class="badge">${productType}</span></span></div>
    <div class="colors-row"><span class="colors-label">Choose Color</span><button class="color-swatch black selected" type="button" data-product-color="#000000" aria-label="Black" aria-pressed="true"></button><button class="color-swatch white" type="button" data-product-color="#ffffff" aria-label="White" aria-pressed="false"></button></div>
  `;

  const productOptions = detailContainer.querySelector('[data-product-options]');
  const openProductOptions = detailContainer.querySelector('[data-open-product-options]');
  const downloadButton = detailContainer.querySelector('[data-download-svg]');
  if (openProductOptions && productOptions) {
    openProductOptions.addEventListener('click', () => productOptions.showModal());
  }
  if (downloadButton && !linkToEtsy) downloadButton.addEventListener('click', async (event) => {
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
  let imageIndex = 0;
  detailContainer.querySelectorAll('[data-product-color]').forEach((button) => {
    button.addEventListener('click', () => {
      detailContainer.querySelectorAll('[data-product-color]').forEach((swatch) => {
        const selected = swatch === button;
        swatch.classList.toggle('selected', selected);
        swatch.setAttribute('aria-pressed', String(selected));
      });
      const requestedIndex = button.dataset.productColor === '#ffffff' ? 1 : 0;
      imageIndex = Math.min(requestedIndex, Math.max(images.length - 1, 0));
      if (images[imageIndex]?.url) {
        mainImage.src = images[imageIndex].url;
      }
    });
  });

  if (images.length > 1) {
    const updateImage = (nextIndex) => {
      imageIndex = (nextIndex + images.length) % images.length;
      mainImage.src = images[imageIndex].url;
      detailContainer.querySelector('.image-counter').textContent = `${imageIndex + 1} / ${images.length}`;
    };
    detailContainer.querySelector('.nav-btn.prev').addEventListener('click', () => updateImage(imageIndex - 1));
    detailContainer.querySelector('.nav-btn.next').addEventListener('click', () => updateImage(imageIndex + 1));

    let pointerStartX = null;
    mainImage.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pointerStartX = event.clientX;
      mainImage.setPointerCapture(event.pointerId);
    });
    mainImage.addEventListener('pointerup', (event) => {
      if (pointerStartX === null) return;

      const distance = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(distance) < 40) return;
      updateImage(imageIndex + (distance < 0 ? 1 : -1));
    });
    mainImage.addEventListener('pointercancel', () => {
      pointerStartX = null;
    });
  }
}

async function fetchProductsFromHygraph() {
  const config = getHygraphConfig();
  const endpoint = (config.endpoint || '').trim();
  const token = (config.authToken || '').trim();

  if (!endpoint || !token || endpoint.includes('YOUR_') || token.includes('YOUR_')) {
    showEmptyState('Configure the Hygraph endpoint and auth token in javascript.js or set window.__HYGRAPH_CONFIG__ before this script runs.');
    return;
  }

  const query = `
    query GetProducts {
      products(first: 100) {
        id
        name
        slug
        price
        description
        heroImage {
          url
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

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hygraph request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const products = result?.data?.products || [];

    if (!Array.isArray(products)) {
      throw new Error('Hygraph response does not contain a products array.');
    }

    renderFeaturedHero(products);
    renderProducts(products);
  } catch (error) {
    console.error('Hygraph fetch error:', error);
    showEmptyState('Unable to load products from Hygraph. Check the endpoint and token, or refresh with a valid auth token.');
  }
}

async function fetchProductBySlug(slug) {
  const config = getHygraphConfig();
  const endpoint = (config.endpoint || '').trim();
  const token = (config.authToken || '').trim();
  const detailContainer = document.getElementById('product-detail');

  if (!detailContainer) return;

  if (!endpoint || !token || endpoint.includes('YOUR_') || token.includes('YOUR_')) {
    detailContainer.innerHTML = '<div class="empty-state">Configure the Hygraph endpoint and auth token to show product details.</div>';
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
        description
        productType
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
        heroImage {
          url
        }
        images {
          url
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables: { slug } }),
    });

    if (!response.ok) {
      const errorText = await response.text();
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
