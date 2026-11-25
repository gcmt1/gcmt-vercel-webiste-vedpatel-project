import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { sections } from "../admin/AdminShell";
import s from "../admin/admin.module.css";
import c from "../components/commerce.module.css";
export default function Dashboard() {
  return (
    <div className={c.stack}>
      <h1>Operations overview</h1>
      <div className={s.home}>
        {sections.slice(1).map(([url, name, Icon]) => (
          <Link className={s.tile} key={url} to={url}>
            <Icon />
            {name}
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
    </div>
  );
}
