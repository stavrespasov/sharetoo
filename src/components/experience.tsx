export default function Experience({ brand }: { brand: string; hosted: boolean }) {
  return <main className="shell section"><img className="wordmark" src="/demo/wordmark.webp" alt={brand} /><h1>Car rental in Ljubljana.</h1></main>;
}
