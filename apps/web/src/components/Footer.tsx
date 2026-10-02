import { shop } from "@/data/mock";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span>
          © {new Date().getFullYear()} {shop.name}
        </span>
        <span>{shop.address}</span>
      </div>
    </footer>
  );
}
