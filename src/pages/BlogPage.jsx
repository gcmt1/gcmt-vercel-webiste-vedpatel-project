import React, { useState } from "react";
import "../styles/BlogPage.css"; // Import your new CSS file
import NewsletterForm from "../components/NewsletterForm";
import logo from "../assets/GCMT-logo.webp"; // Import logo image

const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const blogPosts = [
    {
      id: 1,
      title: "Turmeric: The Golden Spice of Ayurveda and Its Modern Health Applications",
      excerpt: "Explore the ancient wisdom and contemporary research behind turmeric's powerful anti-inflammatory and antioxidant properties in modern wellness.",
      date: "May 15, 2025",
      category: "Herbal Education",
      imageUrl: logo,
      readTime: "8 min read",
      author: "Dr. Priya Sharma"
    },
    {
      id: 2,
      title: "Understanding Doshas: A Complete Guide to Ayurvedic Body Types",
      excerpt: "Learn how to identify your unique Ayurvedic constitution and customize your health routine according to Vata, Pitta, and Kapha principles.",
      date: "May 12, 2025",
      category: "Ayurvedic Principles",
      imageUrl: logo,
      readTime: "12 min read",
      author: "Vaidya Rajesh Kumar"
    },
    {
      id: 3,
      title: "Ashwagandha for Stress Management: Clinical Studies and Traditional Use",
      excerpt: "Discover how this adaptogenic herb helps combat modern stress while supporting overall vitality and mental clarity.",
      date: "May 8, 2025",
      category: "Herbal Education",
      imageUrl: logo,
      readTime: "10 min read",
      author: "Dr. Anita Patel"
    },
    {
      id: 4,
      title: "Seasonal Detox: Ayurvedic Cleansing Practices for Spring Renewal",
      excerpt: "Learn traditional Panchakarma-inspired methods to cleanse and rejuvenate your body naturally as seasons change.",
      date: "May 5, 2025",
      category: "Wellness Practices",
      imageUrl: logo,
      readTime: "15 min read",
      author: "Vaidya Rajesh Kumar"
    },
    {
      id: 5,
      title: "Quality Standards in Herbal Manufacturing: What to Look For",
      excerpt: "Understanding GMP standards, organic certifications, and third-party testing in the herbal supplement industry.",
      date: "May 1, 2025",
      category: "Industry Insights",
      imageUrl: logo,
      readTime: "7 min read",
      author: "Dr. Priya Sharma"
    },
    {
      id: 6,
      title: "Triphala: The Three-Fruit Formula for Digestive Wellness",
      excerpt: "Explore the synergistic benefits of Amalaki, Bibhitaki, and Haritaki in this time-tested Ayurvedic formulation.",
      date: "April 28, 2025",
      category: "Herbal Education",
      imageUrl: logo,
      readTime: "9 min read",
      author: "Dr. Anita Patel"
    }
  ];

  const categories = ["All", "Herbal Education", "Ayurvedic Principles", "Wellness Practices", "Industry Insights"];

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="blog-container">
      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      
      {/* Header Section */}
      <header className="blog-header">
        <div className="blog-header-content">
          <h1 className="blog-title">Herbal Wisdom & Wellness Insights</h1>
          <p className="blog-subtitle">
            Discover the science behind traditional Ayurvedic practices and learn how ancient herbal wisdom 
            can enhance your modern lifestyle with evidence-based insights from our expert practitioners.
          </p>
        </div>
      </header>

      <main id="main-content" className="blog-main">
        {/* Category Filters */}
        <section className="category-filters" role="tablist" aria-label="Article categories">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`category-btn ${activeCategory === category ? 'active' : ''}`}
              role="tab"
              aria-selected={activeCategory === category}
              aria-controls="posts-grid"
            >
              {category}
            </button>
          ))}
        </section>

        {/* Search Bar */}
        <section className="search-container">
          <div style={{ position: 'relative' }}>
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search articles, herbs, or topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label="Search articles"
            />

          </div>
        </section>

        {/* Featured Article */}
        <article className="featured-article">
          <div className="featured-content">
            <div>
              <img 
                src={logo} 
                alt="Featured: Neem Research" 
                className="featured-image"
              />
            </div>
            <div className="featured-text">
              <div className="featured-badge">
                <span className="featured-tag">Featured Research</span>
                <span className="featured-label">Latest Study</span>
              </div>
              <h2 className="featured-title">
                Breakthrough Research: Neem's Antimicrobial Properties in Modern Healthcare
              </h2>
              <p className="featured-excerpt">
                New clinical studies reveal how traditional neem extracts show promising results against 
                antibiotic-resistant bacteria, bridging ancient Ayurvedic knowledge with cutting-edge medical research.
              </p>
              <div className="featured-meta">
                <span>May 18, 2025</span>
                <span>•</span>
                <span>12 min read</span>
                <span>•</span>
                <span>Dr. Rajesh Mehta, PhD</span>
              </div>

            </div>
          </div>
        </article>

        {/* Blog Posts Grid */}
        <section id="posts-grid" className="posts-grid" role="tabpanel" aria-labelledby={`tab-${activeCategory}`}>
          {filteredPosts.map((post) => (
            <article key={post.id} className="post-card">
              <div className="post-image-container">
                <img 
                  src={post.imageUrl} 
                  alt={post.title}
                  className="post-image"
                />
                <div className="post-category-tag">
                  {post.category}
                </div>
              </div>
              <div className="post-content">
                <h3 className="post-title">
                  {post.title}
                </h3>
                <p className="post-excerpt">
                  {post.excerpt}
                </p>
                <div className="post-meta">
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
                <div className="post-footer">
                  <span className="post-author">{post.author}</span>

                </div>
              </div>
            </article>
          ))}
        </section>

        {/* No Results Message */}
        {filteredPosts.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">🌿</div>
            <h3 className="no-results-title">No articles found</h3>
            <p className="no-results-text">Try adjusting your search or category filter</p>
          </div>
        )}

        {/* Newsletter Subscription */}
        <section className="newsletter">
          <div className="newsletter-content">
            <h2 className="newsletter-title">Stay Connected with Herbal Wisdom</h2>
            <p className="newsletter-text">
              Subscribe to receive expert insights, seasonal wellness tips, and exclusive research updates 
              directly from our Ayurvedic practitioners and herbalists.
            </p>
            <NewsletterForm className="newsletter-form" inputClass="newsletter-input" buttonClass="newsletter-btn" buttonText="Subscribe Now" />
            <p className="newsletter-disclaimer">
              Join 50,000+ wellness enthusiasts. Unsubscribe anytime.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BlogPage;