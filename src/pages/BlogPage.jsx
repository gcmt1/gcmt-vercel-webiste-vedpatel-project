import React, { useState } from "react";
import { Page, Field } from "../components/ui";
import s from "../styles/editorial.module.css";
export default function Blog() {
  const [q, search] = useState("");
  const blogPosts = [
    {
      id: 1,
      title:
        "Turmeric: The Golden Spice of Ayurveda and Its Modern Health Applications",
      excerpt:
        "Explore the ancient wisdom and contemporary research behind turmeric's powerful anti-inflammatory and antioxidant properties in modern wellness.",
      date: "May 15, 2025",
      category: "Herbal Education",
    },
    {
      id: 2,
      title: "Understanding Doshas: A Complete Guide to Ayurvedic Body Types",
      excerpt:
        "Learn how to identify your unique Ayurvedic constitution and customize your health routine according to Vata, Pitta, and Kapha principles.",
      date: "May 12, 2025",
      category: "Ayurvedic Principles",
    },
    {
      id: 3,
      title:
        "Ashwagandha for Stress Management: Clinical Studies and Traditional Use",
      excerpt:
        "Discover how this adaptogenic herb helps combat modern stress while supporting overall vitality and mental clarity.",
      date: "May 8, 2025",
      category: "Herbal Education",
    },
    {
      id: 4,
      title: "Seasonal Detox: Ayurvedic Cleansing Practices for Spring Renewal",
      excerpt:
        "Learn traditional Panchakarma-inspired methods to cleanse and rejuvenate your body naturally as seasons change.",
      date: "May 5, 2025",
      category: "Wellness Practices",
    },
    {
      id: 5,
      title: "Quality Standards in Herbal Manufacturing: What to Look For",
      excerpt:
        "Understanding GMP standards, organic certifications, and third-party testing in the herbal supplement industry.",
      date: "May 1, 2025",
      category: "Industry Insights",
    },
    {
      id: 6,
      title: "Triphala: The Three-Fruit Formula for Digestive Wellness",
      excerpt:
        "Explore the synergistic benefits of Amalaki, Bibhitaki, and Haritaki in this time-tested Ayurvedic formulation.",
      date: "April 28, 2025",
      category: "Herbal Education",
    },
  ];
  const list = blogPosts.filter((p) =>
    (p.title + " " + p.category).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Page>
      <div className={s.journal}>
        <header className={s.journalHead}>
          <h1>Journal</h1>
          <Field
            label="Search article summaries"
            type="search"
            value={q}
            onChange={(e) => search(e.target.value)}
          />
        </header>
        {list.map((p) => (
          <article key={p.id} className={s.entry}>
            <p className={s.meta}>
              {p.category} · {p.date}
            </p>
            <h2>{p.title}</h2>
            <p>{p.excerpt}</p>
          </article>
        ))}
        {!list.length && <p>No matching articles.</p>}
      </div>
    </Page>
  );
}
