import React, { useEffect, useState, useRef } from 'react';
import { Search, ShoppingCart, Star, Leaf, Shield, Truck, Award, ChevronRight, Play, Heart, Users, CheckCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { supabase } from '../supabaseClient';
import marketingVideo from "../assets/marketing-video.mp4";
import GCMTLogo from '../assets/GCMT-logo.webp';
import '../styles/ProductListingPage.css';

export default function Homepage() {
  const [products, setProducts] = useState([]);
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim().toLowerCase();
  const featuredProducts = products.filter(p => (p.product_name || '').toLowerCase().includes(query));
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const heroRef = useRef(null);
  const [isInView, setIsInView] = useState({});

  const testimonials = [
    {
      name: "Priya Sharma",
      location: "Mumbai, Maharashtra",
      text: "The GCMT charcoal toothpaste has completely transformed my oral hygiene routine. My teeth feel cleaner and look whiter!",
      rating: 5,
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150"
    },
    {
      name: "Rajesh Kumar",
      location: "Delhi, NCR",
      text: "Amazing natural products! The herbal face wash is gentle yet effective. My skin has never felt better.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
    },
    {
      name: "Anitha Reddy",
      location: "Bangalore, Karnataka",
      text: "Love the hair oil! It's made from authentic herbal ingredients and really strengthens my hair.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
    }
  ];

  const benefits = [
    {
      icon: <Leaf className="w-12 h-12 text-green-600" />,
      title: "100% Natural",
      description: "Made with pure herbal ingredients, no harmful chemicals"
    },
    {
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      title: "Clinically Tested",
      description: "All products are dermatologically tested and approved"
    },
    {
      icon: <Truck className="w-12 h-12 text-purple-600" />,
      title: "Pan-India Delivery",
      description: "Free shipping across India on orders above ₹500"
    },
    {
      icon: <Award className="w-12 h-12 text-yellow-600" />,
      title: "Quality Assured",
      description: "Premium quality with 100% satisfaction guarantee"
    }
  ];

  useEffect(() => {
    let active = true;
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        if (active) setProducts(data || []);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchProducts();

    // Testimonial rotation
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView((prev) => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollToProducts = () => {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section ref={heroRef} className="hero-section">
        <div className="hero-overlay"></div>
        
        {/* Floating Elements */}
        <div className="floating-element floating-element-1"></div>
        <div className="floating-element floating-element-2"></div>
        <div className="floating-element floating-element-3"></div>
        
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="animate-fade-in-up">
                <span className="hero-badge">
                  <Leaf />
                  100% Natural & Herbal
                </span>
                <h1 className="hero-title">
                  Premium
                  <span className="hero-title-accent">Herbal Products</span>
                  for Natural Living
                </h1>
                <p className="hero-description">
                  Discover GCMT's revolutionary charcoal toothpaste and premium herbal collection. 
                  100% natural, chemical-free products trusted by thousands across India.
                </p>
              </div>
              
              <div className="hero-buttons animate-fade-in-up delay-300">
                <button 
                  onClick={scrollToProducts}
                  className="btn-primary"
                >
                  Shop Now
                  <ChevronRight />
                </button>
                <a className="btn-secondary" href={marketingVideo}><Play /> Watch Video</a>
              </div>

              <div className="hero-stats animate-fade-in-up delay-500">
                <div className="hero-stat">
                  <div className="hero-stat-number">50K+</div>
                  <div className="hero-stat-label">Happy Customers</div>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat">
                  <div className="hero-stat-number">4.8★</div>
                  <div className="hero-stat-label">Average Rating</div>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat">
                  <div className="hero-stat-number">100%</div>
                  <div className="hero-stat-label">Natural</div>
                </div>
              </div>
            </div>

            <div className="hero-products animate-fade-in-left delay-200">
              <div className="hero-products-grid">
                {featuredProducts.slice(0, 2).map((product, index) => (
                  <ProductCard key={product.id} productId={product.id} catalogProduct={product} />
                ))}
              </div>
              
              {/* Floating third product */}
              {featuredProducts.length > 2 &&
              <div className="floating-product">
                <div className="floating-product-image">
                  <img 
                    src={featuredProducts[2]?.product_image}
                    alt={featuredProducts[2]?.product_name}
                  />
                </div>
                <div className="floating-product-content">
                  <div className="floating-product-label">Top Rated</div>
                  <div className="floating-product-price">₹{featuredProducts[2]?.product_price}</div>
                </div>
              </div>
              }
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-header" data-animate id="benefits-header">
            <h2 className={`benefits-title ${isInView['benefits-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Why Choose GCMT Products?
            </h2>
            <p className={`benefits-subtitle ${isInView['benefits-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Experience the power of nature with our carefully crafted herbal products
            </p>
          </div>
          
          <div className="benefits-grid">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                data-animate 
                id={`benefit-${index}`}
                className={`benefit-card ${isInView[`benefit-${index}`] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="benefit-icon">
                  {benefit.icon}
                </div>
                <h3 className="benefit-title">{benefit.title}</h3>
                <p className="benefit-description">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="products" className="products-section">
        <div className="container">
          <div className="products-header" data-animate id="products-header">
            <h2 className={`products-title ${isInView['products-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {query ? 'Product search results' : 'Our Bestselling Products'}
            </h2>
            <p className={`products-subtitle ${isInView['products-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Discover our most loved herbal products trusted by thousands
            </p>
          </div>

          {loading && <p role="status">Loading products…</p>}
          {loadError && <p role="alert">The catalog could not be loaded. Refresh to try again.</p>}
          {!loading && !loadError && !featuredProducts.length && <p>No products found.</p>}
          <div className="products-grid">
            {featuredProducts.map((product, index) => (
              <ProductCard key={product.id} productId={product.id} catalogProduct={product} />
            ))}
          </div>
          
          {query && <Link className="btn-outline" to="/products#products">View all products</Link>}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="container">
          <div className="testimonials-header" data-animate id="testimonials-header">
            <h2 className={`testimonials-title ${isInView['testimonials-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              What Our Customers Say
            </h2>
            <p className={`testimonials-subtitle ${isInView['testimonials-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Join thousands of satisfied customers who love our products
            </p>
          </div>

          <div className="testimonials-container">
            <div className="testimonial-card">
              <div className="testimonial-avatar">
                <img 
                  src={GCMTLogo} 
                  alt={testimonials[currentTestimonial].name}
                />
              </div>
              
              <div className="testimonial-rating">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} />
                ))}
              </div>
              
              <blockquote className="testimonial-quote">
                "{testimonials[currentTestimonial].text}"
              </blockquote>
              
              <div>
                <div className="testimonial-author">
                  {testimonials[currentTestimonial].name}
                </div>
                <div className="testimonial-location">{testimonials[currentTestimonial].location}</div>
              </div>
            </div>
            
            <div className="testimonial-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`testimonial-dot ${
                    index === currentTestimonial ? 'active' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="container cta-container" data-animate id="cta">
          <h2 className={`cta-title ${isInView['cta'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Ready to Experience Natural Living?
          </h2>
          <p className={`cta-description ${isInView['cta'] ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Join thousands of satisfied customers and discover the power of herbal products
          </p>
          <div className={`cta-buttons ${isInView['cta'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button className="btn-white"
              onClick={scrollToProducts}>
              <ShoppingCart />
              Start Shopping
            </button>
            <button className="btn-outline-white"
              onClick={() => window.location.href = '/about'}>
              <Users />
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
