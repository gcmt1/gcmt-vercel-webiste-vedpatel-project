import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Star, ShoppingCart, Heart, Share2,
  ArrowLeft, ArrowRight, Check, ChevronDown,
  X, Copy, MessageCircle, Facebook, Twitter, Mail, Link
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import '../styles/ProductDetails.css';
import AddToCartButton from '../components/AddToCartButton';
import { Helmet } from "react-helmet-async";
import ReviewSystem from '../components/ReviewSystem';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlistAdded, setWishlistAdded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('description');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [showCertModal, setShowCertModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        // Fetch product
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (prodErr) throw prodErr;

        // Process the data
        const variants = prodData.size 
          ? prodData.size.split(',').map(v => v.trim()) 
          : [];

        // Process key benefits - handle Postgres array format
        const rawBenefits = prodData.key_benefits || '';
        const cleanedBenefits = rawBenefits.replace(/[\{\}"]/g, '');
        const benefits = cleanedBenefits 
          ? cleanedBenefits.split(',').map(b => b.trim()) 
          : [];

        // Process ingredients
        const ingredients = prodData.ingredients_name
          ? prodData.ingredients_name.split(',').map((name, i) => ({
              name: name.trim(),
              percentage: prodData.percentage?.split(',')[i]?.trim() || ''
            }))
          : [];

        // Calculate discount price
        const discountPrice = prodData.product_discount 
          ? +(prodData.product_price * (1 - prodData.product_discount / 100)).toFixed(2)
          : prodData.product_price;

        // Process multiple images from comma-separated string
        let images = [];
        
        if (prodData.product_image) {
          // Check if it's a comma-separated string
          if (prodData.product_image.includes(',')) {
            // Split by comma and clean up each URL
            images = prodData.product_image
              .split(',')
              .map(img => img.trim())
              .filter(img => img && img.length > 0); // Remove empty strings
          } else {
            // Single image
            images = [prodData.product_image.trim()];
          }
        }

        // Fallback to placeholder if no images
        if (images.length === 0) {
          images = ['/api/placeholder/500/500'];
        }

         // Debug log to verify images are processed correctly

        const productData = {
          id: prodData.id,
          name: prodData.product_name,
          shortDescription: prodData.product_sub_description,
          price: prodData.product_price,
          discountPrice,
          discount: prodData.product_discount ? `${prodData.product_discount}%` : null,
          rating: 4.5, // Default value
          reviews: "1+", // Will be updated by ReviewSystem component
          stock: prodData.stock || 50, // Default stock if not provided
          sku: id,
          images, // Now properly handles multiple images
          variants,
          benefits,
          descriptionContent: prodData.product_description,
          whyChoose: prodData.why_choose_product,
          ingredientsHeading: prodData.ingredients_heading,
          ingredientsDescription: prodData.ingredients_description,
          ingredientsSubheading: prodData.ingredients_subheading,
          ingredients,
          howToUseHeading: prodData.how_to_use_heading,
          howToUseDescription: prodData.how_to_use_description,
          proTips: prodData.pro_tips,
          certifications: [], // Empty array as default
        };

        setProduct(productData);
        setSelectedVariant(variants[0] || '');

      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Unable to load product information.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Share functionality
  const getProductUrl = () => {
    return window.location.href;
  };

  const getShareText = () => {
    const price = product.discount ? `₹${product.discountPrice}` : `₹${product.price}`;
    const discount = product.discount ? ` (${product.discount} OFF!)` : '';
    return `Check out ${product.name} - ${product.shortDescription} at ${price}${discount}`;
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      action: () => {
        const text = encodeURIComponent(getShareText());
        const url = encodeURIComponent(getProductUrl());
        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      action: () => {
        const url = encodeURIComponent(getProductUrl());
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: '#1DA1F2',
      action: () => {
        const text = encodeURIComponent(getShareText());
        const url = encodeURIComponent(getProductUrl());
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
      }
    },
    {
      name: 'Email',
      icon: Mail,
      color: '#EA4335',
      action: () => {
        const subject = encodeURIComponent(`Check out ${product.name}`);
        const body = encodeURIComponent(`${getShareText()}\n\n${getProductUrl()}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
    },
    {
      name: 'Copy Link',
      icon: Link,
      color: '#6B7280',
      action: () => copyToClipboard()
    }
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getProductUrl());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = getProductUrl();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleShare = () => {
    // Check if native sharing is available (mobile devices)
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      navigator.share({
        title: product.name,
        text: getShareText(),
        url: getProductUrl(),
      }).catch(() => {
        // If native sharing fails, show modal
        setShowShareModal(true);
      });
    } else {
      // Desktop or unsupported devices - show modal
      setShowShareModal(true);
    }
  };

  const renderStars = (rating) =>
    Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          size={20}
          fill={i < rating ? '#FFB800' : 'none'}
          stroke={i < rating ? '#FFB800' : '#8B8B8B'}
        />
      ));

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  const increaseQuantity = () => {
    if (quantity < product?.stock) {
      setQuantity(q => q + 1);
    }
  };
  
  const addToWishlist = () => {
    setWishlistAdded(w => !w);
  };

  const handleImageNavigation = (direction) => {
    if (!product?.images?.length) return;
    
    if (direction === 'prev') {
      setActiveImage(i => (i - 1 + product.images.length) % product.images.length);
    } else {
      setActiveImage(i => (i + 1) % product.images.length);
    }
  };

  // Handle thumbnail click with error handling
  const handleThumbnailClick = (index) => {
    if (index >= 0 && index < product.images.length) {
      setActiveImage(index);
    }
  };

  // Handle image load error
  const handleImageError = (e) => {
    e.target.src = '/api/placeholder/500/500';
  };

  if (loading) {
    return (
      <div className="product-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="product-container">
        <div className="error-message">{error}</div>
        <button className="btn-primary" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-container">
        <div className="error-message">Product not found.</div>
        <button className="btn-primary" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    );
  }

  return (

    <>
  <Helmet>
    {/* Page Meta */}
    <title>{product.name} | GCMT Shop</title>
    <meta name="description" content={product.shortDescription || product.descriptionContent} />
    <meta property="og:title" content={`${product.name} | GCMT Shop`} />
    <meta property="og:description" content={product.shortDescription || product.descriptionContent} />
    <meta property="og:image" content={product.images[0]} />
    <meta property="og:url" content={`https://gcmtshop.com/product/${product.id}`} />
    <link rel="canonical" href={`https://gcmtshop.com/product/${product.id}`} />

    {/* Product Rich Snippet */}
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Product",
        name: product.name,
        image: product.images,
        description: product.shortDescription || product.descriptionContent,
        sku: product.sku || product.id,
        brand: { "@type": "Brand", name: "GCMT Shop" },
        offers: {
          "@type": "Offer",
          url: `https://gcmtshop.com/product/${product.id}`,
          priceCurrency: "INR",
          price: product.discountPrice || product.price,
          availability: product.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition"
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating || 4.5,
          reviewCount: 10
        }
      })}
    </script>

    {/* Breadcrumb Schema */}
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://gcmtshop.com" },
          { "@type": "ListItem", position: 2, name: "Products", item: "https://gcmtshop.com/products" },
          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: `https://gcmtshop.com/product/${product.id}`
          }
        ]
      })}
    </script>
  </Helmet>

    <div className="product-page">
      <div className="container">
        <div className="breadcrumb">
          <span>Home</span> &gt; <span>Products</span> &gt; <span className="current">{product.name}</span>
        </div>

        <div className="product-main">
          {/* Product Gallery */}
          <section className="product-gallery">
            <div className="gallery-main">

              
              <div className="main-image-container">
                <img 
                  src={product.images[activeImage]} 
                  alt={`${product.name} - Image ${activeImage + 1}`} 
                  className="main-image"
                  onError={handleImageError}
                />
                {product.discount && (
                  <span className="discount-badge">{product.discount}</span>
                )}
                {/* Image counter for multiple images */}
                {product.images.length > 1 && (
                  <div className="image-counter">
                    {activeImage + 1} / {product.images.length}
                  </div>
                )}
              </div>
              
              <button 
                className="gallery-nav next"
                onClick={() => handleImageNavigation('next')}
                aria-label="Next image"
                disabled={product.images.length <= 1}
                style={{ opacity: product.images.length <= 1 ? 0.5 : 1 }}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            
            {/* Thumbnail gallery - only show if multiple images */}
            {product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${activeImage === index ? 'active' : ''}`}
                    onClick={() => handleThumbnailClick(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} thumbnail ${index + 1}`}
                      onError={handleImageError}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Product Information */}
          <section className="product-info">
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-meta">
              <div className="product-rating">
                {renderStars(product.rating)}
              </div>
            </div>
            
            <p className="product-short-desc">{product.shortDescription}</p>

            <div className="product-pricing">
              {product.discount ? (
                <>
                  <span className="price-current">₹{product.discountPrice}</span>
                  <span className="price-original">₹{product.price}</span>
                  <span className="price-save">Save {product.discount}</span>
                </>
              ) : (
                <span className="price-current">₹{product.price}</span>
              )}
            </div>

            {product.variants.length > 0 && (
              <div className="product-variants">
                <h3>Size</h3>
                <div className="variant-options">
                  {product.variants.map(v => (
                    <button 
                      key={v} 
                      className={`variant-btn ${selectedVariant === v ? 'selected' : ''}`} 
                      onClick={() => setSelectedVariant(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="product-purchase">
              <div className="quantity-selector">
                <button 
                  className="quantity-btn" 
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input 
                  type="number" 
                  value={quantity} 
                  readOnly 
                  aria-label="Product quantity"
                />
                <button 
                  className="quantity-btn" 
                  onClick={increaseQuantity}
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
              
              <div className="purchase-actions">
                <AddToCartButton 
                  productId={product.id} 
                  quantity={quantity} 
                  className="btn-primary" 
                />
                
                <button 
                  className={`btn-icon ${wishlistAdded ? 'active' : ''}`}
                  onClick={addToWishlist}
                  aria-label="Add to wishlist"
                >
                  <Heart size={20} fill={wishlistAdded ? "#e74c3c" : "none"} />
                </button>
                
                <button 
                  className="btn-icon"
                  onClick={handleShare}
                  aria-label="Share product"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {product.benefits.length > 0 && (
              <div className="product-benefits">
                <h3>Key Benefits</h3>
                <ul>
                  {product.benefits.map((benefit, i) => (
                    <li key={i}>
                      <Check size={16} className="benefit-icon" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Product Details Tabs */}
        <section className="product-details-tabs">
          <div className="tabs-header">
            <button 
              className={`tab-btn ${selectedTab === 'description' ? 'active' : ''}`}
              onClick={() => setSelectedTab('description')}
            >
              Description
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'ingredients' ? 'active' : ''}`}
              onClick={() => setSelectedTab('ingredients')}
            >
              Ingredients
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'how-to-use' ? 'active' : ''}`}
              onClick={() => setSelectedTab('how-to-use')}
            >
              How to Use
            </button>
          </div>
          
          <div className="tab-content">
            {selectedTab === 'description' && (
              <div className="tab-panel">
                <h3>Product Description</h3>
                <p>{product.descriptionContent}</p>
                
                {product.whyChoose && (
                  <>
                    <h3>Why Choose Our Product?</h3>
                    <p>{product.whyChoose}</p>
                  </>
                )}
              </div>
            )}

            {selectedTab === 'ingredients' && (
              <div className="tab-panel">
                {product.ingredientsHeading && <h3>{product.ingredientsHeading}</h3>}
                {product.ingredientsDescription && <p>{product.ingredientsDescription}</p>}
                
                {product.ingredientsSubheading && <h4>{product.ingredientsSubheading}</h4>}
                
                {product.ingredients.length > 0 && (
                  <table className="ingredients-table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.ingredients.map((ing, i) => (
                        <tr key={i}>
                          <td>{ing.name}</td>
                          <td>{ing.percentage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {selectedTab === 'how-to-use' && (
              <div className="tab-panel">
                {product.howToUseHeading && <h3>{product.howToUseHeading}</h3>}
                {product.howToUseDescription && <p>{product.howToUseDescription}</p>}
                
                {product.proTips && (
                  <>
                    <h4>Pro Tips</h4>
                    <p>{product.proTips}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Reviews Section - Now using ReviewSystem component */}
        <section className="product-reviews">
          <ReviewSystem productId={product.id} />
        </section>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Product</h3>
              <button 
                className="modal-close"
                onClick={() => setShowShareModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="product-preview">
                <img 
                  src={product.images[0]} 
                  alt={product.name} 
                  className="preview-image"
                  onError={handleImageError}
                />
                <div className="preview-info">
                  <h4>{product.name}</h4>
                  <p className="preview-price">
                    {product.discount ? `₹${product.discountPrice}` : `₹${product.price}`}
                    {product.discount && <span className="preview-discount">{product.discount} OFF</span>}
                  </p>
                </div>
              </div>
              
              <div className="share-options">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    className="share-option"
                    onClick={option.action}
                    style={{ '--option-color': option.color }}
                  >
                    <option.icon size={24} />
                    <span>{option.name === 'Copy Link' && copySuccess ? 'Copied!' : option.name}</span>
                  </button>
                ))}
              </div>
              
              <div className="share-url">
                <input 
                  type="text" 
                  value={getProductUrl()} 
                  readOnly 
                  className="url-input"
                />
                <button 
                  className="copy-btn"
                  onClick={copyToClipboard}
                >
                  <Copy size={16} />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ProductDetail;