import { Page, Button } from "../components/ui";
import s from "../styles/editorial.module.css";
import photo from "../assets/ARYA PATEL GCMT.jpg";
export default function About() {
  return (
    <Page>
      <div className={s.aboutSpread}>
        <header className={s.introduction}>
          <h1>About GCMT Herbal</h1>
          <p>
            Gold Coin Multi-Trade Private Limited offers herbal dental care
            products from Gandhinagar, Gujarat. The company was founded in 2012.
          </p>
        </header>
        <figure className={s.portrait}>
          <img src={photo} alt="Arya Patel, GCMT" loading="lazy" />
          <figcaption>Arya Patel · Product Promoter</figcaption>
        </figure>
        <section className={s.story}>
          <h2>Our story</h2>
          <p>
            GCMT brings traditional Ayurvedic ingredients into everyday dental
            care. Its approach combines plant-based formulations with the
            convenience of a product customers can use at home.
          </p>
        </section>
      </div>
      <section className={s.values}>
        <h2>Company values</h2>
        <p>
          GCMT’s stated values are product quality, attention to its
          customers, and honesty and transparency in its business.
        </p>
      </section>
      <div className={s.aboutActions}>
        <Button to="/products">Shop products</Button>
        <Button secondary to="/contact">Contact GCMT</Button>
      </div>
    </Page>
  );
}
