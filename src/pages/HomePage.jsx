import React, { useEffect, useState } from 'react';
import { ArrowRight, Instagram, Star, Shield, Truck, Award, Leaf, Play, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { supabase } from '../supabaseClient'; // Import supabase client
import '../styles/HomePage.css';
import GCMTVideo from '../assets/marketing-video.mp4'; // Import marketing video
import GCMTLogo from '../assets/GCMT-logo.webp';
import { redirect } from 'react-router-dom';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const testimonials = [
    { 
      quote: "The quality of their products is outstanding, will buy again! My teeth have never felt cleaner.", 
      author: "Suresh Chauhan", 
      location: "Surat",
      rating: 5
    },
    { 
      quote: "Their customer service is exceptional. The charcoal toothpaste works wonders!", 
      author: "Pooja Mehta", 
      location: "Mumbai",
      rating: 5
    },
    { 
      quote: "I appreciate their commitment to quality. Natural ingredients make all the difference.", 
      author: "Ramesh Patel", 
      location: "Gandhinagar",
      rating: 5
    },
  ];

  const benefits = [
    {
      icon: "🌿",
      title: "100% Natural Ingredients",
      description: "Ethically sourced herbs with no artificial additives or fillers"
    },
    {
      icon: "🔬",
      title: "Scientifically Validated",
      description: "Traditional formulations backed by modern clinical research"
    },
    {
      icon: "🌱",
      title: "Sustainably Harvested",
      description: "Supporting local farmers and sustainable agricultural practices"
    },
    {
      icon: "⚗️",
      title: "Potent Extracts",
      description: "Concentrated herbal extracts for maximum bioavailability"
    }
  ];

  const features = [
    { icon: <Truck className="feature-icon" />, text: "Free Shipping on Orders Your First Order" },
    { icon: <Shield className="feature-icon" />, text: "100% Secure Payment" },
    { icon: <Award className="feature-icon" />, text: "UPI Available" },
    { icon: <Leaf className="feature-icon" />, text: "Made in India" }
  ];

  useEffect(() => {
    let active = true;
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*').limit(3);
        if (error) throw error;
        if (active) setProducts(data || []);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchProducts();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="homepage">
      {/*
        Mobile priority: the DOM order below is unchanged (good for SEO
        and for tablet/desktop visitors), but on phone screens the
        "Featured Products" section is visually moved to the very top
        (above even the announcement bar) via flexbox `order` in
        HomePage.css, so shoppers land straight on the product cards —
        each showing only a direct "Buy Now" button — as soon as they
        open the site, instead of scrolling past the hero first.
      */}

      {/* Announcement Bar */}
      <div className="announcement-bar">
        <p>🎉 Free shipping on your first order | 100% Secure Checkout | Limited Time Offer! | UPI Available</p>
      </div>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            {/* Hero Content */}
            <div className="hero-content">
              <div className="hero-badge">✨ India's #1 Herbal Brand</div>
              <h1 className="hero-title">
                <span className="block">Natural Wellness,</span>
                <span className="highlight">Rooted in Tradition</span>
              </h1>
              <p className="hero-subtitle">
                Premium herbal supplements crafted from ancient Ayurvedic wisdom, 
                backed by modern science for your complete wellness journey.
              </p>
              <div className="hero-buttons">
                <button
                  className="btn-primary"
                  onClick={() => window.location.href = '/products'}
                >
                  Shop Now <ArrowRight />
                </button>
                <button className="btn-secondary"
                onClick={() => window.location.href = '/about'}>
                  Learn Our Story
                </button>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <span className="hero-stat-number">50K+</span>
                  <span className="hero-stat-label">Happy Customers</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-number">4.8★</span>
                  <span className="hero-stat-label">Average Rating</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-number">100%</span>
                  <span className="hero-stat-label">Natural</span>
                </div>
              </div>
            </div>
            <div className="hero-video-container">
              <div className="hero-video-wrapper">
                <video
                  className="hero-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={GCMTLogo}
                >
                  <source src={GCMTVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="floating-element">
                <Star fill="currentColor" />
              </div>
              <div className="floating-element">
                <Leaf />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="features-bar">
        <div className="container">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                {feature.icon}
                <span className="feature-text">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="products-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Our Latest <span className="text-gradient">Products</span>
            </h2>
            <p className="section-subtitle">
              Discover our premium collection of herbal wellness products, crafted with the finest natural ingredients
            </p>
            <div className="section-divider" />
          </div>
          
          <div className="products-grid">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner" />
                <p>Loading our amazing products...</p>
              </div>
            ) : loadError ? <p role="alert">Featured products could not be loaded. Refresh to try again.</p> : (
              products.map((product) => (
                <ProductCard key={product.id} productId={product.id} catalogProduct={product} hideAddToCart />
              ))
            )}
          </div>
          
          <div className="text-center">
            <button className="btn-primary"
                  onClick={() => window.location.href = '/products'}
>
              View All Products <ArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-grid">
            <div className="benefits-image-container">
              <img 
                src={GCMTLogo}
                alt="GCMT Herbal Products" 
                className="benefits-image"
              />
              <div className="benefits-badge">
                <span className="benefits-badge-number">100%</span>
                <span className="benefits-badge-text">Natural</span>
              </div>
            </div>
            
            <div className="benefits-content">
              <h2 className="benefits-title">
                The GCMT <span className="text-gradient">Herbal</span> Difference
              </h2>
              <p className="benefits-subtitle">
                Experience the perfect blend of ancient wisdom and modern innovation
              </p>
              
              <div className="benefits-list">
                {benefits.map((benefit, index) => (
                  <div key={index} className="benefit-item">
                    <div className="benefit-icon">{benefit.icon}</div>
                    <div className="benefit-text">
                      <h3>{benefit.title}</h3>
                      <p>{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="btn-primary">
                Learn More About Our Process
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Customer <span className="text-gradient">Experiences</span>
            </h2>
            <p className="section-subtitle">What our happy customers say about us</p>
          </div>
          
          <div className="testimonial-carousel-container">
            <div className="testimonial-carousel">
              <div 
                className="testimonial-slides"
                style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="testimonial-slide">
                    <div className="testimonial-card">
                      <div className="testimonial-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} fill="#FFD700" color="#FFD700" />
                        ))}
                      </div>
                      <blockquote className="testimonial-quote">
                        "{testimonial.quote}"
                      </blockquote>
                      <div className="testimonial-author">{testimonial.author}</div>
                      <div className="testimonial-location">{testimonial.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="testimonial-controls">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`testimonial-dot ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="instagram-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Follow Our <span className="text-gradient">Journey</span>
            </h2>
            <a 
              href="https://www.instagram.com/gcmt.shop.official/?utm_source=ig_web_button_share_sheet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="instagram-link"
            >
              @gcmt.shop.official <Instagram />
            </a>
          </div>
          
          <div className="instagram-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="instagram-post">
                <img 
                  src={GCMTLogo} // Replace with actual Instagram post image
                  alt={`Instagram post ${i+1}`} 
                />
                <div className="instagram-overlay">
                  <Instagram />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="video-modal">
          <div className="video-modal-content">
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="video-modal-close"
            >
              <X />
            </button>
            <video
              controls
              autoPlay
            >
              <source src={GCMTVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
