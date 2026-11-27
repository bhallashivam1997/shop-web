const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(full)}
      <span className="stars-empty">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export default function ProductCard({ product }) {
  return (
    <article className="card">
      <div className="card-image">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {!product.inStock && <span className="badge badge-out">Out of stock</span>}
      </div>
      <div className="card-body">
        <span className="card-category">{product.category}</span>
        <h2 className="card-title">{product.name}</h2>
        <p className="card-brand">{product.brand}</p>
        <div className="card-rating">
          <Stars rating={product.rating} />
          <span className="card-rating-text">
            {product.rating.toFixed(1)} ({product.reviewCount.toLocaleString()})
          </span>
        </div>
        <p className="card-price">{price.format(product.price)}</p>
      </div>
    </article>
  );
}
