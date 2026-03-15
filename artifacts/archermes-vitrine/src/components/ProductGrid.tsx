import { NFTProduct, ProductCard } from "./ProductCard";

const MOCK_NFTS: NFTProduct[] = [
  { id: 1, name: "Void Walker #001", collection: "Genesis", price: "2.50", image: "nft-1.png" },
  { id: 2, name: "Neon Sphere #042", collection: "Core Engine", price: "1.85", image: "nft-2.png" },
  { id: 3, name: "Holo Shard #007", collection: "Relics", price: "4.20", image: "nft-3.png" },
  { id: 4, name: "Fluid State #099", collection: "Genesis", price: "0.95", image: "nft-4.png" },
  { id: 5, name: "Portal Ring #012", collection: "Gates", price: "5.50", image: "nft-5.png" },
  { id: 6, name: "Glass Matrix #033", collection: "Core Engine", price: "1.20", image: "nft-6.png" },
  { id: 7, name: "Fractal Core #088", collection: "Relics", price: "3.15", image: "nft-7.png" },
  { id: 8, name: "Wire Void #101", collection: "Gates", price: "0.55", image: "nft-8.png" },
];

export function ProductGrid() {
  return (
    <section id="marketplace" className="py-24 relative z-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-glow">
              TRENDING ARTIFACTS
            </h2>
            <p className="text-muted-foreground font-sans max-w-xl">
              Explore the most sought-after digital assets currently trending across the Archermes network.
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['All', 'Genesis', 'Relics', 'Core Engine'].map((filter, i) => (
              <button 
                key={filter}
                className={`px-4 py-2 rounded-full text-sm font-display whitespace-nowrap transition-colors ${
                  i === 0 
                    ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_10px_hsl(var(--primary)/0.3)]' 
                    : 'glass-panel text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
          {MOCK_NFTS.map((nft, index) => (
            <ProductCard key={nft.id} product={nft} index={index} />
          ))}
        </div>
        
        <div className="mt-16 flex justify-center">
          <button className="px-8 py-3 rounded-lg border border-white/10 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all font-display tracking-widest uppercase text-sm">
            View All Collections
          </button>
        </div>
      </div>
    </section>
  );
}
