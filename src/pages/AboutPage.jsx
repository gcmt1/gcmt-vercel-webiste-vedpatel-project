import React from 'react';
import { Mail, Phone, MapPin, Award, Users, Shield } from 'lucide-react';
import Photo from "../assets/GCMT-logo.webp";
import arya from "../assets/ARYA PATEL GCMT.jpg";
import { Helmet } from 'react-helmet-async';
import "../styles/AboutPage.css";

export default function AboutPage() {
  return (
    <>
<Helmet>
  <title>About GCMT Shop | Herbal & Natural Products</title>
  <meta name="description" content="Learn about GCMT Shop, our mission to provide herbal and natural products in India, including our popular herbal charcoal toothpaste." />
  <meta property="og:title" content="About GCMT Shop" />
  <meta property="og:description" content="Learn about GCMT Shop and our mission to provide 100% natural products." />
  <meta property="og:url" content="https://gcmtshop.com/about" />
  <link rel="canonical" href="https://gcmtshop.com/about" />
</Helmet>
    <div className="aboutus-page bg-white min-h-screen">
      {/* Hero Section */}
      <section className="aboutus-hero bg-gray-50 py-20">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-hero-content flex flex-col items-center text-center">
            <h1 className="aboutus-title text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              About Our Company
            </h1>
            <p className="aboutus-subtitle text-xl text-gray-600 max-w-3xl mb-10">
Gold Coin Multi-Trade Private Limited is a trusted name in natural wellness, offering a specialized range of herbal and ayurvedic dental care products. Proudly rooted in India’s ancient healing traditions, we are dedicated to delivering safe, effective, and nature-powered solutions for oral hygiene and well-being.
            </p>
            <div className="aboutus-divider w-24 h-1 bg-blue-600 rounded" />
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="aboutus-story py-16 md:py-24">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-story-grid grid md:grid-cols-2 gap-12 items-center">
            <div className="aboutus-story-image bg-gray-100 rounded-lg overflow-hidden h-96">
              <img
                src={Photo}
                alt="Our company story"
                className="aboutus-story-img w-full h-full object-cover"
              />
            </div>
            <div className="aboutus-story-text">
              <h2 className="aboutus-story-title text-3xl font-bold text-gray-900 mb-6">
                Our Story
              </h2>
              <p className="aboutus-story-paragraph text-gray-600 mb-6">
Since 2012, we have earned the trust of thousands of customers across India by upholding the highest standards of purity, quality, and customer satisfaction. Our products are thoughtfully formulated using time-tested Ayurvedic ingredients, carefully blended to provide visible results—naturally and gently.              </p>
              <p className="aboutus-story-paragraph text-gray-600 mb-6">
From day one, our mission has been simple yet powerful: to combine authentic Ayurvedic wisdom with modern convenience, helping people lead healthier lives through trusted, plant-based alternatives.              </p>
              <p className="aboutus-story-paragraph text-gray-600">
With over a decade of presence in the market, Gold Coin Multi-Trade Private Limited continues to grow as a preferred choice for those seeking honest, effective, and holistic dental care.

Experience the power of Ayurveda. Trusted since 2012.              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="aboutus-values bg-gray-50 py-16 md:py-24">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-values-header text-center mb-16">
            <h2 className="aboutus-values-title text-3xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="aboutus-values-subtitle text-xl text-gray-600 max-w-3xl mx-auto">
              These principles guide our decisions and shape our company culture.
            </p>
          </div>
          <div className="aboutus-values-grid grid md:grid-cols-3 gap-8">
            {[
              { Icon: Award, title: 'Quality Excellence', text: 'We never compromise on quality...' },
              { Icon: Users, title: 'Customer Focus', text: 'Our customers are at the heart of everything we do...' },
              { Icon: Shield, title: 'Integrity', text: 'We conduct business with honesty and transparency...' },
            ].map(({ Icon, title, text }) => (
              <div key={title} className="aboutus-value-card bg-white p-8 rounded-lg shadow-md">
                <div className="aboutus-value-icon text-blue-600 mb-4">
                  <Icon size={36} />
                </div>
                <h3 className="aboutus-value-title text-xl font-bold text-gray-900 mb-3">
                  {title}
                </h3>
                <p className="aboutus-value-text text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="aboutus-team py-16 md:py-24">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-team-header text-center mb-16">
            <h2 className="aboutus-team-title text-3xl font-bold text-gray-900 mb-4">
              Our Leadership Team
            </h2>
            <p className="aboutus-team-subtitle text-xl text-gray-600 max-w-3xl mx-auto">
              Meet the experts who drive our vision and innovation.
            </p>
          </div>
          <div className="aboutus-team-grid grid md:grid-cols-3 gap-8">
            {[
              { name: 'Arya Patel', role: 'Product Promoter' }
            ].map(({ name, role }) => (
              <div key={name} className="aboutus-team-member text-center">
                <div className="aboutus-team-photo w-48 h-48 rounded-full overflow-hidden mx-auto mb-6">
                  <img src={arya} alt={name} className="w-full h-full object-cover" />
                </div>
                <h3 className="aboutus-team-name text-xl font-bold text-gray-900 mb-1">
                  {name}
                </h3>
                <p className="aboutus-team-role text-blue-600 mb-4">{role}</p>
                <p className="aboutus-team-bio text-gray-600">
                  Arya is the driving force behind our innovative product promotive solutions, ensuring we stay ahead of the curve.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="aboutus-stats bg-blue-600 text-white py-16">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-stats-grid grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              ['10+', 'Years in Business'],
              ['50K+', 'Happy Customers'],
              ['14+', 'Products Offered'],
              ['100%', 'Made in India'],
            ].map(([stat, label]) => (
              <div key={label} className="aboutus-stat text-center">
                <p className="aboutus-stat-number text-4xl font-bold mb-2">{stat}</p>
                <p className="aboutus-stat-label text-lg">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="aboutus-contact py-16 md:py-24">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-contact-header text-center mb-16">
            <h2 className="aboutus-contact-title text-3xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="aboutus-contact-subtitle text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions or want to learn more? We’d love to hear from you.
            </p>
          </div>
          <div className="aboutus-contact-grid grid md:grid-cols-3 gap-8">
            {[
              { Icon: Mail, title: 'Email Us', lines: ['gcmtshop@gmail.com'] },
              { Icon: Phone, title: 'Call Us', lines: ['+91 7623818818', 'Mon–Fri: 10AM–6PM IST'] },
              { Icon: MapPin, title: 'Visit Us', lines: ['213, Pratik Mall, Kudasan, Gandhinagar, Gujarat, India'] },
            ].map(({ Icon, title, lines }) => (
              <div key={title} className="aboutus-contact-card bg-gray-50 p-8 rounded-lg text-center">
                <div className="aboutus-contact-icon text-blue-600 mx-auto mb-4"><Icon size={36} /></div>
                <h3 className="aboutus-contact-method text-xl font-bold text-gray-900 mb-3">{title}</h3>
                {lines.map(line => (
                  <p key={line} className="aboutus-contact-line text-gray-600">{line}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="aboutus-testimonials bg-gray-50 py-16 md:py-24">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-testimonials-header text-center mb-16">
            <h2 className="aboutus-testimonials-title text-3xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="aboutus-testimonials-subtitle text-xl text-gray-600 max-w-3xl mx-auto">
              Don’t just take our word for it—here’s what our customers have to say.
            </p>
          </div>
          <div className="aboutus-testimonials-grid grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "The quality of their products is outstanding...",
                name: "Suresh Chauhan",
                role: "Customer",
              },
              {
                quote: "Their customer service is exceptional...",
                name: "Pooja Mehta",
                role: "Customer",
              },
              {
                quote: "I appreciate their commitment to quality...",
                name: "Ramesh Patel",
                role: "Customer",
              },
            ].map(({ quote, name, role }) => (
              <div key={name} className="aboutus-testimonial bg-white p-8 rounded-lg shadow-md">
                <div className="aboutus-testimonial-stars flex items-center text-yellow-400 mb-4">
                  <span>★★★★★</span>
                </div>
                <p className="aboutus-testimonial-quote text-gray-600 mb-6 italic">{quote}</p>
                <div className="aboutus-testimonial-author flex items-center">
                  <div className="aboutus-testimonial-photo w-12 h-12 rounded-full overflow-hidden mr-4">
                    <img src={Photo} alt={name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="aboutus-testimonial-name font-bold text-gray-900">{name}</p>
                    <p className="aboutus-testimonial-role text-gray-600 text-sm">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="aboutus-cta py-16 md:py-24">
        <div className="aboutus-container container mx-auto px-4 md:px-6">
          <div className="aboutus-cta-box bg-blue-600 text-white rounded-lg p-8 md:p-12 text-center">
            <h2 className="aboutus-cta-title text-3xl font-bold mb-4">
              Ready to Experience Our Products?
            </h2>
            <p className="aboutus-cta-text text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers and discover the difference quality makes.
            </p>
            <a
              className="aboutus-cta-button bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition duration-300 inline-block"
              href="/products"
            >
              Shop Now
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
//test